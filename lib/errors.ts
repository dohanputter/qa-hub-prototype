/**
 * Application Error Hierarchy
 * 
 * Provides structured error handling for the QA Hub application.
 * Use these classes to distinguish between different error types
 * and enable appropriate UI responses (toast vs. error boundary).
 */

/**
 * Base error class for all application errors.
 * Extends native Error with additional metadata.
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly isRetryable: boolean = false,
        public readonly statusCode: number = 500
    ) {
        super(message);
        this.name = 'AppError';
        // Maintains proper stack trace in V8 environments
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Validation errors - user input or data format issues.
 * UI Response: Show inline error or toast, don't crash.
 */
export class ValidationError extends AppError {
    constructor(message: string, code: string = 'VALIDATION_ERROR') {
        super(message, code, false, 400);
        this.name = 'ValidationError';
    }
}

/**
 * Authentication/Authorization errors.
 * UI Response: Redirect to login or show access denied.
 */
export class AuthError extends AppError {
    constructor(message: string = 'Unauthorized', code: string = 'AUTH_ERROR') {
        super(message, code, false, 401);
        this.name = 'AuthError';
    }
}

/**
 * Resource not found errors.
 * UI Response: Show 404-style message or redirect.
 */
export class NotFoundError extends AppError {
    constructor(message: string, code: string = 'NOT_FOUND') {
        super(message, code, false, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * System/database errors - internal failures.
 * UI Response: Show error boundary, log for debugging.
 */
export class SystemError extends AppError {
    constructor(message: string, code: string = 'SYSTEM_ERROR') {
        super(message, code, true, 500);
        this.name = 'SystemError';
    }
}

/**
 * External service errors - GitLab API, etc.
 * UI Response: Show toast with retry option.
 */
export class ExternalServiceError extends AppError {
    constructor(
        message: string,
        public readonly service: string = 'external',
        code: string = 'EXTERNAL_SERVICE_ERROR'
    ) {
        super(message, code, true, 502);
        this.name = 'ExternalServiceError';
    }
}

/**
 * Rate limiting errors.
 * UI Response: Show toast with wait time.
 */
export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests. Please wait.') {
        super(message, 'RATE_LIMIT', true, 429);
        this.name = 'RateLimitError';
    }
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Maps a generic Error message to a structured AppError.
 * Used by safeAction to intercept server action errors.
 */
export function mapErrorToAppError(error: unknown): AppError {
    if (isAppError(error)) {
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    // Auth errors
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('not authenticated')) {
        return new AuthError(message);
    }

    // Not found errors
    if (lowerMessage.includes('not found')) {
        return new NotFoundError(message);
    }

    // Validation errors
    if (
        lowerMessage.includes('required') ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('must be') ||
        lowerMessage.includes('too large') ||
        lowerMessage.includes('too many uploads')
    ) {
        return new ValidationError(message);
    }

    // External service errors (GitLab)
    if (
        lowerMessage.includes('gitlab') ||
        lowerMessage.includes('failed to fetch') ||
        lowerMessage.includes('failed to update')
    ) {
        return new ExternalServiceError(message, 'GitLab');
    }

    // Rate limit errors
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('please wait')) {
        return new RateLimitError(message);
    }

    // Default: treat as system error
    return new SystemError(message);
}

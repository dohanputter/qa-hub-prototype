'use client';

/**
 * Safe Action Wrapper
 * 
 * Wraps server action calls to provide structured error handling.
 * Catches generic Error objects from server actions and maps them
 * to typed AppError classes for consistent client-side handling.
 */

import {
    AppError,
    ValidationError,
    AuthError,
    NotFoundError,
    SystemError,
    ExternalServiceError,
    RateLimitError,
    mapErrorToAppError,
    isAppError
} from './errors';

/**
 * Result type for safe action calls.
 * Either returns data on success or an AppError on failure.
 */
export type SafeActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: AppError };

/**
 * Wraps a server action call with structured error handling.
 * 
 * @example
 * ```tsx
 * const result = await safeAction(() => createIssue(projectId, data));
 * if (result.success) {
 *   toast({ title: 'Issue created' });
 *   router.push(`/${projectId}/qa/${result.data.iid}`);
 * } else {
 *   if (result.error instanceof ValidationError) {
 *     toast({ title: 'Validation Error', description: result.error.message, variant: 'destructive' });
 *   } else if (result.error instanceof AuthError) {
 *     router.push('/login');
 *   } else {
 *     toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
 *   }
 * }
 * ```
 */
export async function safeAction<T>(
    action: () => Promise<T>
): Promise<SafeActionResult<T>> {
    try {
        const data = await action();
        return { success: true, data };
    } catch (error) {
        const appError = mapErrorToAppError(error);
        return { success: false, error: appError };
    }
}

/**
 * Helper to get a user-friendly error message based on error type.
 */
export function getErrorMessage(error: AppError): string {
    return error.message;
}

/**
 * Helper to determine if error should trigger a retry UI.
 */
export function shouldShowRetry(error: AppError): boolean {
    return error.isRetryable;
}

/**
 * Helper to get the appropriate toast variant for an error.
 */
export function getToastVariant(error: AppError): 'default' | 'destructive' {
    if (error instanceof ValidationError || error instanceof RateLimitError) {
        return 'destructive';
    }
    return 'destructive';
}

// Re-export error classes for convenience
export {
    AppError,
    ValidationError,
    AuthError,
    NotFoundError,
    SystemError,
    ExternalServiceError,
    RateLimitError,
    isAppError
};

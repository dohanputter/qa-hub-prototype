/**
 * Centralized mode utilities for consistent mock/production mode checks
 */

/**
 * Check if the application is running in mock mode
 */
export const isMockMode = (): boolean => process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

/**
 * Check if the application is running in production
 */
export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Check if the application is running in development
 */
export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';

/**
 * Execute different functions based on mock/production mode
 * Useful for server actions that have different implementations
 */
export async function withMode<T>(
    mockFn: () => Promise<T>,
    prodFn: () => Promise<T>
): Promise<T> {
    return isMockMode() ? mockFn() : prodFn();
}

/**
 * Get a mock token for API calls in mock mode
 */
export const getMockToken = (): string => 'mock-token';

/**
 * Get a valid token - either from session or mock token
 */
export const getTokenOrMock = (sessionToken: string | undefined): string => {
    if (isMockMode()) return getMockToken();
    if (!sessionToken) throw new Error('Unauthorized');
    return sessionToken;
};


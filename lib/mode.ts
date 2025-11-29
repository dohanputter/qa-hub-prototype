/**
 * Centralized mode utilities for consistent mock/production mode checks
 */

/**
 * Check if the application is running in mock mode
 */
export const isMockMode = (): boolean => process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

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


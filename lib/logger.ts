import { isMockMode } from './mode';

/**
 * Centralized logger for the QA Hub application
 * 
 * - Suppresses info logs in production
 * - Always shows errors and warnings
 * - Special handling for mock mode logs
 */

type LogLevel = 'info' | 'warn' | 'error' | 'mock';

const shouldLog = (level: LogLevel): boolean => {
    // Always log errors and warnings
    if (level === 'error' || level === 'warn') return true;

    // Mock logs only in mock mode
    if (level === 'mock') return isMockMode();

    // Info logs only in development
    if (level === 'info') return process.env.NODE_ENV !== 'production';

    return false;
};

const formatMessage = (level: LogLevel, message: string): string => {
    const timestamp = new Date().toISOString();
    const prefix = level === 'mock' ? '[MOCK]' : `[${level.toUpperCase()}]`;
    return `${timestamp} ${prefix} ${message}`;
};

export const logger = {
    /**
     * Log informational messages (development only)
     */
    info: (message: string, data?: any) => {
        if (shouldLog('info')) {
            console.log(formatMessage('info', message), data ?? '');
        }
    },

    /**
     * Log warning messages (always shown)
     */
    warn: (message: string, data?: any) => {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', message), data ?? '');
        }
    },

    /**
     * Log error messages (always shown)
     */
    error: (message: string, error?: any) => {
        if (shouldLog('error')) {
            console.error(formatMessage('error', message), error ?? '');
        }
    },

    /**
     * Log mock mode messages (mock mode only)
     */
    mock: (message: string, data?: any) => {
        if (shouldLog('mock')) {
            console.log(formatMessage('mock', message), data ?? '');
        }
    }
};

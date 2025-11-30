// auth.ts (root)
import NextAuth from 'next-auth';
import GitLabProvider from 'next-auth/providers/gitlab';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

export const authOptions = {
    // Only use adapter in Node.js runtime (not Edge)
    adapter: process.env.NEXT_RUNTIME !== 'edge' ? DrizzleAdapter(db) : undefined,
    providers: [
        GitLabProvider({
            clientId: env.GITLAB_CLIENT_ID || 'mock-client-id',
            clientSecret: env.GITLAB_CLIENT_SECRET || 'mock-client-secret',
            authorization: {
                params: {
                    scope: 'read_api read_repository api read_user email',
                },
            },
        }),
        ...(process.env.NODE_ENV !== 'production' && env.NEXT_PUBLIC_MOCK_MODE === 'true'
            ? [CredentialsProvider({
                id: 'mock-login',
                name: 'Mock Login',
                credentials: {},
                async authorize(credentials, req) {
                    return {
                        id: 'mock-user-id',
                        name: 'Mock Tester',
                        email: 'tester@example.com',
                        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                    };
                },
            })]
            : []),
    ],
    callbacks: {
        async jwt({ token, account, user }: { token: any; account: any; user: any }) {
            if (account?.access_token) {
                token.accessToken = account.access_token;
                // Set token expiration (2 hours for production, 1 hour for mock)
                const expiresIn = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' ? 3600 : 7200;
                token.accessTokenExpires = Date.now() + (expiresIn * 1000);
                token.refreshToken = account.refresh_token;
            } else if (user && process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
                token.accessToken = 'mock-access-token-' + Date.now();
                token.sub = user.id;
                // Mock tokens expire in 1 hour
                token.accessTokenExpires = Date.now() + (3600 * 1000);
                token.refreshToken = 'mock-refresh-token-' + Date.now();
            }

            // Check if token needs refresh (within 5 minutes of expiry)
            if (token.accessTokenExpires && Date.now() > token.accessTokenExpires - (5 * 60 * 1000)) {
                // In production, this would refresh the token
                // For mock mode, extend the token
                if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
                    logger.mock('Extending token expiration');
                    token.accessToken = 'mock-access-token-' + Date.now();
                    token.accessTokenExpires = Date.now() + (3600 * 1000);
                } else if (token.refreshToken) {
                    try {
                        logger.info('Refreshing GitLab access token...');
                        const response = await fetch('https://gitlab.com/oauth/token', {
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                client_id: env.GITLAB_CLIENT_ID || '',
                                client_secret: env.GITLAB_CLIENT_SECRET || '',
                                grant_type: 'refresh_token',
                                refresh_token: token.refreshToken as string,
                                redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gitlab`,
                            }),
                            method: 'POST',
                        });

                        const tokens = await response.json();

                        if (!response.ok) throw tokens;

                        return {
                            ...token,
                            accessToken: tokens.access_token,
                            accessTokenExpires: Date.now() + tokens.expires_in * 1000,
                            refreshToken: tokens.refresh_token ?? token.refreshToken, // Fallback to old refresh token
                        };
                    } catch (error) {
                        console.error('Error refreshing access token', error);
                        // The error property will be used in client-side to handle the error
                        return { ...token, error: 'RefreshAccessTokenError' };
                    }
                }
            }

            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            // Check if token is expired
            if (token.accessTokenExpires && Date.now() > token.accessTokenExpires) {
                console.warn('Access token has expired');
                session.error = 'AccessTokenExpired';
                // In production, this would trigger a re-auth flow
                // For now, we'll keep the session but mark it as having an expired token
            }

            session.accessToken = token.accessToken as string;
            session.accessTokenExpires = token.accessTokenExpires;
            if (token.sub) {
                session.user.id = token.sub as string;
            }
            return session;
        },
    },
    pages: { signIn: '/auth/signin', error: '/auth/error' },
    // Explicit const assertion ensures correct literal type for strategy
    session: { strategy: 'jwt' } as const,
} as any;

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions as any);

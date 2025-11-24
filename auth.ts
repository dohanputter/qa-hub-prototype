// auth.ts (root)
import NextAuth from 'next-auth';
import GitLabProvider from 'next-auth/providers/gitlab';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

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
        CredentialsProvider({
            id: 'mock-login',
            name: 'Mock Login',
            credentials: {},
            async authorize(credentials, req) {
                if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
                    return {
                        id: 'mock-user-id',
                        name: 'Mock Tester',
                        email: 'tester@example.com',
                        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                    };
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }: { token: any; account: any; user: any }) {
            if (account?.access_token) {
                token.accessToken = account.access_token;
            } else if (user && process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
                token.accessToken = 'mock-access-token';
                token.sub = user.id;
            }
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            session.accessToken = token.accessToken as string;
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

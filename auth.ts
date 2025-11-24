// auth.ts (root)
import NextAuth from 'next-auth';
import GitLabProvider from 'next-auth/providers/gitlab';
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
    ],
    callbacks: {
        async jwt({ token, account }: { token: any; account: any }) {
            if (account?.access_token) token.accessToken = account.access_token;
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            session.accessToken = token.accessToken as string;
            session.user.id = token.sub as string;
            return session;
        },
    },
    pages: { signIn: '/auth/signin', error: '/auth/error' },
    // Explicit const assertion ensures correct literal type for strategy
    session: { strategy: 'jwt' } as const,
} as any;

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions as any);

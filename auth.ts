// auth.ts (root)
import NextAuth from 'next-auth';
import type { AdapterAccount } from 'next-auth/adapters';
import type { JWT } from 'next-auth/jwt';
import GitLabProvider from 'next-auth/providers/gitlab';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db),
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
        async jwt({ token, account }: { token: JWT; account: AdapterAccount | null }) {
            if (account?.access_token) token.accessToken = account.access_token;
            return token;
        },
        async session({ session, token }: { session: any; token: JWT }) {
            session.accessToken = token.accessToken as string;
            session.user.id = token.sub as string;
            return session;
        },
    },
    pages: { signIn: '/auth/signin', error: '/auth/error' },
});

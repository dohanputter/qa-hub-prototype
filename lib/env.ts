import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().min(1),
        GITLAB_CLIENT_ID: z.string().optional(),
        GITLAB_CLIENT_SECRET: z.string().optional(),
        GITLAB_BASE_URL: z.string().url().default('https://gitlab.com'),
        GITLAB_API_VERSION: z.enum(['v4', 'v3']).default('v4'),
        AUTH_SECRET: z.string().min(32).optional(),
        WEBHOOK_SECRET: z.string().min(32).optional(),
    },
    client: {
        NEXT_PUBLIC_APP_URL: z.string().url().optional(),
        NEXT_PUBLIC_MOCK_MODE: z.enum(['true', 'false']).default('false'),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        GITLAB_CLIENT_ID: process.env.GITLAB_CLIENT_ID,
        GITLAB_CLIENT_SECRET: process.env.GITLAB_CLIENT_SECRET,
        GITLAB_BASE_URL: process.env.GITLAB_BASE_URL,
        GITLAB_API_VERSION: process.env.GITLAB_API_VERSION,
        AUTH_SECRET: process.env.AUTH_SECRET,
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_MOCK_MODE: process.env.NEXT_PUBLIC_MOCK_MODE,
    },
});

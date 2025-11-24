import 'server-only';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';
import { env } from '@/lib/env';

const client = createClient({ url: env.DATABASE_URL });
export const db = drizzle(client, { schema });

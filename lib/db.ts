import 'server-only';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';
import { env } from '@/lib/env';

// Lazy initialization to avoid Edge runtime issues
let _client: ReturnType<typeof createClient> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getClient() {
    if (!_client) {
        _client = createClient({ url: env.DATABASE_URL });
    }
    return _client;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
    get(target, prop) {
        if (!_db) {
            _db = drizzle(getClient(), { schema });
        }
        return (_db as any)[prop];
    }
});

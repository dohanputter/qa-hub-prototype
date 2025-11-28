import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log("Starting migration to add mock columns...");

    const client = createClient({ url: 'file:local.db' });
    const db = drizzle(client);

    try {
        // Add json_labels column
        try {
            await db.run(sql`ALTER TABLE qa_issues ADD COLUMN json_labels TEXT`);
            console.log("Added json_labels column.");
        } catch (e) {
            console.log("json_labels column might already exist or error:", e);
        }

        // Add assignee_id column
        try {
            await db.run(sql`ALTER TABLE qa_issues ADD COLUMN assignee_id INTEGER`);
            console.log("Added assignee_id column.");
        } catch (e) {
            console.log("assignee_id column might already exist or error:", e);
        }

        console.log("Migration complete.");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();

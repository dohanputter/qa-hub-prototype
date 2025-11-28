import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';

async function addUniqueConstraint() {
    console.log("Adding unique constraint to qa_issues...");

    const client = createClient({ url: 'file:local.db' });
    const db = drizzle(client);

    try {
        // First check if the unique index already exists
        const existingIndexes = await db.all(sql`
            SELECT name FROM sqlite_master 
            WHERE type='index' AND tbl_name='qa_issues'
        `) as any[];

        console.log("Existing indexes:", existingIndexes.map(i => i.name));

        const uniqueIndexExists = existingIndexes.some(i => i.name === 'idx_unique_issue');

        if (uniqueIndexExists) {
            // Drop the old non-unique index
            console.log("Dropping old non-unique index...");
            await db.run(sql`DROP INDEX IF EXISTS idx_unique_issue`);
        }

        // Create the unique index
        console.log("Creating unique index on (gitlab_project_id, gitlab_issue_iid)...");
        await db.run(sql`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_issue 
            ON qa_issues(gitlab_project_id, gitlab_issue_iid)
        `);

        console.log("✓ Unique constraint added successfully!");

        // Verify
        const finalIndexes = await db.all(sql`
            SELECT name, sql FROM sqlite_master 
            WHERE type='index' AND tbl_name='qa_issues' AND name='idx_unique_issue'
        `) as any[];

        if (finalIndexes.length > 0) {
            console.log("Verified unique index:", finalIndexes[0].sql);
        }

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

addUniqueConstraint();

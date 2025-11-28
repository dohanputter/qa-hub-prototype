import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';

async function cleanDuplicates() {
    console.log("Starting duplicate cleanup...");

    const client = createClient({ url: 'file:local.db' });
    const db = drizzle(client);

    try {
        // Find duplicates
        const duplicates = await db.all(sql`
            SELECT gitlab_project_id, gitlab_issue_iid, COUNT(*) as count
            FROM qa_issues
            GROUP BY gitlab_project_id, gitlab_issue_iid
            HAVING COUNT(*) > 1
        `) as any[];

        console.log(`Found ${duplicates.length} duplicate groups`);

        for (const dup of duplicates) {
            console.log(`\nCleaning duplicates for project ${dup.gitlab_project_id}, issue IID ${dup.gitlab_issue_iid} (${dup.count} entries)`);

            // Get all entries for this project/iid combination
            const entries = await db.all(sql`
                SELECT id, created_at, json_labels, assignee_id
                FROM qa_issues
                WHERE gitlab_project_id = ${dup.gitlab_project_id}
                AND gitlab_issue_iid = ${dup.gitlab_issue_iid}
                ORDER BY created_at DESC
            `) as any[];

            // Keep the newest one (first in DESC order)
            const keepId = entries[0].id;
            console.log(`Keeping ID: ${keepId} (created: ${entries[0].created_at})`);
            console.log(`  Labels: ${entries[0].json_labels || 'null'}`);
            console.log(`  AssigneeId: ${entries[0].assignee_id || 'null'}`);

            // Delete the others
            for (let i = 1; i < entries.length; i++) {
                console.log(`Deleting ID: ${entries[i].id} (created: ${entries[i].created_at})`);
                await db.run(sql`DELETE FROM qa_issues WHERE id = ${entries[i].id}`);
            }
        }

        console.log("\n✓ Duplicate cleanup complete!");

        // Show final count
        const finalCount = await db.get(sql`SELECT COUNT(*) as count FROM qa_issues`) as any;
        console.log(`Total issues remaining: ${finalCount.count}`);

    } catch (error) {
        console.error("Cleanup failed:", error);
    }
}

cleanDuplicates();

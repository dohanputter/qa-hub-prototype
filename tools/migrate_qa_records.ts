import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { qaIssues, qaRuns } from '@/db/schema';

// Helper to run raw queries since we need to access a table that is not in the schema anymore
async function migrate() {
    console.log("Starting migration...");

    try {
        // 1. Check if 'qa_records' table exists
        // Note: Drizzle `sql` tag usage depends on driver. For sqlite usually:
        const checkTable = await db.get(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='qa_records'`);

        if (!checkTable) {
            console.log("No 'qa_records' table found in database. Migration skipped.");
            return;
        }

        console.log("Found 'qa_records' table. Reading records...");

        // 2. Read old records
        const oldRecords = await db.all(sql`SELECT * FROM qa_records`);
        console.log(`Found ${oldRecords.length} records to migrate.`);

        for (const rec of oldRecords) {
            const record = rec as any;

            console.log(`Migrating record for Issue #${record.gitlab_issue_iid}...`);

            // 3. Insert into qa_issues
            const [insertedIssue] = await db.insert(qaIssues).values({
                gitlabIssueId: record.gitlab_issue_id,
                gitlabIssueIid: record.gitlab_issue_iid,
                gitlabProjectId: record.gitlab_project_id,
                issueTitle: record.issue_title,
                issueDescription: record.issue_description,
                issueUrl: record.issue_url,
                status: record.status,
                createdAt: new Date(record.created_at),
                updatedAt: new Date(record.updated_at),
            }).returning();

            // 4. Insert into qa_runs (Run #1)
            let testCases = null;
            let issuesFound = null;

            try {
                if (record.test_cases_content) testCases = JSON.parse(record.test_cases_content);
            } catch (e) {}

            try {
                if (record.issues_found_content) issuesFound = JSON.parse(record.issues_found_content);
            } catch (e) {}

            const [insertedRun] = await db.insert(qaRuns).values({
                qaIssueId: insertedIssue.id,
                runNumber: 1,
                status: record.status,
                testCasesContent: testCases,
                issuesFoundContent: issuesFound,
                shareUuid: record.share_uuid,
                createdBy: record.created_by,
                completedAt: record.completed_at ? new Date(record.completed_at) : null,
                createdAt: new Date(record.created_at),
                updatedAt: new Date(record.updated_at),
            }).returning();

            // 5. Update attachments
            // We assume 'attachments' table has 'qa_record_id' (old column) and 'qa_run_id' (new column)
            // If 'drizzle-kit push' ran, it likely added 'qa_run_id'. It might have kept 'qa_record_id' if not strictly dropping.
            // We'll attempt to update.
            try {
                const result = await db.run(sql`UPDATE attachments SET qa_run_id = ${insertedRun.id} WHERE qa_record_id = ${record.id}`);
                console.log(`Updated attachments for run ${insertedRun.id}`);
            } catch (err) {
                console.warn(`Failed to update attachments for record ${record.id}. Column 'qa_record_id' might be missing.`);
            }
        }

        // 6. Rename/Drop old table?
        // Better to rename it to backup
        console.log("Renaming 'qa_records' to 'qa_records_backup'...");
        await db.run(sql`ALTER TABLE qa_records RENAME TO qa_records_backup`);

        console.log("Migration complete successfully!");

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';

async function resetDatabase() {
    console.log("🗑️  Clearing database and reseeding...\n");

    const client = createClient({ url: 'file:local.db' });
    const db = drizzle(client);

    try {
        // 1. Delete all data in reverse order of dependencies
        console.log("Step 1: Deleting existing data...");

        // Delete in order: most dependent to least dependent
        await db.run(sql`DELETE FROM attachments`);
        console.log("  ✓ Cleared attachments");

        await db.run(sql`DELETE FROM qa_runs`);
        console.log("  ✓ Cleared qa_runs");

        await db.run(sql`DELETE FROM qa_issues`);
        console.log("  ✓ Cleared qa_issues");

        await db.run(sql`DELETE FROM notifications`);
        console.log("  ✓ Cleared notifications");

        await db.run(sql`DELETE FROM user_projects`);
        console.log("  ✓ Cleared user_projects");

        await db.run(sql`DELETE FROM user_groups`);
        console.log("  ✓ Cleared user_groups");

        await db.run(sql`DELETE FROM projects`);
        console.log("  ✓ Cleared projects");

        await db.run(sql`DELETE FROM groups`);
        console.log("  ✓ Cleared groups");

        await db.run(sql`DELETE FROM user WHERE id LIKE 'mock-%' OR email LIKE '%@example.com' OR email LIKE '%@system.local'`);
        console.log("  ✓ Cleared mock users");

        // 2. Insert fresh mock data
        console.log("\nStep 2: Inserting fresh mock data...");

        // Create mock users
        await db.run(sql`
            INSERT INTO user (id, name, email, image) VALUES
            ('mock-user-1', 'Alice Johnson', 'alice@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
            ('mock-user-2', 'Bob Smith', 'bob@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'),
            ('mock-user-3', 'Charlie Davis', 'charlie@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'),
            ('mock-user-4', 'Diana Prince', 'diana@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana')
        `);
        console.log("  ✓ Created 4 mock users");

        // Create mock group
        await db.run(sql`
            INSERT INTO groups (id, name, full_path, description, web_url, avatar_url, created_at) VALUES
            (500, 'QA Hub Test Group', 'qa-hub-test-group', 'Group for QA Hub testing', 'https://gitlab.com/groups/qa-hub-test-group', null, ${Date.now()})
        `);
        console.log("  ✓ Created mock group");

        // Create mock project
        await db.run(sql`
            INSERT INTO projects (id, group_id, name, description, web_url, qa_label_mapping, is_configured, created_at) VALUES
            (500, 500, 'QA Hub Test Project', 'Project for QA Hub testing', 'https://gitlab.com/qa-hub-test-group/qa-hub-test-project',
             '{"pending":"qa::ready","passed":"qa::passed","failed":"qa::failed"}', 1, ${Date.now()})
        `);
        console.log("  ✓ Created mock project");

        // Link users to group
        await db.run(sql`
            INSERT INTO user_groups (user_id, group_id, added_at) VALUES
            ('mock-user-1', 500, ${Date.now()}),
            ('mock-user-2', 500, ${Date.now()}),
            ('mock-user-3', 500, ${Date.now()}),
            ('mock-user-4', 500, ${Date.now()})
        `);
        console.log("  ✓ Linked users to group");

        // Link users to project
        await db.run(sql`
            INSERT INTO user_projects (user_id, project_id, added_at) VALUES
            ('mock-user-1', 500, ${Date.now()}),
            ('mock-user-2', 500, ${Date.now()}),
            ('mock-user-3', 500, ${Date.now()}),
            ('mock-user-4', 500, ${Date.now()})
        `);
        console.log("  ✓ Linked users to project");

        // Verify the reset
        console.log("\nStep 3: Verifying reset...");

        const userCount = await db.get(sql`SELECT COUNT(*) as count FROM user WHERE id LIKE 'mock-%'`) as any;
        console.log(`  ✓ Mock users: ${userCount.count}`);

        const groupCount = await db.get(sql`SELECT COUNT(*) as count FROM groups`) as any;
        console.log(`  ✓ Groups: ${groupCount.count}`);

        const projectCount = await db.get(sql`SELECT COUNT(*) as count FROM projects`) as any;
        console.log(`  ✓ Projects: ${projectCount.count}`);

        const qaIssueCount = await db.get(sql`SELECT COUNT(*) as count FROM qa_issues`) as any;
        console.log(`  ✓ QA Issues: ${qaIssueCount.count}`);

        const qaRunCount = await db.get(sql`SELECT COUNT(*) as count FROM qa_runs`) as any;
        console.log(`  ✓ QA Runs: ${qaRunCount.count}`);

        console.log("\n✅ Database reset complete!");
        console.log("\n📋 Mock Data Summary:");
        console.log("   • 4 mock users (Alice, Bob, Charlie, Diana)");
        console.log("   • 1 test group (ID: 500)");
        console.log("   • 1 test project (ID: 500)");
        console.log("   • QA Labels: qa::ready, qa::passed, qa::failed");
        console.log("\n🎯 Ready to create new issues!");

    } catch (error) {
        console.error("❌ Reset failed:", error);
    }
}

resetDatabase();

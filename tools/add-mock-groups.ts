/**
 * Add Mock Groups to Existing Database
 * This adds the new MOCK_GROUPS alongside existing groups/projects/issues
 * Run with: npx tsx tools/add-mock-groups.ts
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { groups, projects } from '../db/schema';
import { MOCK_GROUPS, MOCK_PROJECTS } from '../lib/gitlab/mock-data';
import { eq } from 'drizzle-orm';

async function addMockGroups() {
    console.log('🔗 Adding mock groups to existing database...\n');

    try {
        const client = createClient({
            url: process.env.DATABASE_URL || 'file:local.db'
        });
        const db = drizzle(client, { schema: { groups, projects } });

        // Add new mock groups
        console.log('📁 Adding mock groups...');
        for (const group of MOCK_GROUPS) {
            const existing = await db.select().from(groups).where(eq(groups.id, group.id)).limit(1);
            if (existing.length === 0) {
                await db.insert(groups).values({
                    id: group.id,
                    name: group.name,
                    fullPath: group.full_path,
                    description: group.description,
                    webUrl: group.web_url,
                    avatarUrl: group.avatar_url,
                    createdAt: new Date(),
                });
                console.log(`  ✅ Added group: ${group.name} (ID: ${group.id})`);
            } else {
                console.log(`  ℹ️  Group already exists: ${group.name} (ID: ${group.id})`);
            }
        }

        // Add new mock projects
        console.log('\n🏗️  Adding mock projects...');
        for (const project of MOCK_PROJECTS) {
            const existing = await db.select().from(projects).where(eq(projects.id, project.id)).limit(1);
            if (existing.length === 0) {
                await db.insert(projects).values({
                    id: project.id,
                    groupId: project.namespace.id,
                    name: project.name,
                    description: project.description,
                    webUrl: project.web_url,
                    qaLabelMapping: project.qaLabelMapping,
                    isConfigured: true,
                    createdAt: new Date(),
                });
                console.log(`  ✅ Added project: ${project.name} (ID: ${project.id})`);
            } else {
                console.log(`  ℹ️  Project already exists: ${project.name} (ID: ${project.id})`);
            }
        }

        console.log('\n✨ Successfully added mock groups and projects!\n');

    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addMockGroups();

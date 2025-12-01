/**
 * Seed Script for Mock Data
 * Initializes the database with mock groups, projects, and issues
 * Run with: npx tsx tools/seed-mock-data.ts
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { groups, projects, qaIssues, users } from '../db/schema';
import { MOCK_GROUPS, MOCK_PROJECTS, MOCK_ISSUES } from '../lib/gitlab/mock-data';
import { SYSTEM_USERS } from '../lib/constants';
import { eq, and } from 'drizzle-orm';

async function seed() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // Create database client directly (bypassing lib/db to avoid server-only restriction)
        const client = createClient({
            url: process.env.DATABASE_URL || 'file:local.db'
        });
        const db = drizzle(client, { schema: { groups, projects, qaIssues, users } });

        // 1. Seed System Users
        console.log('📝 Seeding system users...');
        const mockUser = await db.select().from(users).where(eq(users.id, SYSTEM_USERS.MOCK)).limit(1);
        if (mockUser.length === 0) {
            await db.insert(users).values({
                id: SYSTEM_USERS.MOCK,
                email: 'mock@example.com',
                name: 'Mock User',
                image: 'https://picsum.photos/32/32?random=999',
            });
            console.log('  ✅ Created mock user');
        } else {
            console.log('  ℹ️  Mock user already exists');
        }

        // 2. Seed Groups
        console.log('\n📁 Seeding groups...');
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
                console.log(`  ✅ Created group: ${group.name} (ID: ${group.id})`);
            } else {
                console.log(`  ℹ️  Group already exists: ${group.name} (ID: ${group.id})`);
            }
        }

        // 3. Seed Projects
        console.log('\n🏗️  Seeding projects...');
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
                console.log(`  ✅ Created project: ${project.name} (ID: ${project.id})`);
            } else {
                console.log(`  ℹ️  Project already exists: ${project.name} (ID: ${project.id})`);
            }
        }

        // 4. Seed Issues
        console.log('\n🎫 Seeding issues...');
        for (const issue of MOCK_ISSUES) {
            const existing = await db.select().from(qaIssues).where(
                and(
                    eq(qaIssues.gitlabProjectId, issue.project_id),
                    eq(qaIssues.gitlabIssueIid, issue.iid)
                )
            ).limit(1);

            if (existing.length === 0) {
                await db.insert(qaIssues).values({
                    gitlabIssueId: issue.id,
                    gitlabIssueIid: issue.iid,
                    gitlabProjectId: issue.project_id,
                    issueTitle: issue.title,
                    issueDescription: issue.description || '',
                    issueUrl: issue.web_url,
                    status: 'pending', // Default QA status
                    jsonLabels: issue.labels,
                    assigneeId: issue.assignees && issue.assignees.length > 0 ? issue.assignees[0].id : null,
                    authorId: issue.author?.id || null,
                    createdAt: new Date(issue.created_at),
                    updatedAt: new Date(issue.updated_at),
                });
                console.log(`  ✅ Created issue: ${issue.title} (Project: ${issue.project_id}, IID: ${issue.iid})`);
            } else {
                console.log(`  ℹ️  Issue already exists: ${issue.title} (Project: ${issue.project_id}, IID: ${issue.iid})`);
            }
        }

        console.log('\n✨ Database seeding completed successfully!\n');
        console.log('Summary:');
        console.log(`  Groups: ${MOCK_GROUPS.length}`);
        console.log(`  Projects: ${MOCK_PROJECTS.length}`);
        console.log(`  Issues: ${MOCK_ISSUES.length}\n`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();

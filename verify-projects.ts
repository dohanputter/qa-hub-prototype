
import { db } from '@/lib/db';
import { projects } from '@/db/schema';

async function main() {
    const allProjects = await db.select().from(projects);
    console.log('Projects in DB:', JSON.stringify(allProjects, null, 2));
}

main().catch(console.error);

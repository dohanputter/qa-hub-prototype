
import { getDashboardStats } from './app/actions/issues';
import { isMockMode } from './lib/mode';

// Mock the environment to ensure mock mode is active
process.env.NEXT_PUBLIC_MOCK_MODE = 'true';

async function main() {
    console.log('Is Mock Mode:', isMockMode());
    const stats = await getDashboardStats();
    console.log('Project Stats:', JSON.stringify(stats.projectStats, null, 2));

    const projectNames = stats.projectStats.map((p: any) => p.name);
    const expectedNames = ['Bob Go', 'Bobe', 'Bob Shop App', 'Bob Pay'];

    const hasExpectedNames = expectedNames.every(name => projectNames.includes(name));

    if (hasExpectedNames) {
        console.log('SUCCESS: Dashboard stats contain expected project names.');
    } else {
        console.error('FAILURE: Dashboard stats do NOT contain expected project names.');
        console.error('Expected:', expectedNames);
        console.error('Actual:', projectNames);
        process.exit(1);
    }
}

main().catch(console.error);

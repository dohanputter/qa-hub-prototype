#!/usr/bin/env node
/**
 * Version bumping script for QA Hub
 * 
 * Usage:
 *   node scripts/bump-version.mjs patch  - Bump patch version (0.1.0 -> 0.1.1)
 *   node scripts/bump-version.mjs minor  - Bump minor version (0.1.0 -> 0.2.0)
 *   node scripts/bump-version.mjs major  - Bump major version (0.1.0 -> 1.0.0)
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '..', 'package.json');

// Get bump type from command line
const bumpType = process.argv[2];

if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('❌ Usage: node scripts/bump-version.mjs <patch|minor|major>');
    process.exit(1);
}

// Read current package.json
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
switch (bumpType) {
    case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
    case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
    case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
}

console.log(`\n📦 Bumping version: ${currentVersion} → ${newVersion}\n`);

// Update package.json
packageJson.version = newVersion;
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ Updated package.json');

// Git operations
try {
    // Stage package.json
    execSync('git add package.json', { stdio: 'inherit' });

    // Create commit
    execSync(`git commit -m "chore: bump version to v${newVersion}"`, { stdio: 'inherit' });
    console.log('✅ Created git commit');

    // Create tag
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
    console.log(`✅ Created git tag: v${newVersion}`);

    console.log(`\n🎉 Version bumped to v${newVersion}`);
    console.log(`\n💡 Don't forget to push with tags: git push && git push --tags\n`);
} catch (error) {
    console.error('\n⚠️  Git operations failed. Version was updated in package.json but not committed.');
    console.error('   You may need to commit manually or have uncommitted changes.\n');
}

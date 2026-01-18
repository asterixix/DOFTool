#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const versionType = args[0] || 'patch';

if (!['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'].includes(versionType)) {
  console.error('Usage: node bump-version.js [major|minor|patch|premajor|preminor|prepatch|prerelease]');
  process.exit(1);
}

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const currentVersion = packageJson.version;
const versionParts = currentVersion.replace(/-.*$/, '').split('.').map(Number);
let [major, minor, patch] = versionParts;
let prerelease = currentVersion.includes('-') ? currentVersion.split('-')[1] : null;

switch (versionType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    prerelease = null;
    break;
  case 'minor':
    minor++;
    patch = 0;
    prerelease = null;
    break;
  case 'patch':
    patch++;
    prerelease = null;
    break;
  case 'premajor':
    major++;
    minor = 0;
    patch = 0;
    prerelease = 'alpha.0';
    break;
  case 'preminor':
    minor++;
    patch = 0;
    prerelease = 'alpha.0';
    break;
  case 'prepatch':
    patch++;
    prerelease = 'alpha.0';
    break;
  case 'prerelease':
    if (prerelease) {
      const parts = prerelease.split('.');
      const num = parseInt(parts[1] || '0', 10);
      prerelease = `${parts[0]}.${num + 1}`;
    } else {
      prerelease = 'alpha.0';
    }
    break;
}

const newVersion = prerelease ? `${major}.${minor}.${patch}-${prerelease}` : `${major}.${minor}.${patch}`;

packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped: ${currentVersion} → ${newVersion}`);

const createTag = args.includes('--tag');
if (createTag) {
  try {
    execSync(`git add package.json`, { stdio: 'inherit' });
    execSync(`git commit -m "chore(release): bump version to ${newVersion}"`, { stdio: 'inherit' });
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
    console.log(`Created tag: v${newVersion}`);
    console.log(`\nTo push: git push origin main --tags`);
  } catch (error) {
    console.error('Failed to create git tag:', error.message);
    process.exit(1);
  }
}

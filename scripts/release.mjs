#!/usr/bin/env node

/**
 * RTL Markdown Studio - Release & Version Controller
 * Automated Semantic Versioning, Changelog Generation, and Tagging.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import readline from 'node:readline';

const rootDir = process.cwd();
const pkgPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', ...options }).trim();
  } catch (error) {
    if (options.allowError) return null;
    console.error(`\n❌ Command failed: ${cmd}`);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

function parseSemVer(version) {
  const parts = version.replace(/^v/, '').split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function bumpVersion(currentVersion, type) {
  const { major, minor, patch } = parseSemVer(currentVersion);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+/.test(type)) return type.replace(/^v/, '');
  throw new Error(`Unknown bump type: ${type}. Use 'patch', 'minor', 'major', or an explicit version like '1.2.0'.`);
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n🌟 RTL Markdown Studio - Version Controller & Release Automation');
  console.log('=================================================================\n');

  if (!fs.existsSync(pkgPath)) {
    console.error('❌ package.json not found!');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version || '0.1.0';

  // 1. Verify clean git working tree
  const status = run('git status --porcelain');
  if (status) {
    console.log('⚠️  Working directory has uncommitted changes:\n');
    console.log(status);
    const proceed = await prompt('\nDo you want to stage and commit all changes before release? (y/N): ');
    if (proceed.toLowerCase() === 'y' || proceed.toLowerCase() === 'yes') {
      run('git add -A');
      run('git commit -m "chore: pre-release changes"');
      console.log('✅ Committed pending changes.');
    } else {
      console.log('❌ Release aborted. Please commit or stash your changes first.');
      process.exit(1);
    }
  }

  // 2. Determine target version
  let targetType = process.argv[2];
  if (!targetType) {
    console.log(`Current version: v${currentVersion}`);
    console.log(`  1) patch (v${bumpVersion(currentVersion, 'patch')}) - Bug fixes & tweaks`);
    console.log(`  2) minor (v${bumpVersion(currentVersion, 'minor')}) - New features & enhancements`);
    console.log(`  3) major (v${bumpVersion(currentVersion, 'major')}) - Breaking changes`);
    const choice = await prompt('\nSelect release type [patch/minor/major or specific version, default: patch]: ');
    targetType = choice || 'patch';
    if (targetType === '1') targetType = 'patch';
    if (targetType === '2') targetType = 'minor';
    if (targetType === '3') targetType = 'major';
  }

  const newVersion = bumpVersion(currentVersion, targetType);
  const tag = `v${newVersion}`;

  console.log(`\n🚀 Preparing release: v${currentVersion} ➔ ${tag}`);

  // 3. Pre-flight verification (TypeScript Check & Next.js Build)
  console.log('\n🔍 Running pre-flight checks (Typecheck & Production Build)...');
  run('pnpm exec tsc --noEmit', { stdio: 'inherit' });
  run('pnpm run build', { stdio: 'inherit' });
  console.log('✅ Pre-flight checks passed successfully.');

  // 4. Extract Git Commits since last tag for changelog
  const lastTag = run('git describe --tags --abbrev=0', { allowError: true });
  const logRange = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const rawCommits = run(`git log ${logRange} --pretty=format:"%s (%h)"`, { allowError: true }) || '';
  const commitLines = rawCommits.split('\n').filter(Boolean);

  const features = [];
  const fixes = [];
  const others = [];

  for (const line of commitLines) {
    if (/^feat/i.test(line)) features.push(line);
    else if (/^fix/i.test(line)) fixes.push(line);
    else if (!/^chore\(release\)/i.test(line)) others.push(line);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  let changelogEntry = `\n## [${tag}] - ${dateStr}\n\n`;

  if (features.length) {
    changelogEntry += `### 🚀 Features\n${features.map((c) => `- ${c}`).join('\n')}\n\n`;
  }
  if (fixes.length) {
    changelogEntry += `### 🐛 Bug Fixes\n${fixes.map((c) => `- ${c}`).join('\n')}\n\n`;
  }
  if (others.length) {
    changelogEntry += `### 🛠️ Maintenance & Improvements\n${others.map((c) => `- ${c}`).join('\n')}\n\n`;
  }
  if (!features.length && !fixes.length && !others.length) {
    changelogEntry += `- Release version ${tag}\n\n`;
  }

  // 5. Update CHANGELOG.md
  let currentChangelog = '';
  if (fs.existsSync(changelogPath)) {
    currentChangelog = fs.readFileSync(changelogPath, 'utf8');
  } else {
    currentChangelog = `# Changelog\n\nAll notable changes to **RTL Markdown Studio** will be documented in this file.\n`;
  }

  const headerIndex = currentChangelog.indexOf('## [');
  let updatedChangelog = '';
  if (headerIndex !== -1) {
    updatedChangelog = currentChangelog.slice(0, headerIndex) + changelogEntry.trimStart() + currentChangelog.slice(headerIndex);
  } else {
    updatedChangelog = currentChangelog.trimEnd() + '\n' + changelogEntry;
  }

  fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');
  console.log('📝 Updated CHANGELOG.md');

  // 6. Update package.json version
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`📦 Bumped package.json version to ${newVersion}`);

  // 7. Git commit and tag
  run(`git add package.json CHANGELOG.md`);
  run(`git commit -m "chore(release): ${tag}"`);
  run(`git tag -a ${tag} -m "Release ${tag}"`);
  console.log(`🏷️  Created Git Tag: ${tag}`);

  // 8. Celebration & Instructions
  console.log('\n=================================================================');
  console.log(`🎉 Successfully released RTL Markdown Studio ${tag}!`);
  console.log('=================================================================\n');
  console.log('To publish the new release and tags to GitHub, run:');
  console.log(`\n    git push origin main --tags\n`);
}

main().catch((err) => {
  console.error('\n❌ Release failed:', err);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * RTL Markdown Studio - Automatic Release & Version Controller
 * Automatically computes next version from Conventional Commit messages since the last tag.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const pkgPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

function run(cmd, options = {}) {
  try {
    const result = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', ...options });
    return typeof result === 'string' ? result.trim() : (result ? result.toString().trim() : '');
  } catch (error) {
    if (options.allowError) return null;
    console.error(`\n❌ Command failed: ${cmd}`);
    if (error.stderr) console.error(error.stderr);
    else if (error.message) console.error(error.message);
    process.exit(1);
  }
}

function parseSemVer(version) {
  const parts = version.replace(/^v/, '').split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function bumpVersion(currentVersion, type) {
  const { major, minor, patch } = parseSemVer(currentVersion);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+/.test(type)) return type.replace(/^v/, '');
  throw new Error(`Invalid bump type: ${type}`);
}

function detectBumpType(commitLines) {
  let hasBreaking = false;
  let hasFeat = false;

  for (const line of commitLines) {
    if (/BREAKING CHANGE/i.test(line) || /^[a-z]+(\([^\)]+\))?!:/i.test(line)) {
      hasBreaking = true;
    } else if (/^feat(\([^\)]+\))?:/i.test(line)) {
      hasFeat = true;
    }
  }

  if (hasBreaking) return { type: 'major', reason: 'Breaking changes detected' };
  if (hasFeat) return { type: 'minor', reason: 'New feature detected (feat)' };
  return { type: 'patch', reason: 'Bug fixes or maintenance updates (fix/chore)' };
}

async function main() {
  console.log('\n🌟 RTL Markdown Studio - Automated Release & Version Controller');
  console.log('===============================================================================\n');

  if (!fs.existsSync(pkgPath)) {
    console.error('❌ package.json not found!');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version || '1.0.0';

  // 1. Check Git status
  const status = run('git status --porcelain');
  if (status) {
    console.log('📦 Staging and committing working changes prior to release...');
    run('git add -A');
    run('git commit -m "chore: pre-release automatic commit"');
  }

  // 2. Fetch latest tag and analyze recent commits
  const lastTag = run('git describe --tags --abbrev=0', { allowError: true });
  const logRange = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const rawCommits = run(`git log ${logRange} --pretty=format:"%s (%h)"`, { allowError: true }) || '';
  const commitLines = rawCommits.split('\n').filter(Boolean);

  let targetType = process.argv[2];
  let reason = 'Explicitly passed via CLI argument';

  if (!targetType) {
    if (commitLines.length === 0) {
      console.log('ℹ️  No new commits since last release tag. Defaulting to patch bump.');
      targetType = 'patch';
      reason = 'Default (patch)';
    } else {
      const detected = detectBumpType(commitLines);
      targetType = detected.type;
      reason = detected.reason;
    }
  }

  const newVersion = bumpVersion(currentVersion, targetType);
  const tag = `v${newVersion}`;

  console.log(`📌 Current version: v${currentVersion}`);
  console.log(`🔍 Commit analysis: ${reason}`);
  console.log(`🚀 Next calculated version: ${tag} (${targetType})\n`);

  // 3. Verification: Typecheck, Test, and Build
  console.log('⚙️  Running verification suite (Typecheck, Test & Build)...');
  run('pnpm exec tsc --noEmit', { stdio: 'inherit' });
  run('pnpm run test', { stdio: 'inherit' });
  run('pnpm run build', { stdio: 'inherit' });
  console.log('✅ All verification checks (Typecheck, Test & Build) passed successfully.');

  // 4. Categorize commits for CHANGELOG.md
  const features = [];
  const fixes = [];
  const others = [];

  for (const line of commitLines) {
    if (/^feat/i.test(line)) features.push(line);
    else if (/^fix/i.test(line)) fixes.push(line);
    else if (!/^chore\(release\)/i.test(line) && !/^chore: pre-release/i.test(line)) others.push(line);
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
    changelogEntry += `### 🛠️ Improvements & Maintenance\n${others.map((c) => `- ${c}`).join('\n')}\n\n`;
  }
  if (!features.length && !fixes.length && !others.length) {
    changelogEntry += `- Release ${tag}\n\n`;
  }

  // 5. Update CHANGELOG.md
  let currentChangelog = '';
  if (fs.existsSync(changelogPath)) {
    currentChangelog = fs.readFileSync(changelogPath, 'utf8');
  } else {
    currentChangelog = `# Changelog\n\nAll notable changes to **RTL Markdown Studio** are documented in this file.\n`;
  }

  const headerIndex = currentChangelog.indexOf('## [');
  let updatedChangelog = '';
  if (headerIndex !== -1) {
    updatedChangelog = currentChangelog.slice(0, headerIndex) + changelogEntry.trimStart() + currentChangelog.slice(headerIndex);
  } else {
    updatedChangelog = currentChangelog.trimEnd() + '\n' + changelogEntry;
  }

  fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');
  console.log('📝 CHANGELOG.md updated successfully.');

  // 6. Update version in package.json
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`📦 package.json version updated to ${newVersion}.`);

  // 7. Commit release files and create Git tag
  run(`git add package.json CHANGELOG.md`);
  run(`git commit -m "chore(release): ${tag}"`);
  run(`git tag -a ${tag} -m "Release ${tag}"`);
  console.log(`🏷️  Git release tag created: ${tag}`);

  console.log('\n===============================================================================');
  console.log(`🎉 New release ${tag} is ready and tagged!`);
  console.log('===============================================================================\n');
  console.log('To publish changes and tags to GitHub, run:');
  console.log(`\n    git push origin main --tags\n`);
}

main().catch((err) => {
  console.error('\n❌ Release process failed:', err);
  process.exit(1);
});

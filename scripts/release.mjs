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
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', ...options }).trim();
  } catch (error) {
    if (options.allowError) return null;
    console.error(`\n❌ دستور با خطا مواجه شد: ${cmd}`);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

function parseSemVer(version) {
  const parts = version.replace(/^v/, '').split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`نسخه نامعتبر: ${version}`);
  }
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function bumpVersion(currentVersion, type) {
  const { major, minor, patch } = parseSemVer(currentVersion);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+/.test(type)) return type.replace(/^v/, '');
  throw new Error(`نوع افزایش نسخه نامعتبر است: ${type}`);
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

  if (hasBreaking) return { type: 'major', reason: 'وجود تغییرات بنیادین (Breaking Change)' };
  if (hasFeat) return { type: 'minor', reason: 'افزوده شدن ویژگی جدید (feat)' };
  return { type: 'patch', reason: 'رفع باگ یا تغییرات نگهداری (fix/chore)' };
}

async function main() {
  console.log('\n🌟 استودیو RTL Markdown - سیستم خودکار نسخه‌گذاری و انتشار (Release Controller)');
  console.log('===============================================================================\n');

  if (!fs.existsSync(pkgPath)) {
    console.error('❌ فایل package.json یافت نشد!');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version || '1.0.0';

  // 1. بررسی وضعیت Git
  const status = run('git status --porcelain');
  if (status) {
    console.log('📦 ثبت خودکار تغییرات باز پیش از انتشار...');
    run('git add -A');
    run('git commit -m "chore: pre-release automatic commit"');
  }

  // 2. واکشی آخرین تگ و بررسی کامیت‌های جدید
  const lastTag = run('git describe --tags --abbrev=0', { allowError: true });
  const logRange = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const rawCommits = run(`git log ${logRange} --pretty=format:"%s (%h)"`, { allowError: true }) || '';
  const commitLines = rawCommits.split('\n').filter(Boolean);

  let targetType = process.argv[2];
  let reason = 'تعیین دستی توسط آرگومان ورودی';

  if (!targetType) {
    if (commitLines.length === 0) {
      console.log('ℹ️  هیچ کامیت جدیدی از آخرین تگ یافت نشد. به صورت خودکار patch اعمال می‌شود.');
      targetType = 'patch';
      reason = 'پیش‌فرض (patch)';
    } else {
      const detected = detectBumpType(commitLines);
      targetType = detected.type;
      reason = detected.reason;
    }
  }

  const newVersion = bumpVersion(currentVersion, targetType);
  const tag = `v${newVersion}`;

  console.log(`📌 آخرین نسخه: v${currentVersion}`);
  console.log(`🔍 تحلیل خودکار کامیت‌ها: ${reason}`);
  console.log(`🚀 نسخه جدید محاسبه‌شده: ${tag} (${targetType})\n`);

  // 3. اعتبارسنجی Typecheck، Tests و Build
  console.log('⚙️  در حال بررسی تایپ‌ها، اجرای تست‌ها و تست ساخت (Typecheck, Test & Build)...');
  run('pnpm exec tsc --noEmit', { stdio: 'inherit' });
  run('pnpm run test', { stdio: 'inherit' });
  run('pnpm run build', { stdio: 'inherit' });
  console.log('✅ تمامی تست‌ها و تست ساخت با موفقیت تایید شدند.');

  // 4. دسته‌بندی کامیت‌ها برای گزارش تغییرات (CHANGELOG)
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
    changelogEntry += `### 🚀 ویژگی‌های جدید (Features)\n${features.map((c) => `- ${c}`).join('\n')}\n\n`;
  }
  if (fixes.length) {
    changelogEntry += `### 🐛 رفع اشکالات (Bug Fixes)\n${fixes.map((c) => `- ${c}`).join('\n')}\n\n`;
  }
  if (others.length) {
    changelogEntry += `### 🛠️ بهبودها و تغییرات فنی\n${others.map((c) => `- ${c}`).join('\n')}\n\n`;
  }
  if (!features.length && !fixes.length && !others.length) {
    changelogEntry += `- انتشار نسخه ${tag}\n\n`;
  }

  // 5. بروزرسانی CHANGELOG.md
  let currentChangelog = '';
  if (fs.existsSync(changelogPath)) {
    currentChangelog = fs.readFileSync(changelogPath, 'utf8');
  } else {
    currentChangelog = `# گزارش تغییرات (Changelog)\n\nتمام تغییرات **RTL Markdown Studio** در این فایل مستند می‌شود.\n`;
  }

  const headerIndex = currentChangelog.indexOf('## [');
  let updatedChangelog = '';
  if (headerIndex !== -1) {
    updatedChangelog = currentChangelog.slice(0, headerIndex) + changelogEntry.trimStart() + currentChangelog.slice(headerIndex);
  } else {
    updatedChangelog = currentChangelog.trimEnd() + '\n' + changelogEntry;
  }

  fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');
  console.log('📝 فایل CHANGELOG.md بروزرسانی شد.');

  // 6. بروزرسانی نسخه در package.json
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`📦 شماره نسخه در package.json به ${newVersion} تغییر یافت.`);

  // 7. ثبت کامیت انتشار و ایجاد تگ Git
  run(`git add package.json CHANGELOG.md`);
  run(`git commit -m "chore(release): ${tag}"`);
  run(`git tag -a ${tag} -m "Release ${tag}"`);
  console.log(`🏷️  تگ گیت ایجاد شد: ${tag}`);

  console.log('\n===============================================================================');
  console.log(`🎉 نسخه جدید ${tag} با موفقیت آماده و تگ شد!`);
  console.log('===============================================================================\n');
  console.log('برای ارسال تغییرات و تگ‌ها به گیت‌هاب کافیست دستور زیر را اجرا کنید:');
  console.log(`\n    git push origin main --tags\n`);
}

main().catch((err) => {
  console.error('\n❌ عملیات انتشار با خطا مواجه شد:', err);
  process.exit(1);
});

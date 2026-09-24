# Contributing to RTL Markdown Studio

First off, thank you for considering contributing to **RTL Markdown Studio**! We welcome contributions, bug reports, and suggestions.

## 🛠️ Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/MohsnRaj/RtlMarkdown.git
   cd RtlMarkdown
   ```

2. Install dependencies using `pnpm`:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   pnpm dev
   ```

4. Run typechecks and build:
   ```bash
   pnpm typecheck
   pnpm build
   ```

## 📝 Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation changes
- `style:` Code style/formatting (no code change)
- `refactor:` Code refactoring without behavior changes
- `perf:` Performance improvements
- `test:` Adding or modifying tests
- `chore:` Maintenance, dependency bumps, tooling

## 🚀 Release Workflow

Maintainers can publish a new release using:
```bash
# Automatically runs typecheck, build, bumps version, generates changelog, and tags
pnpm release:patch   # For bug fixes
pnpm release:minor   # For new features
pnpm release:major   # For breaking changes
```

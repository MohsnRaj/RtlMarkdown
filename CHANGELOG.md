# Changelog

All notable changes to **RTL Markdown Studio** will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.2.1] - 2026-09-24

### 🐛 Bug Fixes
- fix(bidi): prioritize primary RTL script to prevent false LTR block alignment (0cdcad4)

## [v1.2.0] - 2026-09-24

### 🚀 Features
- feat(release): automate git push of commits and tags during release (acd9aae)

## [v1.1.0] - 2026-09-24

### 🚀 Features
- feat(bidi): implement bidirectional script detection, English sentence auto-alignment, and test suite (17162da)
- feat(ui): disable nextjs development indicator badge (844a5d9)
- feat(ci): add github pages automated deployment and live web link (9c1f084)
- feat(dx): support commit-driven semver bump and add issue templates (f80001d)

### 🐛 Bug Fixes
- fix(ci): pin pnpm 10 and upgrade node to 22 in github workflows (d76435e)

### 🛠️ Improvements & Maintenance
- docs: streamline readme content and update maintainer perspective (9bf98a4)
- chore(dx): configure peer engineering guidelines across antigravity, codex, and cursor (2bc159a)
- chore(license): set the developer fullname (3ff0426)

## [v1.0.0] - 2026-09-24

### 🚀 Features
- **Strict BiDi Isolation Engine**: Solves symbol flipping, bracket inversion, and punctuation displacement in mixed RTL (Persian/Arabic) and LTR content.
- **LaTeX Math Support (KaTeX)**: Full rendering support for inline formulas (`$E=mc^2$`) and display equations with fractions, roots, matrices, and summations.
- **Dynamic Mermaid.js Integration**: Client-side SVG generation for flowcharts, sequence diagrams, and state diagrams with RTL text support.
- **Interactive Split-Pane Studio**: Live side-by-side editing and rendering, quick insertion toolbar, and custom view modes (Split, Editor only, Preview only).
- **Code Block Formatter**: Syntax formatting with one-click copy functionality and language badges.
- **CSS Logical Properties**: Responsive tables, blockquotes with right borders, and properly aligned bullet points.
- **Release Automation**: Integrated version controller and release pipeline with `pnpm release`.

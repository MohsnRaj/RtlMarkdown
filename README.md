<div align="center">

# 🖋️ RTL Markdown Studio

**Enterprise-grade Markdown renderer and interactive studio engineered specifically for Right-to-Left (RTL) documentation.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000)](https://github.com/MohsnRaj/RtlMarkdown/releases)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![KaTeX](https://img.shields.io/badge/Math-KaTeX-3298dc)](https://katex.org/)
[![Mermaid](https://img.shields.io/badge/Diagrams-Mermaid.js-ff3670)](https://mermaid.js.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<br />

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-the-problem-we-solve">The Problem We Solve</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-component-usage">Component Usage</a> •
  <a href="#-automated-release-controller">Release Controller</a> •
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

## 🌟 Overview

Rendering Markdown in Right-to-Left languages (**Persian, Arabic, Urdu, Hebrew**) traditionally breaks in critical ways: LaTeX mathematical formulas invert, square roots flip backwards, punctuation around inline code jumps to opposite margins, and SVG diagrams render illegibly.

**RTL Markdown Studio** provides a production-ready solution featuring strict bidirectional (`BiDi`) isolation, hardware-accelerated KaTeX rendering, isolated SVG diagram canvases, and a modern split-pane studio.

---

## 🚀 Key Features

- **📐 Strict $\LaTeX$ Math Isolation**: Inline formulas (`$E = mc^2$`) and display equations ($\int, \sum, \frac{a}{b}$, matrices) retain exact Left-to-Right orientation without disturbing RTL sentence structure.
- **📊 Native Mermaid.js Diagrams**: Interactive flowchart, sequence, and state diagrams rendered as responsive SVGs in an isolated LTR viewport while preserving RTL font shaping inside node labels.
- **💻 BiDi-Isolated Code Blocks**: Monospace syntax blocks with language badges, copy-to-clipboard functionality, and inline code pills that never drag trailing punctuation.
- **⚡ Next.js 16 + React 19 + Tailwind CSS**: Zero runtime layout shift, blazing fast server/client architecture, and CSS logical properties (`border-inline-start`, `padding-inline-start`).
- **🎛️ Interactive Split-View Studio**: Real-time side-by-side editing and rendering, quick-insert math & diagram toolbar, instant layout toggles (RTL/LTR), and markdown exporter.
- **🏷️ Automated Version Controller**: Fully automated semantic releases, changelog generation, and git tagging via `pnpm release`.

---

## 🔍 The Problem We Solve

| Element | Standard Markdown Renderers | RTL Markdown Studio |
| :--- | :--- | :--- |
| **Inline Formulas** | Trailing dots, minus signs, and brackets jump to the right side of Persian/Arabic sentences ($5 - x$ becomes $x - 5$). | Wrapped in strict `unicode-bidi: isolate; direction: ltr;`. Punctuation remains intact. |
| **Display Equations** | Fractions and matrices flip column order or misalign roots. | Isolated centered display container with strict LTR math context. |
| **Mermaid Charts** | Arrows and layouts invert or clip text labels. | Rendered in an isolated canvas with localized node text shaping. |
| **Blockquotes** | Left border appears on the wrong side. | Built using CSS logical properties (`border-inline-start`). |

---

## 🛠️ Quick Start

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v10.0.0` or higher (or `bun` / `npm`)

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/MohsnRaj/RtlMarkdown.git
cd RtlMarkdown

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev
```

Visit `http://localhost:3000` to access the live studio.

---

## 🧩 Component Usage

You can embed the core renderer into any existing Next.js or React page:

```tsx
import RtlMarkdown from '@/components/RtlMarkdown';

export default function DocumentPage() {
  const content = `
# تحلیل مدل‌های یادگیری عمیق

معادله هزینه مورد استفاده به صورت زیر است:

$$J(\\theta) = -\\frac{1}{m} \\sum_{i=1}^m \\left[ y^{(i)} \\log(h_\\theta(x^{(i)})) + (1 - y^{(i)}) \\log(1 - h_\\theta(x^{(i)})) \\right]$$

\`\`\`mermaid
flowchart TD
    A[ورودی داده] --> B[لایه پنهان]
    B --> C[تابع فعال‌سازی Softmax]
    C --> D[خروجی نهایی]
\`\`\`
  `;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <RtlMarkdown content={content} direction="rtl" />
    </div>
  );
}
```

---

## 📦 Automated Release Controller

This repository includes a dedicated release and version controller that validates your build, updates `package.json`, generates `CHANGELOG.md`, creates a release commit, and tags the git tree.

```bash
# Automated patch release (e.g. v1.0.0 -> v1.0.1)
pnpm release:patch

# Automated minor release (e.g. v1.0.0 -> v1.1.0)
pnpm release:minor

# Automated major release (e.g. v1.0.0 -> v2.0.0)
pnpm release:major

# Interactive release prompt
pnpm release
```

Then push your release and tags to GitHub:
```bash
git push origin main --tags
```

---

## 📂 Project Structure

```
├── .github/
│   └── workflows/
│       ├── ci.yml              # Continuous integration (typecheck & build)
│       └── release.yml         # Automated GitHub Releases on tag push
├── scripts/
│   └── release.mjs             # Semantic version controller & release engine
├── src/
│   ├── app/
│   │   ├── globals.css         # KaTeX imports & BiDi isolation rules
│   │   ├── layout.tsx          # Root layout & typography
│   │   └── page.tsx            # Split-pane Studio with live preview
│   └── components/
│       ├── MermaidChart.tsx    # Isolated SVG diagram engine
│       └── RtlMarkdown.tsx     # Core Markdown + KaTeX + GFM renderer
├── CHANGELOG.md                # Generated release history
├── CONTRIBUTING.md             # Contribution & commit guidelines
├── package.json
└── tsconfig.json
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Check out the [Contributing Guidelines](CONTRIBUTING.md) to get started.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).  
Copyright © 2026 **Mohsen Rajabpour ([@MohsnRaj](https://github.com/MohsnRaj))**.

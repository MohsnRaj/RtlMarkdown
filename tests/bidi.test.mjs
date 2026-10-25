import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

import {
  detectDirection,
  getFirstStrongDirection,
  isPredominantlyLtr,
  isPredominantlyRtl,
  isLtrLine,
  isLtrBlock,
  tokenizeBiDiText,
  normalizeMathDelimiters,
  rehypeBidi,
} from './dist/bidi.js';

/**
 * Test renderer reproducing the RtlMarkdown component pipeline.
 */
function renderMarkdown(content, direction = 'rtl') {
  const normalized = normalizeMathDelimiters(content);
  return renderToStaticMarkup(
    React.createElement(
      'div',
      { dir: direction, className: 'rtl-markdown-prose' },
      React.createElement(
        ReactMarkdown,
        {
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [
            rehypeRaw,
            [rehypeBidi, { baseDirection: direction }],
            [
              rehypeKatex,
              {
                output: 'htmlAndMathml',
                strict: false,
                throwOnError: false,
              },
            ],
          ],
          components: {
            h1: ({ children, className: elemClassName = '', dir, ...props }) =>
              React.createElement('h1', { dir, className: `text-2xl ${elemClassName}`, ...props }, children),
            h2: ({ children, className: elemClassName = '', dir, ...props }) =>
              React.createElement('h2', { dir, className: `text-xl ${elemClassName}`, ...props }, children),
            p: ({ children, className: elemClassName = '', dir, ...props }) =>
              React.createElement('p', { dir, className: `my-3 ${elemClassName}`, ...props }, children),
            blockquote: ({ children, className: elemClassName = '', dir, ...props }) =>
              React.createElement('blockquote', { dir, className: `border-s-4 ${elemClassName}`, ...props }, children),
            ul: ({ children, className: elemClassName = '', dir, ...props }) =>
              React.createElement('ul', { dir, className: `my-3 list-disc ps-6 ${elemClassName}`.trim(), ...props }, children),
            ol: ({ children, className: elemClassName = '', dir, ...props }) =>
              React.createElement('ol', { dir, className: `my-3 list-decimal ps-6 ${elemClassName}`.trim(), ...props }, children),
            li: ({ children, className: elemClassName = '', dir, ...props }) =>
              React.createElement('li', { dir, className: elemClassName, ...props }, children),
            table: ({ children, className: elemClassName = '', ...props }) =>
              React.createElement(
                'div',
                { className: 'my-6 w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800' },
                React.createElement(
                  'table',
                  { className: `min-w-full w-max border-collapse text-start text-sm ${elemClassName}`, ...props },
                  children
                )
              ),
            th: ({ children, className: elemClassName = '', ...props }) =>
              React.createElement(
                'th',
                { className: `whitespace-nowrap px-4 py-2.5 font-semibold text-neutral-900 dark:text-neutral-100 ${elemClassName}`, ...props },
                children
              ),
            td: ({ children, className: elemClassName = '', ...props }) =>
              React.createElement(
                'td',
                { className: `whitespace-nowrap border-b border-neutral-100 px-4 py-2.5 text-neutral-700 last:border-0 dark:border-neutral-800/60 dark:text-neutral-300 ${elemClassName}`, ...props },
                children
              ),
            bdi: ({ children, className: elemClassName = '', dir = 'ltr', ...props }) => {
              const classes = elemClassName.includes('bidi-ltr-isolate')
                ? elemClassName
                : `bidi-ltr-isolate ${elemClassName}`.trim();
              return React.createElement('bdi', { dir, className: classes, ...props }, children);
            },
          },
        },
        normalized
      )
    )
  );
}

describe('BiDi Utility Engine Tests', () => {
  describe('detectDirection & script analysis', () => {
    it('correctly identifies pure Persian / Arabic text as RTL', () => {
      assert.equal(detectDirection('این یک متن تست کاملا فارسی است.'), 'rtl');
      assert.equal(detectDirection('مستندات سیستم و کتابخانه جدید'), 'rtl');
    });

    it('correctly identifies pure English text as LTR', () => {
      assert.equal(detectDirection('This is a completely English sentence.'), 'ltr');
      assert.equal(detectDirection('High performance zero latency architecture'), 'ltr');
    });

    it('returns neutral for numbers and punctuation only', () => {
      assert.equal(detectDirection('1234567890'), 'neutral');
      assert.equal(detectDirection('--- !!! ??? ...'), 'neutral');
    });

    it('identifies predominantly Persian text as RTL even with an English word', () => {
      assert.equal(detectDirection('توضیحات کوتاه درباره React و نحوه استفاده'), 'rtl');
      assert.equal(isPredominantlyRtl('توضیحات کوتاه درباره React و نحوه استفاده'), true);
      assert.equal(isPredominantlyLtr('توضیحات کوتاه درباره React و نحوه استفاده'), false);
    });

    it('identifies predominantly English text as LTR even with a Persian word', () => {
      assert.equal(detectDirection('React is a declarative library for building user interfaces (توسعه وب)'), 'ltr');
      assert.equal(isPredominantlyLtr('React is a declarative library for building user interfaces (توسعه وب)'), true);
    });

    it('identifies mixed Persian questions starting with English technical terms as RTL', () => {
      assert.equal(detectDirection('feature چیست؟'), 'rtl');
      assert.equal(isPredominantlyRtl('feature چیست؟'), true);
      assert.equal(isPredominantlyLtr('feature چیست؟'), false);

      assert.equal(detectDirection('Docker چیست؟'), 'rtl');
      assert.equal(detectDirection('Overfitting چیست؟'), 'rtl');
      assert.equal(detectDirection('Convolutional Neural Network چیست؟'), 'rtl');
      assert.equal(detectDirection('Generative Pre-trained Transformer چیست؟'), 'rtl');
    });
  });

  describe('getFirstStrongDirection', () => {
    it('ignores emojis and whitespace to find RTL direction', () => {
      assert.equal(getFirstStrongDirection('💡 نکته: این یک متن است'), 'rtl');
      assert.equal(getFirstStrongDirection('   ⚡ عملیات موفق بود'), 'rtl');
      assert.equal(getFirstStrongDirection('1. مرحله اول شروع شد'), 'rtl');
    });

    it('ignores numbers, symbols, and whitespace to find LTR direction', () => {
      assert.equal(getFirstStrongDirection('💡 Note: This is an important rule'), 'ltr');
      assert.equal(getFirstStrongDirection('1. First step in the setup process'), 'ltr');
      assert.equal(getFirstStrongDirection('   [API] Authentication endpoint'), 'ltr');
    });
  });

  describe('isLtrLine (Sentence and Line Detection)', () => {
    it('detects standalone English sentence lines', () => {
      assert.equal(isLtrLine('The quick brown fox jumps over the lazy dog.'), true);
      assert.equal(isLtrLine('Error 404: Page not found! Please check URL.'), true);
      assert.equal(isLtrLine('Run `pnpm test` before submitting changes.'), true);
    });

    it('rejects Persian or mixed lines', () => {
      assert.equal(isLtrLine('این یک خط فارسی است.'), false);
      assert.equal(isLtrLine('دستور pnpm test را اجرا کنید.'), false);
      assert.equal(isLtrLine('   '), false);
      assert.equal(isLtrLine(''), false);
    });
  });

  describe('isLtrBlock (Block direction analysis)', () => {
    it('identifies pure Latin, numeric, and technical content as LTR block', () => {
      assert.equal(isLtrBlock('MLP-6: 93.84% / 50.20%'), true);
      assert.equal(isLtrBlock('93.84% / 50.20%'), true);
      assert.equal(isLtrBlock('Accuracy: 95.44% | Loss: 0.002'), true);
      assert.equal(isLtrBlock('192.168.1.1:8080'), true);
    });

    it('identifies Persian blocks as not LTR', () => {
      assert.equal(isLtrBlock('این یک پاراگراف کاملا فارسی است.'), false);
      assert.equal(isLtrBlock('feature چیست؟'), false);
      assert.equal(isLtrBlock('مورد اول در لیست'), false);
    });

    it('identifies predominantly English blocks with secondary Persian gloss as LTR', () => {
      assert.equal(isLtrBlock('React is a declarative library (توسعه وب)'), true);
    });
  });

  describe('tokenizeBiDiText (Sentence segmentation & punctuation isolation)', () => {
    it('segments mixed Persian with inline English sentence preserving trailing punctuation', () => {
      const input = 'این یک متن نمونه است. The quick brown fox jumps over the lazy dog. و این بخش بعدی متن است.';
      const tokens = tokenizeBiDiText(input);

      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'rtl');
      assert.equal(tokens[0].text, 'این یک متن نمونه است. ');

      assert.equal(tokens[1].type, 'ltr');
      assert.equal(tokens[1].text, 'The quick brown fox jumps over the lazy dog.');

      assert.equal(tokens[2].type, 'rtl');
      assert.equal(tokens[2].text, ' و این بخش بعدی متن است.');
    });

    it('isolates English technical error with parenthesis and codes', () => {
      const input = 'خطای زیر رخ داد: Error: Connection timeout (code: ETIMEDOUT). لطفاً دوباره تلاش کنید.';
      const tokens = tokenizeBiDiText(input);

      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'rtl');
      assert.equal(tokens[0].text, 'خطای زیر رخ داد: ');

      assert.equal(tokens[1].type, 'ltr');
      assert.equal(tokens[1].text, 'Error: Connection timeout (code: ETIMEDOUT).');

      assert.equal(tokens[2].type, 'rtl');
      assert.equal(tokens[2].text, ' لطفاً دوباره تلاش کنید.');
    });

    it('handles English sentence at the very beginning of the string', () => {
      const input = 'Welcome to our platform! به پلتفرم ما خوش آمدید.';
      const tokens = tokenizeBiDiText(input);

      assert.equal(tokens.length, 2);
      assert.equal(tokens[0].type, 'ltr');
      assert.equal(tokens[0].text, 'Welcome to our platform!');
      assert.equal(tokens[1].type, 'rtl');
      assert.equal(tokens[1].text, ' به پلتفرم ما خوش آمدید.');
    });

    it('handles English sentence at the very end of the string', () => {
      const input = 'به پلتفرم ما خوش آمدید. Welcome to our platform!';
      const tokens = tokenizeBiDiText(input);

      assert.equal(tokens.length, 2);
      assert.equal(tokens[0].type, 'rtl');
      assert.equal(tokens[0].text, 'به پلتفرم ما خوش آمدید. ');
      assert.equal(tokens[1].type, 'ltr');
      assert.equal(tokens[1].text, 'Welcome to our platform!');
    });

    it('isolates parenthesized English notes cleanly', () => {
      const input = 'متن فارسی (Special English Note) ادامه فارسی';
      const tokens = tokenizeBiDiText(input);

      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'rtl');
      assert.equal(tokens[0].text, 'متن فارسی ');
      assert.equal(tokens[1].type, 'ltr');
      assert.equal(tokens[1].text, '(Special English Note)');
      assert.equal(tokens[2].type, 'rtl');
      assert.equal(tokens[2].text, ' ادامه فارسی');
    });

    it('returns single token for pure text', () => {
      const farsiTokens = tokenizeBiDiText('متن کاملا فارسی بدون کلمات انگلیسی');
      assert.equal(farsiTokens.length, 1);
      assert.equal(farsiTokens[0].type, 'rtl');

      const engTokens = tokenizeBiDiText('Fully English text without any foreign script.');
      assert.equal(engTokens.length, 1);
      assert.equal(engTokens[0].type, 'ltr');
    });

    it('excludes trailing opening delimiter before Persian text to prevent parenthesis tearing', () => {
      const input = '۱. وضعیت کلی اتصال HLS (چه بخشهایی درست کار میکنند؟)';
      const tokens = tokenizeBiDiText(input);

      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'rtl');
      assert.equal(tokens[0].text, '۱. وضعیت کلی اتصال ');
      assert.equal(tokens[1].type, 'ltr');
      assert.equal(tokens[1].text, 'HLS');
      assert.equal(tokens[2].type, 'rtl');
      assert.equal(tokens[2].text, ' (چه بخشهایی درست کار میکنند؟)');
    });

    it('excludes trailing colon from parenthesized gloss to preserve list item punctuation', () => {
      const input = 'پخش استریم ویدیوی دانشجو (Student Playback):';
      const tokens = tokenizeBiDiText(input);

      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'rtl');
      assert.equal(tokens[0].text, 'پخش استریم ویدیوی دانشجو ');
      assert.equal(tokens[1].type, 'ltr');
      assert.equal(tokens[1].text, '(Student Playback)');
      assert.equal(tokens[2].type, 'rtl');
      assert.equal(tokens[2].text, ':');
    });

    it('excludes trailing colon from inline English term to prevent colon flip', () => {
      const input = 'گزینه Method: مقدار POST را انتخاب کنید';
      const tokens = tokenizeBiDiText(input);

      assert.equal(tokens[1].text, 'Method');
      assert.equal(tokens[2].text, ': مقدار ');
      assert.equal(tokens[3].text, 'POST');
    });
  });

  describe('normalizeMathDelimiters (LaTeX math delimiter normalization)', () => {
    it('normalizes LaTeX display math \\[ ... \\] to $$ ... $$', () => {
      const input = 'فرمول زیر برقرار است:\n\n\\[\nx_1,\\ x_2,\\ x_3\n\\]\n\nو ادامه متن.';
      const output = normalizeMathDelimiters(input);

      assert.match(output, /\$\$\nx_1,\\ x_2,\\ x_3\n\$\$/);
      assert.doesNotMatch(output, /\\\[/);
      assert.doesNotMatch(output, /\\\]/);
    });

    it('normalizes single-line LaTeX display math \\[ ... \\] to $$ ... $$', () => {
      const input = 'معادله: \\[ h_t = f(x_t, h_{t-1}) \\] در مدل بازگشتی.';
      const output = normalizeMathDelimiters(input);

      assert.match(output, /\$\$\nh_t = f\(x_t, h_\{t-1\}\)\n\$\$/);
    });

    it('normalizes inline LaTeX math \\( ... \\) to $ ... $', () => {
      const input = 'اینجا \\(h_1,h_2,h_3\\) همان حالت‌ها هستند و زمان \\(t\\) است.';
      const output = normalizeMathDelimiters(input);

      assert.equal(output, 'اینجا $h_1,h_2,h_3$ همان حالت‌ها هستند و زمان $t$ است.');
    });

    it('handles nested parentheses inside inline math \\(f(x, g(y))\\)', () => {
      const input = 'تابع \\(f(x, g(y))\\) محاسبه می‌شود.';
      const output = normalizeMathDelimiters(input);

      assert.equal(output, 'تابع $f(x, g(y))$ محاسبه می‌شود.');
    });

    it('preserves code blocks containing \\[ or \\(', () => {
      const input = '```python\n# not math:\na = \\[1, 2\\]\nprint(\\(x\\))\n```\nOutside: \\(y\\)';
      const output = normalizeMathDelimiters(input);

      assert.match(output, /```python\n# not math:\na = \\\[1, 2\\\]\nprint\(\\\(x\\\)\)\n```/);
      assert.match(output, /Outside: \$y\$/);
    });

    it('preserves inline code spans containing math-like delimiters', () => {
      const input = 'از دستور `\\[not math\\]` و `\\(inline\\)` استفاده کنید. اما \\[math\\] تبدیل شود.';
      const output = normalizeMathDelimiters(input);

      assert.match(output, /`\\\[not math\\\]`/);
      assert.match(output, /`\\\(inline\\\)`/);
      assert.match(output, /\$\$\nmath\n\$\$/);
    });

    it('preserves existing $$ and $ math blocks without double converting', () => {
      const input = '$$E = mc^2$$ و فرمول $a + b$ و \\[x_1\\]';
      const output = normalizeMathDelimiters(input);

      assert.match(output, /\$\$E = mc\^2\$\$/);
      assert.match(output, /\$a \+ b\$/);
      assert.match(output, /\$\$\nx_1\n\$\$/);
    });

    it('normalizes double-backslash LaTeX display math \\\\[ ... \\\\] with array indexing', () => {
      const input = 'سری تأخیر:\n\n\\\\[ x(t)=[x_0,x_1,\\ldots,x_m] \\\\]\n\nنمونه‌ها:\n\n\\\\[ C(t)=x(t)[1:-1] \\\\]';
      const output = normalizeMathDelimiters(input);

      assert.match(output, /\$\$\nx\(t\)=\[x_0,x_1,\\ldots,x_m\]\n\$\$/);
      assert.match(output, /\$\$\nC\(t\)=x\(t\)\[1:-1\]\n\$\$/);
      assert.doesNotMatch(output, /\\\[/);
      assert.doesNotMatch(output, /\\\]/);
    });

    it('normalizes double-backslash inline LaTeX math \\\\( ... \\\\)', () => {
      const input = 'با فرض \\\\(\\beta=0.95\\\\) و \\\\(\\rho_1=0\\\\) و آستانه \\\\(T=1\\\\) میلی‌ثانیه.';
      const output = normalizeMathDelimiters(input);

      assert.equal(output, 'با فرض $\\beta=0.95$ و $\\rho_1=0$ و آستانه $T=1$ میلی‌ثانیه.');
    });

    it('un-escapes markdown escaped underscores \\_ inside math formulas into proper subscripts', () => {
      const input = '\\\\[ M(t)=\\sum\\_{d\\in C(t)}d \\\\] و \\\\[ R=2500E\\_{\\max}+8000+2500 \\\\]';
      const output = normalizeMathDelimiters(input);

      assert.match(output, /\$\$\nM\(t\)=\\sum_\{d\\in C\(t\)\}d\n\$\$/);
      assert.match(output, /\$\$\nR=2500E_\{\\max\}\+8000\+2500\n\$\$/);
      assert.doesNotMatch(output, /\\_/);
    });
  });
});

describe('RtlMarkdown BiDi Rendering Tests', () => {
  it('aligns Persian GFM table cells by their content despite left alignment markers', () => {
    const md = `| بخش چکیده | ترجمه و محتوا | هدف و تطبیق با درخواست |
| :--- | :--- | :--- |
| **شواهد عددی در لود ۵۰ ($N=50$)** | در لود سنگین ۵۰ نود:<br>• ترشهولد $0.5\\text{ ms}$ ← تاخیر میانگین **$0.4718\\text{ ms}$** | ارائه مثال ملموس و دقیق |`;
    const html = renderMarkdown(md);

    for (const cell of html.match(/<(?:th|td)\b[^>]*>/g) || []) {
      assert.match(cell, /dir="rtl"/);
      assert.match(cell, /class="[^"]*bidi-rtl-block[^"]*"/);
      assert.doesNotMatch(cell, /text-align:left|align="left"/);
    }
    assert.equal((html.match(/<th\b/g) || []).length, 3);
    assert.equal((html.match(/<td\b/g) || []).length, 3);
    assert.match(html, /class="katex"/);
  });

  it('keeps English table cells LTR and preserves explicit centered columns', () => {
    const md = `| توضیح | English notes | وضعیت |
| :--- | :--- | :---: |
| متن فارسی با Wi-Fi | A complete English sentence. | آماده |`;
    const html = renderMarkdown(md);
    const headers = html.match(/<th\b[^>]*>/g) || [];
    const cells = html.match(/<td\b[^>]*>/g) || [];

    assert.match(headers[0], /dir="rtl"/);
    assert.match(headers[1], /dir="ltr"/);
    assert.match(cells[0], /dir="rtl"/);
    assert.match(cells[1], /dir="ltr"/);
    assert.match(cells[1], /class="[^"]*bidi-ltr-block[^"]*"/);
    assert.match(headers[2], /text-align:center/);
    assert.match(cells[2], /text-align:center/);
  });

  it('renders wide tables inside an overflow-x-auto container with min-w-full w-max and whitespace-nowrap', () => {
    const md = `| بودجه و بار شبکه | روش (Method) | میانگین تاخیر PC1 (ms) | صدک ۹۵ ($p95$) | صدک ۹۹ ($p99$) | شاخص عدالت دوگروهی ($J$) | سهم اشغال کانال (%) <br> PC1 / PC3 / Wi-Fi | موفقیت Wi-Fi <br> (تعداد / بیشترین وقفه) | ارضای قید (Feasible) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **$D_{\\rm th} = 1.0$ ms, $N=20$** | **Supervised CA (Proposed)** | $0.946 \\pm 0.001$ | $8.08$ | $16.06$ | $\\mathbf{0.680 \\pm 0.007}$ | $67.8$ / $18.4$ / $6.0$ | $149$ / $0.66$ s | **Yes** |`;
    const html = renderMarkdown(md);

    assert.match(html, /<div class="[^"]*overflow-x-auto[^"]*"/);
    assert.match(html, /<table class="[^"]*min-w-full[^"]*w-max[^"]*"/);
    const headers = html.match(/<th\b[^>]*>/g) || [];
    const cells = html.match(/<td\b[^>]*>/g) || [];
    assert.equal(headers.length, 9);
    assert.equal(cells.length, 9);
    for (const h of headers) {
      assert.match(h, /class="[^"]*whitespace-nowrap[^"]*"/);
    }
    for (const c of cells) {
      assert.match(c, /class="[^"]*whitespace-nowrap[^"]*"/);
    }
  });

  it('renders pure English paragraphs as left-aligned LTR blocks', () => {
    const md = 'This is a standalone English paragraph that must be left aligned.';
    const html = renderMarkdown(md);

    assert.match(html, /<p[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"/);
    assert.match(html, /This is a standalone English paragraph/);
  });

  it('renders Persian paragraphs as RTL blocks', () => {
    const md = 'این یک پاراگراف به زبان فارسی است.';
    const html = renderMarkdown(md);

    assert.match(html, /<p[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"/);
    assert.match(html, /این یک پاراگراف به زبان فارسی است\./);
  });

  it('renders English headings with LTR direction and bidi-ltr-block', () => {
    const md = '## Quick Start & Installation Guide';
    const html = renderMarkdown(md);

    assert.match(html, /<h2[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"/);
  });

  it('renders Persian headings with RTL direction and bidi-rtl-block', () => {
    const md = '# راهنمای جامع سیستم';
    const html = renderMarkdown(md);

    assert.match(html, /<h1[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"/);
  });

  it('renders Persian headings starting with an English technical term as RTL with isolated inline term', () => {
    const md = '### feature چیست؟';
    const html = renderMarkdown(md);

    assert.match(html, /<h3[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"/);
    assert.match(html, /<bdi[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-isolate[^"]*"[^>]*>feature<\/bdi>/);
    assert.match(html, /چیست؟/);
  });

  it('renders English list items as LTR blocks and Persian as RTL blocks', () => {
    const md = `- مورد اول در لیست به فارسی\n- Step 2: Run npm install\n- مورد سوم به فارسی`;
    const html = renderMarkdown(md);

    // List container for mixed content is RTL
    assert.match(html, /<ul[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"/);

    // Persian list items
    assert.match(html, /<li[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"[^>]*>مورد اول/);
    assert.match(html, /<li[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"[^>]*>مورد سوم/);

    // English list item
    assert.match(html, /<li[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"[^>]*>Step 2/);
  });

  it('renders pure English and metric lists with LTR direction on both ul and li', () => {
    const md = `- MLP-6: 93.84% / 50.20%\n- MLP-67: 91.27% / 73.02%\n- LSTM-6: 97.22% / 25.97%`;
    const html = renderMarkdown(md);

    assert.match(html, /<ul[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"/);
    assert.match(html, /<li[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"[^>]*>MLP-6: 93\.84% \/ 50\.20%/);
    assert.match(html, /<li[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"[^>]*>MLP-67: 91\.27% \/ 73\.02%/);
  });

  it('renders pure numeric and percentage lists with LTR direction on both ul and li', () => {
    const md = `- 93.84% / 50.20%\n- 91.27% / 73.02%`;
    const html = renderMarkdown(md);

    assert.match(html, /<ul[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"/);
    assert.match(html, /<li[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"[^>]*>93\.84% \/ 50\.20%/);
  });

  it('renders English blockquotes with dir="ltr" and bidi-ltr-block', () => {
    const md = `> Warning: This operation is permanent and irreversible.`;
    const html = renderMarkdown(md);

    assert.match(html, /<blockquote[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"/);
  });

  it('renders standalone English lines within a multi-line paragraph as bidi-ltr-line blocks', () => {
    const md = `توضیحات فرآیند:\nThe system listens on port 3000 by default.\nسپس مرورگر را باز کنید.`;
    const html = renderMarkdown(md);

    assert.match(html, /<span[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-line[^"]*"[^>]*>The system listens on port 3000 by default\.<\/span>/);
  });

  it('isolates inline English sentences with <bdi> to prevent punctuation flip', () => {
    const md = `این یک متن تست است. The quick brown fox jumps over the lazy dog. و این ادامه متن است.`;
    const html = renderMarkdown(md);

    assert.match(html, /<bdi[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-isolate[^"]*"[^>]*>The quick brown fox jumps over the lazy dog\.<\/bdi>/);
  });

  it('handles English sentence ending with question mark or exclamation mark', () => {
    const md = `آیا مطمئن هستید؟ Does this system support zero latency? بله، کاملا تایید شده است!`;
    const html = renderMarkdown(md);

    assert.match(html, /<bdi[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-isolate[^"]*"[^>]*>Does this system support zero latency\?<\/bdi>/);
  });

  it('handles multiple English sentences back-to-back inside Persian text', () => {
    const md = `بخش نخست. First sentence here. Second sentence follows. بخش پایانی.`;
    const html = renderMarkdown(md);

    assert.match(html, /<bdi[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-isolate[^"]*"[^>]*>First sentence here\. Second sentence follows\.<\/bdi>/);
  });

  it('isolates English version bump with symbols and code packages', () => {
    const md = `نسخه جدید رسید. You can upgrade with pnpm update rtl-markdown@1.2.3 easily. تغییرات را بررسی فرمایید.`;
    const html = renderMarkdown(md);

    assert.match(html, /<bdi[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-isolate[^"]*"[^>]*>You can upgrade with pnpm update rtl-markdown@1\.2\.3 easily\.<\/bdi>/);
  });

  it('renders mixed Persian headings followed by parenthesized question with clean parenthesis isolation', () => {
    const md = '### ۱. وضعیت کلی اتصال HLS (چه بخشهایی درست کار میکنند؟)';
    const html = renderMarkdown(md);

    assert.match(html, /<h3[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"/);
    assert.match(html, /<bdi[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-isolate[^"]*"[^>]*>HLS<\/bdi>/);
    assert.match(html, /\(چه بخشهایی درست کار میکنند؟\)/);
  });

  it('renders list items with bold Persian title and parenthesized English gloss followed by colon cleanly', () => {
    const md = '1. **پخش استریم ویدیوی دانشجو (Student Playback):**';
    const html = renderMarkdown(md);

    assert.match(html, /<bdi[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-isolate[^"]*"[^>]*>\(Student Playback\)<\/bdi>:/);
  });

  it('renders English ordered lists with LTR direction', () => {
    const md = `1. Step One: Clone the repository\n2. Step Two: Run the build\n3. Step Three: Deploy to production`;
    const html = renderMarkdown(md);

    assert.match(html, /<li[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"[^>]*>Step One/);
    assert.match(html, /<li[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"[^>]*>Step Two/);
    assert.match(html, /<li[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"[^>]*>Step Three/);
  });

  it('preserves KaTeX equations with strict isolation and does not mangle them', () => {
    const md = `معادله معروف اینشتین برابر است با $E = mc^2$ در فیزیک نسبیت.`;
    const html = renderMarkdown(md);

    assert.match(html, /class="katex"/);
    assert.match(html, /annotation encoding="application\/x-tex">E = mc\^2<\/annotation>/);
  });

  it('handles KaTeX inline equation immediately followed by an English sentence', () => {
    const md = `رابطه انرژی $E = mc^2$ برقرار است. The speed of light is constant in all inertial frames. این مبنای نسبیت خاص است.`;
    const html = renderMarkdown(md);

    assert.match(html, /class="katex"/);
    assert.match(html, /<bdi[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-isolate[^"]*"[^>]*>The speed of light is constant in all inertial frames\.<\/bdi>/);
  });

  it('renders LaTeX display math equations with \\[ ... \\] as isolated KaTeX display blocks', () => {
    const md = `معادله بردار حالت:\n\n\\[\nx_1,\\ x_2,\\ x_3\n\\]\n\nمحاسبه شد.`;
    const html = renderMarkdown(md);

    assert.match(html, /<span[^>]*class="katex-display"/);
    assert.match(html, /annotation encoding="application\/x-tex">x_1,\\ x_2,\\ x_3<\/annotation>/);
    assert.doesNotMatch(html, /\[ x_1/);
  });

  it('renders LaTeX inline math equations with \\( ... \\) and isolates them cleanly', () => {
    const md = `اینجا \\(h_1,h_2,h_3\\) همان حالت‌های پنهان هستند.`;
    const html = renderMarkdown(md);

    assert.match(html, /<span[^>]*class="katex"/);
    assert.match(html, /annotation encoding="application\/x-tex">h_1,h_2,h_3<\/annotation>/);
    assert.doesNotMatch(html, /\(h_1,h_2,h_3\)/);
  });

  it('renders equations containing Persian text inside \\text{...}', () => {
    const md = `\\[\n\\text{Recurrence} = \\text{استفاده دوباره از اطلاعات قبلی}\n\\]`;
    const html = renderMarkdown(md);

    assert.match(html, /<span[^>]*class="katex-display"/);
    assert.match(html, /Recurrence/);
    assert.match(html, /استفاده/);
  });

  it('renders complex neural network and VoIP markdown with 100% equation isolation and zero raw brackets', () => {
    const userMarkdown = `فرقشان این است که **recurrence یک سازوکار/نوع معماری است، اما hidden state چیزی است که این معماری در طول زمان نگه میدارد.**

خیلی ساده:

- **Recurrence** یعنی مدل اجازه دارد اطلاعات مرحلهٔ قبلی را وارد محاسبهٔ مرحلهٔ فعلی کند.
- **Hidden state** همان اطلاعات فشردهای است که از مرحلهٔ قبلی منتقل میشود.

مثلاً تصور کن سه flow پشت سر هم داریم:

\\[
x_1,\\ x_2,\\ x_3
\\]

در یک مدل recurrent:

\\[
x_1 \\rightarrow h_1
\\]

بعد:

\\[
x_2 + h_1 \\rightarrow h_2
\\]

بعد:

\\[
x_3 + h_2 \\rightarrow h_3
\\]

اینجا \\(h_1,h_2,h_3\\) همان **hidden state**ها هستند.

اما خود این چرخه که:

\\[
h_{t-1} \\rightarrow \\text{مرحله بعد}
\\]

دوباره به شبکه برمیگردد، همان **recurrence** است.

پس:

\\[
\\text{Recurrence} = \\text{استفاده دوباره از اطلاعات قبلی}
\\]

و:

\\[
\\text{Hidden State} = \\text{خلاصهٔ عددی اطلاعات قبلی}
\\]

در مدل شما مثلاً در زمان \\(t\\):

\\[
h_t=f(x_t,h_{t-1})
\\]

این فرمول خودش خیلی واضح تفاوت را نشان میدهد.

\\(h_{t-1}\\) همان **hidden state قبلی** است.

ولی اینکه مدل اصلاً \\(h_{t-1}\\) را دوباره وارد محاسبهٔ مرحلهٔ بعد میکند، همان **recurrence** است.

پس میتوانیم بگوییم:

\\[
\\boxed{\\text{Recurrence is the mechanism}}
\\]

و:

\\[
\\boxed{\\text{Hidden state is the memory carried by that mechanism}}
\\]

مثلاً در LSTM، recurrence وجود دارد و مدل چند نوع state دارد، از جمله hidden state و cell state.

اگر recurrence را حذف کنیم، مدل تقریباً اینطوری میشود:

\\[
x_t \\rightarrow \\text{prediction}
\\]

ولی اگر recurrence داشته باشیم:

\\[
x_t + h_{t-1} \\rightarrow \\text{prediction}
\\]

یعنی تفاوت اصلی همین \\(h_{t-1}\\) است که از گذشته آمده و دوباره استفاده میشود.

در پروژهٔ VoIP شما، خیلی ساده:

\\[
\\text{Flow فعلی} + \\text{خلاصهای از Flowهای قبلی}
\\rightarrow
\\text{تصمیم VoIP / non-VoIP}
\\]

آن «خلاصهٔ flowهای قبلی» = **hidden state**

و آن «انتقال این خلاصه از یک flow به flow بعدی» = **recurrence**.`;

    const html = renderMarkdown(userMarkdown);

    // Verify all 13 display equations rendered into katex-display
    const displayMatches = html.match(/class="katex-display"/g) || [];
    assert.equal(displayMatches.length, 13);

    // Verify all inline equations rendered into katex
    const totalKatexMatches = html.match(/class="katex"/g) || [];
    assert.equal(totalKatexMatches.length, 18); // 13 display + 5 inline

    // Verify no unrendered raw LaTeX brackets remain in paragraphs
    assert.doesNotMatch(html, /<p[^>]*>\[/);
    assert.doesNotMatch(html, /\\\[/);
    assert.doesNotMatch(html, /\\\]/);

    // Verify Persian text surrounding formulas has dir="rtl" and bidi-rtl-block
    assert.match(html, /<p[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"[^>]*>فرقشان این است/);
  });

  it('renders complex Supervised CA document with double-backslash math, tables, and subscript isolation', () => {
    const doc = `یک نکتهٔ مهم: در سند، خانوادهٔ تأییدشدهٔ جدید برای آستانههای ۰٫۵، ۱ و ۲ میلیثانیه از \\\\(\\beta=0.95\\\\)، حداکثر ۸ ایپاک و \\\\(\\rho_1=0\\\\) استفاده میکند.

# سه شرط اصلی آزادسازی در Supervised CA

هدف کنترلکننده این است که در صورت وجود شرایط مناسب، با افزایش CW نود PC1 و تغییر CW کلاس پسزمینه، به Wi-Fi یا PC3 فرصت بیشتری برای رقابت بر سر کانال بدهد.

## شرط اول: بانک تأخیر (Delay Bank)

### فرمولهای کامل

ابتدا سری رسمی تأخیر PC1 را داریم:

\\\\[ x(t)=[x_0,x_1,\\ldots,x_m] \\\\]

نمونههای تکمیلشده:

\\\\[ C(t)=x(t)[1:-1] \\\\]

سپس:

\\\\[ n(t)=|C(t)| \\\\]

\\\\[ M(t)=\\sum\\_{d\\in C(t)}d \\\\]

\\\\[ q(t)=x(t)[-1] \\\\]

میانگین رسمی تأخیر:

\\\\[ \\boxed{D(t)=\\frac{M(t)}{1000n(t)}} \\\\]

بانک تأخیر داخلی کنترلکننده:

\\\\[ \\boxed{B_D(t)=1000\\beta Tn(t)-M(t)-q(t)} \\\\]

| پارامتر | معنی |
| --- | --- |
| \\\\(T\\\\) | آستانهٔ تأخیر |
| \\\\(\\beta\\\\) | ضریب احتیاطی |

فرمول ذخیره:

\\\\[ \\boxed{R=2500E\\_{\\max}+8000+2500} \\\\]

در خانوادهٔ تأییدشدهٔ جدید:

\\\\[ E\\_{\\max}=8 \\\\]`;

    const html = renderMarkdown(doc);

    // Verify all 9 display equations are rendered with katex-display
    const displayMatches = html.match(/class="katex-display"/g) || [];
    assert.equal(displayMatches.length, 9);

    // Verify zero unrendered LaTeX delimiters or raw escaped brackets
    assert.doesNotMatch(html, /\\\[/);
    assert.doesNotMatch(html, /\\\]/);
    assert.doesNotMatch(html, /\\\(/);
    assert.doesNotMatch(html, /\\\)/);
    assert.doesNotMatch(html, /<p[^>]*>\[\s*x\(t\)/);

    // Verify table inline math cells rendered as katex
    assert.match(html, /<td[^>]*>[\s\S]*?<span[^>]*class="katex"/);

    // Verify boxed equations render properly
    assert.match(html, /boxed/);
  });
});


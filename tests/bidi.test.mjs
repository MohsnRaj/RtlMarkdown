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
  tokenizeBiDiText,
  rehypeBidi,
} from './dist/bidi.js';

/**
 * Test renderer reproducing the RtlMarkdown component pipeline.
 */
function renderMarkdown(content, direction = 'rtl') {
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
            li: ({ children, className: elemClassName = '', dir, ...props }) =>
              React.createElement('li', { dir, className: elemClassName, ...props }, children),
            bdi: ({ children, className: elemClassName = '', dir = 'ltr', ...props }) => {
              const classes = elemClassName.includes('bidi-ltr-isolate')
                ? elemClassName
                : `bidi-ltr-isolate ${elemClassName}`.trim();
              return React.createElement('bdi', { dir, className: classes, ...props }, children);
            },
          },
        },
        content
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
  });
});

describe('RtlMarkdown BiDi Rendering Tests', () => {
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

    // Persian list items
    assert.match(html, /<li[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"[^>]*>مورد اول/);
    assert.match(html, /<li[^>]*dir="rtl"[^>]*class="[^"]*bidi-rtl-block[^"]*"[^>]*>مورد سوم/);

    // English list item
    assert.match(html, /<li[^>]*dir="ltr"[^>]*class="[^"]*bidi-ltr-block[^"]*"[^>]*>Step 2/);
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
});

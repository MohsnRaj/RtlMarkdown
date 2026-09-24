'use client';

import React, { useState } from 'react';
import RtlMarkdown from '@/components/RtlMarkdown';
import {
  Code,
  Sigma,
  GitBranch,
  Table,
  Quote,
  Eye,
  Columns,
  Download,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

const SAMPLE_MARKDOWN = `# مستندات جامع رندر مارک‌داون راست‌به‌چپ (RTL)

این یک ویرایشگر و رندرر پیشرفته برای زبان‌های راست‌به‌چپ مانند فارسی و عربی است که تمامی **فرمول‌های ریاضیاتی** و **نمودارهای تعاملی** را با حفظ دقیق چیدمان پردازش می‌کند.

---

## ۱. ریاضیات پیشرفته و روابط فیزیک

یکی از چالش‌های اصلی در مارک‌داون فارسی، معکوس شدن فرمول‌های ریاضی و پرانتزها در میان جملات فارسی است. با ایزولاسیون دوطرفه (BiDi Isolation)، فرمول‌ها دقیقا چپ‌به‌راست و متن راست‌به‌چپ می‌ماند.

به عنوان مثال، معادله هم‌ارزی جرم و انرژی اینشتین $E = mc^2$ است. تابع توزیع نرمال استاندارد به صورت زیر تعریف می‌شود:

$$f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x - \\mu}{\\sigma}\\right)^2}$$

همچنین انتگرال معروف گاوس برابر است با:

$$\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

و ماتریس تبدیل دوران دوبعدی:

$$R(\\theta) = \\begin{bmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{bmatrix}$$

---

## ۲. نمودارهای گرافیکی و فلوچارت‌ها (Mermaid.js)

نمودارها به صورت کامپوننت‌های وکتوری (SVG) در محیط ایزوله رسم می‌شوند و متن‌های فارسی درون گره‌ها با فونت مناسب نمایش داده می‌شوند:

\`\`\`mermaid
flowchart TD
    A([شروع فرآیند]) --> B[دریافت داده‌های ورودی]
    B --> C{آیا اعتبارسنجی تایید است؟}
    C -- بله --> D[اجرای مدل ریاضی و پردازش]
    C -- خیر --> E[ثبت گزارش خطا]
    D --> F([پایان عملیات موفق])
    E --> F
\`\`\`

### نمودار توالی (Sequence Diagram):

\`\`\`mermaid
sequenceDiagram
    autonumber
    کاربر->>مرورگر: درخواست صفحه مستندات
    مرورگر->>سرور: GET /api/docs
    سرور->>پایگاه‌داده: واکشی محتوای مارک‌داون
    پایگاه‌داده-->>سرور: داده‌های خام MD
    سرور-->>مرورگر: پاسخ JSON + KaTeX
    مرورگر-->>کاربر: رندر گرافیکی کامل و بی‌نقص
\`\`\`

---

## ۳. جدول داده‌ها با اعداد و متن ترکیبی

| شناسه | نام مؤلفه | وضعیت تست | ضریب خطا (Loss) | پیچیدگی |
| :--- | :--- | :---: | :---: | :--- |
| **01** | رندر معادلات KaTeX | ✅ تایید شد | $0.002$ | $\\mathcal{O}(1)$ |
| **02** | نمودارهای وکتوری | ✅ تایید شد | $0.015$ | $\\mathcal{O}(V + E)$ |
| **03** | ایزولاسیون کد درون‌خطی | ✅ تایید شد | $0.000$ | $\\mathcal{O}(N)$ |

---

## ۴. بلوک‌های کد با چیدمان استاندارد

کدهای برنامه‌نویسی همواره باید از چپ به راست (LTR) با امکان کپی مستقیم نمایش داده شوند:

\`\`\`typescript
interface DocumentProps {
  id: string;
  title: string;
  mathEngine: "katex" | "mathjax";
  isRTL: boolean;
}

export function calculateMetrics(data: number[]): number {
  return data.reduce((acc, curr) => acc + curr, 0) / data.length;
}
\`\`\`

> 💡 **نکته مهم:** حاشیه‌ها و تورفتگی‌ها به شکل اتوماتیک بر مبنای جهت RTL تنظیم شده‌اند تا حاشیه نقل‌قول در سمت راست قرار گیرد.
`;

export default function Home() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [direction, setDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copied, setCopied] = useState(false);

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('md-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.substring(start, end);
    const replacement = `${before}${selected || 'متن نمونه'}${after}`;

    const newContent = markdown.substring(0, start) + replacement + markdown.substring(end);
    setMarkdown(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + replacement.length - after.length);
    }, 50);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100/70 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-sm">
            R
          </div>
          <div>
            <h1 className="text-sm font-bold text-neutral-900 dark:text-white">
              استودیو رندر RTL مارک‌داون
            </h1>
            <p className="text-[11px] text-neutral-500">پشتیبانی کامل از $\LaTeX$ و Mermaid.js</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Direction Toggle */}
          <button
            onClick={() => setDirection((d) => (d === 'rtl' ? 'ltr' : 'rtl'))}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            title="تغییر جهت چیدمان صفحه"
          >
            <span>جهت:</span>
            <span className="font-mono uppercase font-bold text-blue-600 dark:text-blue-400">
              {direction}
            </span>
          </button>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center rounded-lg border border-neutral-200 bg-neutral-100/80 p-0.5 dark:border-neutral-700 dark:bg-neutral-800/80">
            <button
              onClick={() => setViewMode('split')}
              className={`rounded-md p-1.5 text-xs transition ${
                viewMode === 'split'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              title="نمای دوتایی"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('edit')}
              className={`rounded-md p-1.5 text-xs transition ${
                viewMode === 'edit'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              title="فقط ویرایشگر"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`rounded-md p-1.5 text-xs transition ${
                viewMode === 'preview'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              title="فقط پیش‌نمایش"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            title="دانلود فایل .md"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">ذخیره</span>
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
            title="کپی متن مارک‌داون"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{copied ? 'کپی شد' : 'کپی مارک‌داون'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'split' || viewMode === 'edit') && (
          <div
            className={`flex flex-col border-neutral-200 dark:border-neutral-800 ${
              viewMode === 'split' ? 'w-1/2 border-l' : 'w-full'
            }`}
          >
            {/* Quick Insertion Toolbar */}
            <div className="flex items-center gap-1 border-b border-neutral-200/80 bg-neutral-50/80 px-3 py-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900/60">
              <span className="text-[11px] font-medium text-neutral-400 pe-1">درج سریع:</span>
              <button
                onClick={() => insertText('$', '$')}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="فرمول درون‌خطی"
              >
                <Sigma className="h-3 w-3" />
                <span>فرمول $x$</span>
              </button>
              <button
                onClick={() => insertText('\n$$\n', '\n$$\n')}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="معادله بلوکی مستقل"
              >
                <Sigma className="h-3 w-3" />
                <span>معادله $$</span>
              </button>
              <button
                onClick={() =>
                  insertText(
                    '\n```mermaid\nflowchart TD\n    A[مرحله اول] --> B[مرحله دوم]\n```\n'
                  )
                }
                className="flex items-center gap-1 rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="نمودار Mermaid"
              >
                <GitBranch className="h-3 w-3" />
                <span>نمودار</span>
              </button>
              <button
                onClick={() =>
                  insertText('\n| ستون ۱ | ستون ۲ |\n| :--- | :---: |\n| داده ۱ | داده ۲ |\n')
                }
                className="flex items-center gap-1 rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="جدول"
              >
                <Table className="h-3 w-3" />
                <span>جدول</span>
              </button>
              <button
                onClick={() => insertText('\n> ')}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="نقل قول"
              >
                <Quote className="h-3 w-3" />
                <span>نقل‌قول</span>
              </button>
              <button
                onClick={() => setMarkdown(SAMPLE_MARKDOWN)}
                className="mr-auto flex items-center gap-1 rounded px-2 py-0.5 text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                title="بازنشانی متن نمونه"
              >
                <RefreshCw className="h-3 w-3" />
                <span>بازنشانی</span>
              </button>
            </div>

            {/* Textarea */}
            <textarea
              id="md-editor"
              dir="auto"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="flex-1 resize-none bg-white p-4 font-mono text-[13.5px] leading-relaxed text-neutral-800 outline-none selection:bg-blue-500 selection:text-white dark:bg-neutral-950 dark:text-neutral-200"
              placeholder="متن مارک‌داون خود را اینجا وارد کنید..."
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            className={`flex flex-col bg-white overflow-y-auto dark:bg-neutral-900/50 ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200/80 bg-neutral-50/90 px-4 py-2 text-xs font-semibold text-neutral-500 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
              <span>پیش‌نمایش زنده (Live Preview)</span>
              <span className="text-[11px] font-normal text-neutral-400">
                ایزولاسیون کامل BiDi فعال است
              </span>
            </div>

            <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
              <RtlMarkdown content={markdown} direction={direction} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

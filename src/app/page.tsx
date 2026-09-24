'use client';

import React, { useState, useRef } from 'react';
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
  Upload,
  Printer,
  FileText,
  CheckCircle2,
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
  const [docName, setDocName] = useState('document');
  const [direction, setDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification((curr) => (curr === message ? null : curr));
    }, 3500);
  };

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
    a.download = `${docName || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`فایل ${docName || 'document'}.md ذخیره شد.`);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;

    const validExtensions = ['.md', '.markdown', '.mdown', '.mkd', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isExtensionValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isExtensionValid && !file.type.startsWith('text/')) {
      showNotification('لطفاً یک فایل متنی یا مارک‌داون (.md) معتبر انتخاب کنید.');
      return;
    }

    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setDocName(nameWithoutExt || 'document');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setMarkdown(content);
        showNotification(`فایل «${file.name}» با موفقیت بارگذاری و راست‌چین شد.`);
      }
    };
    reader.onerror = () => {
      showNotification('خطا در خواندن محتوای فایل.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  const handleDownloadPdf = () => {
    const originalTitle = document.title;
    const exportName = docName || 'rtl-markdown-document';
    document.title = exportName;

    // Switch view mode if only editor is showing to ensure preview DOM is mounted
    if (viewMode === 'edit') {
      setViewMode('split');
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.title = originalTitle;
        }, 500);
      }, 150);
    } else {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      id="app-root"
      className="flex h-screen flex-col overflow-hidden bg-neutral-100/70 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 print:h-auto print:overflow-visible print:bg-white"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-xs">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-neutral-900 dark:text-white">
                استودیو رندر RTL مارک‌داون
              </h1>
              {docName && (
                <span className="hidden xl:inline-flex items-center gap-1 rounded-md border border-neutral-200/90 bg-neutral-100/80 px-2 py-0.5 text-[11px] font-mono text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300">
                  <FileText className="h-3 w-3" />
                  {docName}.md
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500">پشتیبانی کامل از $\LaTeX$ و Mermaid.js</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            title="آپلود فایل مارک‌داون (.md, .txt) برای رندر و راست‌چین‌سازی"
          >
            <Upload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">آپلود مارک‌داون</span>
          </button>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-xs font-medium text-rose-700 shadow-xs transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
            title="دانلود نسخه پی‌دی‌اف (PDF) با کیفیت برداری فرمول‌ها و نمودارها"
          >
            <Printer className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span>دانلود PDF</span>
          </button>

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
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-neutral-700 dark:text-white'
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
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-neutral-700 dark:text-white'
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
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              title="فقط پیش‌نمایش"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Download Markdown button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            title="دانلود فایل .md"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">ذخیره .md</span>
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-xs hover:bg-blue-700"
            title="کپی متن مارک‌داون"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{copied ? 'کپی شد' : 'کپی مارک‌داون'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div
        id="main-workspace"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative flex flex-1 overflow-hidden print:h-auto print:overflow-visible print:block"
      >
        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="drop-overlay absolute inset-0 z-50 flex items-center justify-center bg-blue-600/10 backdrop-blur-xs p-6">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-blue-500 bg-white/95 px-8 py-6 shadow-2xl dark:bg-neutral-900/95 dark:border-blue-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  فایل مارک‌داون را اینجا رها کنید
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  فایل به صورت خودکار خوانده شده و با چینش استاندارد رندر می‌گردد (.md, .markdown, .txt)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Floating Notification Toast */}
        {notification && (
          <div className="notification-toast fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/95 px-4 py-2.5 text-xs font-medium text-emerald-800 shadow-xl backdrop-blur-md dark:border-emerald-800/80 dark:bg-neutral-900/95 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Editor Pane */}
        {(viewMode === 'split' || viewMode === 'edit') && (
          <div
            id="editor-pane"
            className={`flex flex-col border-neutral-200 dark:border-neutral-800 print:hidden ${
              viewMode === 'split' ? 'w-1/2 border-e' : 'w-full'
            }`}
          >
            {/* Quick Insertion Toolbar */}
            <div className="quick-insertion-toolbar flex items-center gap-1 border-b border-neutral-200/80 bg-neutral-50/80 px-3 py-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900/60">
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
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="بارگذاری فایل از رایانه"
              >
                <Upload className="h-3 w-3" />
                <span>آپلود</span>
              </button>
              <button
                onClick={() => {
                  setMarkdown(SAMPLE_MARKDOWN);
                  setDocName('document');
                  showNotification('متن نمونه بازنشانی شد.');
                }}
                className="ms-auto flex items-center gap-1 rounded px-2 py-0.5 text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
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
            id="preview-pane"
            className={`flex flex-col bg-white overflow-y-auto dark:bg-neutral-900/50 print:block print:w-full print:h-auto print:overflow-visible print:bg-white ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
          >
            <div
              id="preview-header"
              className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200/80 bg-neutral-50/90 px-4 py-2 text-xs font-semibold text-neutral-500 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 print:hidden"
            >
              <span>پیش‌نمایش زنده (Live Preview)</span>
              <span className="text-[11px] font-normal text-neutral-400">
                ایزولاسیون کامل BiDi فعال است
              </span>
            </div>

            <div id="preview-content" className="p-6 md:p-8 max-w-4xl mx-auto w-full print:p-0 print:max-w-none">
              <RtlMarkdown content={markdown} direction={direction} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


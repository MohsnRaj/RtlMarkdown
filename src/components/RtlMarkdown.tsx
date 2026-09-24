'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeBidi from '@/lib/bidi';
import MermaidChart from './MermaidChart';
import { Check, Copy } from 'lucide-react';

interface RtlMarkdownProps {
  content: string;
  className?: string;
  direction?: 'rtl' | 'ltr';
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-card group relative my-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 text-neutral-100 shadow-sm dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/70 px-4 py-1.5 text-xs text-neutral-400">
        <span className="font-mono lowercase">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="no-print flex items-center gap-1 rounded px-2 py-0.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="کپی کد"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] text-emerald-400">کپی شد</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="text-[11px]">کپی</span>
            </>
          )}
        </button>
      </div>
      <pre dir="ltr" className="overflow-x-auto p-4 text-left font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function RtlMarkdown({
  content,
  className = '',
  direction = 'rtl',
}: RtlMarkdownProps) {
  return (
    <div
      dir={direction}
      className={`rtl-markdown-prose leading-relaxed text-neutral-800 dark:text-neutral-200 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
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
        ]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (language === 'mermaid') {
              return <MermaidChart chart={codeString} />;
            }

            // Block code has className or is multiline
            const isInline = !match && !String(children).includes('\n');

            if (isInline) {
              return (
                <code
                  dir="ltr"
                  className="mx-1 inline-block rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-pink-600 dark:border-neutral-800 dark:bg-neutral-800/80 dark:text-pink-400 [unicode-bidi:isolate]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={language} code={codeString} />;
          },
          h1: ({ children, className: elemClassName = '', dir, ...props }) => (
            <h1
              dir={dir}
              className={`mt-8 mb-4 border-b border-neutral-200 pb-2 text-2xl font-bold tracking-tight text-neutral-900 dark:border-neutral-800 dark:text-neutral-100 ${elemClassName}`}
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, className: elemClassName = '', dir, ...props }) => (
            <h2
              dir={dir}
              className={`mt-6 mb-3 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 ${elemClassName}`}
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, className: elemClassName = '', dir, ...props }) => (
            <h3
              dir={dir}
              className={`mt-5 mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100 ${elemClassName}`}
              {...props}
            >
              {children}
            </h3>
          ),
          p: ({ children, className: elemClassName = '', dir, ...props }) => (
            <p
              dir={dir}
              className={`my-3 text-[15px] leading-8 ${elemClassName}`}
              {...props}
            >
              {children}
            </p>
          ),
          blockquote: ({ children, className: elemClassName = '', dir, ...props }) => (
            <blockquote
              dir={dir}
              className={`my-4 rounded-s-lg border-s-4 border-blue-500 bg-blue-50/50 py-2.5 pe-4 ps-4 text-neutral-700 italic dark:border-blue-400 dark:bg-blue-950/20 dark:text-neutral-300 ${elemClassName}`}
              {...props}
            >
              {children}
            </blockquote>
          ),
          ul: ({ children, className: elemClassName = '', dir, ...props }) => (
            <ul
              dir={dir}
              className={`my-3 list-disc space-y-1.5 ps-6 text-[15px] marker:text-neutral-400 ${elemClassName}`}
              {...props}
            >
              {children}
            </ul>
          ),
          ol: ({ children, className: elemClassName = '', dir, ...props }) => (
            <ol
              dir={dir}
              className={`my-3 list-decimal space-y-1.5 ps-6 text-[15px] marker:text-neutral-400 ${elemClassName}`}
              {...props}
            >
              {children}
            </ol>
          ),
          li: ({ children, className: elemClassName = '', dir, ...props }) => (
            <li
              dir={dir}
              className={`leading-7 ${elemClassName}`}
              {...props}
            >
              {children}
            </li>
          ),
          bdi: ({ children, className: elemClassName = '', dir = 'ltr', ...props }) => {
            const classes = elemClassName.includes('bidi-ltr-isolate')
              ? elemClassName
              : `bidi-ltr-isolate ${elemClassName}`.trim();
            return (
              <bdi
                dir={dir}
                className={classes}
                {...props}
              >
                {children}
              </bdi>
            );
          },
          table: ({ children, className: elemClassName = '', ...props }) => (
            <div className="my-6 w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className={`w-full border-collapse text-start text-sm ${elemClassName}`} {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, className: elemClassName = '', ...props }) => (
            <thead
              className={`border-b border-neutral-200 bg-neutral-100/75 dark:border-neutral-800 dark:bg-neutral-900/60 ${elemClassName}`}
              {...props}
            >
              {children}
            </thead>
          ),
          th: ({ children, className: elemClassName = '', ...props }) => (
            <th
              className={`px-4 py-2.5 font-semibold text-neutral-900 dark:text-neutral-100 ${elemClassName}`}
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, className: elemClassName = '', ...props }) => (
            <td
              className={`border-b border-neutral-100 px-4 py-2.5 text-neutral-700 last:border-0 dark:border-neutral-800/60 dark:text-neutral-300 ${elemClassName}`}
              {...props}
            >
              {children}
            </td>
          ),
          a: ({ href, children, className: elemClassName = '', ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-blue-600 underline decoration-blue-400/50 underline-offset-4 transition hover:text-blue-700 hover:decoration-blue-600 dark:text-blue-400 dark:hover:text-blue-300 ${elemClassName}`}
              {...props}
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-neutral-200 dark:border-neutral-800" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

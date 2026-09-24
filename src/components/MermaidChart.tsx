'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { AlertCircle, Check, Copy } from 'lucide-react';

interface MermaidChartProps {
  chart: string;
}

let mermaidInitialized = false;

function initMermaid() {
  if (!mermaidInitialized && typeof window !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'var(--font-vazirmatn), system-ui, sans-serif',
      fontSize: 14,
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
      },
    });
    mermaidInitialized = true;
  }
}

export default function MermaidChart({ chart }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const uniqueId = useId().replace(/:/g, '_');

  useEffect(() => {
    initMermaid();
    let isMounted = true;

    async function renderChart() {
      if (!chart.trim()) return;
      try {
        setError(null);
        const renderId = `mermaid_svg_${uniqueId}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Error rendering diagram';
          setError(errorMessage);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, uniqueId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="my-4 rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" />
          <span>خطا در رسم نمودار مِرمِید (Mermaid Syntax Error)</span>
        </div>
        <pre dir="ltr" className="mt-2 overflow-x-auto rounded bg-red-100/60 p-2 font-mono dark:bg-red-900/30">
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div className="group relative my-6 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 transition-all hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleCopy}
          type="button"
          title="کپی کد نمودار"
          className="rounded-lg border border-neutral-200 bg-white/90 p-1.5 text-neutral-600 shadow-sm backdrop-blur hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/90 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* SVG Container strictly isolated to LTR layout so graphs don't invert */}
      <div
        ref={containerRef}
        dir="ltr"
        className="flex w-full justify-center overflow-x-auto py-2 text-center select-none [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}

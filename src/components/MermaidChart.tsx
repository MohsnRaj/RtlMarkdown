'use client';

import React, { useEffect, useState, useId } from 'react';
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
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'VazirmatnDiagram, Tahoma, sans-serif',
      fontSize: 16,
      themeVariables: {
        primaryColor: '#eff6ff',
        primaryTextColor: '#172554',
        primaryBorderColor: '#93b4e8',
        secondaryColor: '#f1f5f9',
        secondaryTextColor: '#1e293b',
        secondaryBorderColor: '#cbd5e1',
        tertiaryColor: '#ffffff',
        lineColor: '#64748b',
        textColor: '#1e293b',
        mainBkg: '#eff6ff',
        nodeBorder: '#93b4e8',
        clusterBkg: '#f8fafc',
        clusterBorder: '#cbd5e1',
        edgeLabelBackground: '#ffffff',
        actorBkg: '#eff6ff',
        actorBorder: '#93b4e8',
        actorTextColor: '#172554',
        signalColor: '#64748b',
        signalTextColor: '#1e293b',
        labelBoxBkgColor: '#f1f5f9',
        labelBoxBorderColor: '#cbd5e1',
        labelTextColor: '#1e293b',
        noteBkgColor: '#fffbeb',
        noteBorderColor: '#fcd34d',
        noteTextColor: '#422006',
      },
      themeCSS: `
        .nodeLabel, .edgeLabel, .label, .messageText, .noteText {
          font-family: VazirmatnDiagram, Tahoma, sans-serif;
          letter-spacing: 0;
        }
        .nodeLabel p, .edgeLabel p { unicode-bidi: plaintext; line-height: 1.7; }
        .flowchart-link { stroke-width: 1.7px; }
      `,
      flowchart: {
        htmlLabels: true,
        curve: 'linear',
        nodeSpacing: 50,
        rankSpacing: 60,
        padding: 20,
      },
    });
    mermaidInitialized = true;
  }
}

export default function MermaidChart({ chart }: MermaidChartProps) {
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
        // Mermaid measures labels during rendering, so wait for the Persian font.
        await document.fonts.load('16px VazirmatnDiagram');
        const renderId = `mermaid_svg_${uniqueId}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, chart.trim());
        if (isMounted) {
          const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
          const svgElement = doc.documentElement;
          const viewBox = svgElement.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
          if (viewBox?.length === 4 && viewBox[2] > 0) {
            svgElement.setAttribute('width', String(viewBox[2]));
            svgElement.style.maxWidth = 'none';
          }
          svgElement.querySelectorAll('foreignObject div').forEach((label) => {
            label.setAttribute('dir', 'auto');
          });
          setSvgContent(new XMLSerializer().serializeToString(svgElement));
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
    <div className="mermaid-chart-card group relative my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700">
      <div className="no-print absolute top-3 end-3 z-10 flex items-center gap-1.5">
        <button
          onClick={handleCopy}
          type="button"
          title="کپی کد نمودار"
          aria-label={copied ? 'کد نمودار کپی شد' : 'کپی کد نمودار'}
          className="rounded-lg border border-slate-200 bg-white/95 p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* SVG Container strictly isolated to LTR layout so graphs don't invert */}
      <div
        dir="ltr"
        className="mermaid-chart-viewport w-full overflow-x-auto p-6 pt-12 text-center"
      >
        <div className="mermaid-chart-content" dangerouslySetInnerHTML={{ __html: svgContent }} />
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RTL Markdown Studio - حرفه‌ای و دقیق',
  description: 'محیط رندر حرفه‌ای مارک‌داون راست‌به‌چپ با پشتیبانی کامل از ریاضیات KaTeX و نمودارهای Mermaid',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

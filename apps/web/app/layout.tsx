import type { Metadata, Viewport } from 'next';
import { Tajawal, Lalezar } from 'next/font/google';
import './globals.css';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
});

const lalezar = Lalezar({
  subsets: ['arabic'],
  weight: ['400'],
  variable: '--font-lalezar',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FunnyGame ⚡ | منصة ألعاب التحدي والذكاء',
  description: '16 لعبة ذكاء، سرعة بديهة، حساب، وذاكرة. تحدى أصحابك في الدوري الأسبوعي والتحدي اليومي.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d071a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${lalezar.variable}`}>
      <body className="bg-arcade-dark text-white min-h-screen flex flex-col items-center">
        {/* Main Application Frame: Mobile-First full width, desktop centered 480px frame with expanding container */}
        <div className="w-full max-w-[480px] lg:max-w-6xl min-h-screen flex flex-col bg-[#0d071a] border-x border-white/5 relative">
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { WhatsAppWidget } from '@/components/layout/WhatsAppWidget';
import { Toaster } from 'sonner';

// Body + headings both use Inter — refined via CSS tracking/weights below.
const sans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bransion — Print-on-Demand Commerce',
  description:
    'Buy custom apparel from independent Nigerian creators. Or create your own brand.',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <WhatsAppWidget />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
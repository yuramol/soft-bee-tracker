import './globals.css';
import localFont from 'next/font/local';
import { Toaster } from '@ui/sonner';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';

const fixel = localFont({
  src: [
    { path: '../assets/fonts/fixel/fixel-light.woff2', weight: '300', style: 'normal' },
    { path: '../assets/fonts/fixel/fixel-regular.woff2', weight: '400', style: 'normal' },
    { path: '../assets/fonts/fixel/fixel-medium.woff2', weight: '500', style: 'normal' },
    { path: '../assets/fonts/fixel/fixel-semibold.woff2', weight: '600', style: 'normal' }
  ],
  variable: '--font-sans',
  display: 'swap'
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={cn('font-sans', fixel.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster richColors closeButton />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

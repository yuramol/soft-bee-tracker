import './globals.css';
import { Geist } from 'next/font/google';
import { Toaster } from '@ui/sonner';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/providers/query-provider';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={cn('font-sans', geist.variable)}>
      <body>
        <QueryProvider>
          <main className='flex min-h-screen flex-col items-center justify-between p-24'>{children}</main>
          <Toaster richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}

'use client';

import './globals.css';
import content from './content.json';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  function handleResetClick() {
    reset();
  }

  return (
    <html lang='en'>
      <body className='flex min-h-screen items-center justify-center p-6'>
        <div className='flex max-w-md flex-col items-center gap-4 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>{content.globalError.title}</h1>
          <p className='text-muted-foreground text-sm'>{content.globalError.description}</p>
          <button
            type='button'
            className='bg-electric-green text-brand-black rounded-lg px-4 py-2 text-sm font-medium'
            onClick={handleResetClick}
          >
            {content.globalError.retryButton}
          </button>
        </div>
      </body>
    </html>
  );
}

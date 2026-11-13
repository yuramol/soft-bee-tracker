'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@ui/button';
import content from '../content.json';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  function handleThemeToggleClick() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <Button variant='ghost' size='icon' aria-label={content.themeToggle.label} onClick={handleThemeToggleClick}>
      <SunIcon className='scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90' />
      <MoonIcon className='absolute scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0' />
    </Button>
  );
}

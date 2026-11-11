'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// The App Router has no navigation-blocking API, so internal link clicks are caught
// in the capture phase (before next/link handles them) and reloads go through beforeunload
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedChangesGuard {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function handleDocumentClick(event: MouseEvent) {
      const href = getGuardedHref(event);

      if (href) {
        event.preventDefault();
        event.stopPropagation();
        setPendingHref(href);
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isDirty]);

  function confirmLeave() {
    if (pendingHref) {
      router.push(pendingHref);
    }

    setPendingHref(null);
  }

  function cancelLeave() {
    setPendingHref(null);
  }

  return { isLeavePending: pendingHref !== null, confirmLeave, cancelLeave };
}

export function getGuardedHref(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;

  if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) {
    return null;
  }

  const url = new URL(anchor.href, window.location.href);
  const isSamePage = url.pathname === window.location.pathname && url.search === window.location.search;

  if (url.origin !== window.location.origin || isSamePage) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export interface UnsavedChangesGuard {
  isLeavePending: boolean;
  confirmLeave: () => void;
  cancelLeave: () => void;
}

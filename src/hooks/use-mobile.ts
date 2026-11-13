import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

// one MediaQueryList shared by subscribe and snapshot, and by every useIsMobile
// caller; created lazily because window only exists in the browser
let mobileQueryList: MediaQueryList | null = null;

export function useIsMobile() {
  return React.useSyncExternalStore(subscribeToMobileQuery, getIsMobileSnapshot, getIsMobileServerSnapshot);
}

export function subscribeToMobileQuery(onStoreChange: () => void) {
  const mediaQueryList = getMobileQueryList();

  mediaQueryList.addEventListener('change', onStoreChange);

  return function unsubscribeFromMobileQuery() {
    mediaQueryList.removeEventListener('change', onStoreChange);
  };
}

export function getIsMobileSnapshot() {
  return getMobileQueryList().matches;
}

// Server render has no viewport; match the previous behavior of rendering desktop first.
export function getIsMobileServerSnapshot() {
  return false;
}

function getMobileQueryList(): MediaQueryList {
  mobileQueryList ??= window.matchMedia(MOBILE_MEDIA_QUERY);
  return mobileQueryList;
}

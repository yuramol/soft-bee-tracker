import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type UseMobileModule = typeof import('./use-mobile');

interface FakeMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe('use-mobile store helpers', () => {
  let mediaQueryList: FakeMediaQueryList;
  let matchMedia: ReturnType<typeof vi.fn>;
  let getIsMobileServerSnapshot: UseMobileModule['getIsMobileServerSnapshot'];
  let getIsMobileSnapshot: UseMobileModule['getIsMobileSnapshot'];
  let subscribeToMobileQuery: UseMobileModule['subscribeToMobileQuery'];

  beforeEach(async () => {
    mediaQueryList = {
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    matchMedia = vi.fn((query: string) => {
      mediaQueryList.media = query;
      return mediaQueryList;
    });
    vi.stubGlobal('window', { matchMedia });

    // fresh module per test: the shared MediaQueryList is cached at module level
    vi.resetModules();
    ({ getIsMobileServerSnapshot, getIsMobileSnapshot, subscribeToMobileQuery } = await import('./use-mobile'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queries the mobile breakpoint (below 768px)', () => {
    getIsMobileSnapshot();

    expect(matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('returns the current media query match as the snapshot', () => {
    mediaQueryList.matches = true;
    expect(getIsMobileSnapshot()).toBe(true);

    mediaQueryList.matches = false;
    expect(getIsMobileSnapshot()).toBe(false);
  });

  it('subscribes to media query changes and unsubscribes with the same listener', () => {
    const onStoreChange = vi.fn();

    const unsubscribe = subscribeToMobileQuery(onStoreChange);

    expect(mediaQueryList.addEventListener).toHaveBeenCalledWith('change', onStoreChange);

    unsubscribe();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', onStoreChange);
  });

  it('shares one MediaQueryList between subscribe and snapshot reads', () => {
    const unsubscribe = subscribeToMobileQuery(vi.fn());
    getIsMobileSnapshot();
    getIsMobileSnapshot();
    unsubscribe();
    subscribeToMobileQuery(vi.fn());

    expect(matchMedia).toHaveBeenCalledTimes(1);
  });

  it('does not touch window until first used', () => {
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('renders desktop on the server', () => {
    expect(getIsMobileServerSnapshot()).toBe(false);
  });
});

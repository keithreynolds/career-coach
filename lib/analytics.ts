/**
 * Thin analytics wrapper for RateMyResume.
 *
 * All custom event tracking goes through `trackEvent` so call sites are
 * consistent and the underlying provider (GA4 via gtag) can be swapped
 * without touching page.tsx.
 *
 * The gtag function is loaded by the <Script> tags in app/layout.tsx.
 * Calls made before the script loads (or in SSR) are silently dropped.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Fire a GA4 custom event. Safe to call on the server or before gtag loads —
 * it will no-op rather than throw.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}

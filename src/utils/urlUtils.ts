/**
 * ListIt URL resolution service.
 *
 * In Google AI Studio:
 * - The editor/preview iframe or container runs with:
 *     origin: https://aistudio.google.com or https://ais-dev-...run.app or http://localhost:3000
 * - Development and editor URLs require Google AI Studio project permissions and session cookies.
 * - External users without access to the Google AI Studio project CANNOT access those internal URLs.
 * - The public/deployed application URL is the Shared App URL:
 *     https://ais-pre-4ewykb3pq2vqg5p4h44jfk-301569695870.us-east5.run.app
 */

export const PUBLIC_LISTIT_DOMAIN = 'ais-pre-4ewykb3pq2vqg5p4h44jfk-301569695870.us-east5.run.app';
export const DEFAULT_PUBLIC_APP_URL = `https://${PUBLIC_LISTIT_DOMAIN}`;

/**
 * Resolves the public, externally-accessible base URL for the ListIt application.
 * Never returns internal aistudio.google.com or private ais-dev-* domains.
 */
export function getPublicAppBaseUrl(): string {
  // 1. Check client-side build/runtime environment variables if provided
  const envPublicUrl = (import.meta.env?.VITE_PUBLIC_APP_URL as string || import.meta.env?.VITE_SHARED_APP_URL as string)?.trim();
  if (
    envPublicUrl &&
    !envPublicUrl.includes('aistudio.google.com') &&
    !envPublicUrl.includes('ais-dev-') &&
    !envPublicUrl.includes('localhost')
  ) {
    return envPublicUrl.replace(/\/+$/, '');
  }

  // 2. Check window.location if available
  if (typeof window !== 'undefined' && window.location) {
    const origin = (window.location.origin || '').trim();
    const hostname = (window.location.hostname || '').trim();

    // If currently accessed from the public shared domain or custom domain
    const isAiStudioInternal =
      origin.includes('aistudio.google.com') ||
      hostname.includes('aistudio.google.com') ||
      origin.includes('ais-dev-') ||
      hostname.includes('ais-dev-') ||
      origin.includes('localhost') ||
      hostname.includes('localhost') ||
      hostname === '127.0.0.1';

    if (origin && !isAiStudioInternal) {
      return origin.replace(/\/+$/, '');
    }

    // If on ais-dev-..., translate to ais-pre-... (the public shared cloud run service)
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-').replace(/\/+$/, '');
    }
  }

  // 3. Guaranteed canonical public URL
  return DEFAULT_PUBLIC_APP_URL;
}

/**
 * Builds the canonical public invitation deep link for a specific list.
 * Format: https://[PUBLIC-LISTIT-DOMAIN]/?listId=[LIST_ID]
 */
export function getPublicListShareUrl(listId: string): string {
  const baseUrl = getPublicAppBaseUrl();
  return `${baseUrl}/?listId=${encodeURIComponent(listId)}`;
}

// src/services/localLibraryAvailability.ts
// Centralizes the secure-context requirement for browser local-library access.

export interface LocalLibraryAvailability {
  supported: boolean;
  reason: 'insecure-http' | 'file-system-api-unavailable' | null;
  // True when the folder picker (File System Access) is missing but songs can still be
  // imported through a plain file picker and copied into the app database instead of
  // referencing a folder on disk (iOS Safari / WKWebView, e.g. the Capacitor shell).
  pickerFallback: boolean;
}

export const getLocalLibraryAvailability = (): LocalLibraryAvailability => {
  if (typeof window === 'undefined') return { supported: false, reason: 'file-system-api-unavailable', pickerFallback: false };
  if (window.electron) return { supported: true, reason: null, pickerFallback: false };
  const currentLocation = window.location;
  if (!currentLocation) return { supported: false, reason: 'file-system-api-unavailable', pickerFallback: false };
  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(currentLocation.hostname);
  if (!(currentLocation.protocol === 'https:' || isLocalhost) || !window.isSecureContext) {
    return { supported: false, reason: 'insecure-http', pickerFallback: false };
  }
  if (('showDirectoryPicker' in window) && typeof navigator.storage?.getDirectory === 'function') {
    return { supported: true, reason: null, pickerFallback: false };
  }
  // No folder picker: a file picker plus IndexedDB is enough for the copy-in import.
  if (typeof document !== 'undefined' && 'indexedDB' in window) {
    return { supported: true, reason: null, pickerFallback: true };
  }
  return { supported: false, reason: 'file-system-api-unavailable', pickerFallback: false };
};

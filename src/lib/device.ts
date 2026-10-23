/** True when running as the installed home-screen app rather than in a browser tab. */
export function isInstalledApp() {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
    || matchMedia('(display-mode: standalone)').matches;
}

/** True on an iPhone or iPad (newer iPads pretend to be Macs, hence the touch check). */
export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Ask iOS to protect Kindling's data from automatic clean-up. Safe to call every launch. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported; nothing to do.
  }
}

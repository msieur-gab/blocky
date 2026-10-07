// ══════════════════════════════════════════
// Display — the screen is blocky's face
//
// From the first tap on: the screen does not go to sleep, and on a phone or a tablet
// the page fills the screen and stays on its side (the landscape is its face).
//
// A browser only allows these after a touch, lets the page turn the screen only while
// it is full screen, and takes the wake lock back whenever the page is hidden. So each
// is asked for again when it has been lost.
// On a desk (a mouse) the page stays a window; ?fullscreen forces the phone behaviour.
// ══════════════════════════════════════════

const ORIENTATION = 'landscape';

const params = new URLSearchParams(window.location.search);
const handheld = matchMedia('(pointer: coarse)').matches || params.has('fullscreen');

let held = false;
let wakeLock = null;

async function keepAwake() {
  if (!held || wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    console.warn('[display] The screen can still go to sleep:', e.message);
  }
}

async function fillAndTurn() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation.lock(ORIENTATION);
  } catch (e) {
    console.warn('[display] Full screen or the orientation lock was refused:', e.message);
  }
}

// Call from a tap (the start gate)
export function hold() {
  held = true;
  keepAwake();
  if (handheld) fillAndTurn();
}

export function state() {
  return { awake: !!wakeLock, fullscreen: !!document.fullscreenElement, orientation: screen.orientation?.type };
}

// Back from another app or tab: the wake lock was dropped meanwhile
document.addEventListener('visibilitychange', keepAwake);

// Full screen was left (the back gesture), which frees the rotation: the next tap takes both back
if (handheld) {
  document.addEventListener('click', () => { if (held && !document.fullscreenElement) fillAndTurn(); });
}

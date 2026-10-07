// ══════════════════════════════════════════
// Camera Service
// Lifecycle manager — reference-counted access
// ══════════════════════════════════════════

// camera.acquire('faces')   → opens stream if not already open
// camera.release('faces')   → closes only when zero consumers
// camera.acquire('gestures') → reuses open stream

import { bus } from '../utils/events.js';

const consumers = new Set();
let stream = null;
let videoEl = null;

const CONSTRAINTS = {
  video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
  audio: false,
};

export async function acquire(consumer) {
  consumers.add(consumer);

  if (!stream) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);

      videoEl = document.createElement('video');
      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', '');
      videoEl.muted = true;

      await videoEl.play();
      bus.emit('camera:active');
      console.log('[camera] Stream opened for:', consumer);
    } catch (e) {
      consumers.delete(consumer);
      console.warn('[camera] Failed to open:', e.message);
      bus.emit('camera:denied');
      return null;
    }
  }

  return { stream, video: videoEl };
}

export function release(consumer) {
  consumers.delete(consumer);

  if (consumers.size === 0 && stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl = null;
    }
    bus.emit('camera:inactive');
    console.log('[camera] Stream closed (no consumers)');
  }
}

export function isActive() { return stream !== null; }
export function getConsumers() { return [...consumers]; }
export function getVideo() { return videoEl; }

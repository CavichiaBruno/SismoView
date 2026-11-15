/**
 * Utility for robust audio playback with browser policies compliance.
 * Handles muted state, user gesture requirements, and safe playback.
 */

const audioCache = new Map<string, HTMLAudioElement>();
let audioContextStarted = false;

/**
 * Initialize audio context (needed for autoplay in some browsers).
 */
export function initAudioContext(): Promise<void> {
  if (audioContextStarted) return Promise.resolve();
  audioContextStarted = true;
  
  return new Promise((resolve) => {
    const startAudio = () => {
      const audio = new Audio();
      audio.volume = 0;
      void audio.play().finally(() => {
        document.removeEventListener('click', startAudio);
        document.removeEventListener('touchstart', startAudio);
        resolve();
      });
    };
    
    if (typeof document !== 'undefined') {
      document.addEventListener('click', startAudio, { once: true });
      document.addEventListener('touchstart', startAudio, { once: true });
    }
  });
}

/**
 * Safely play audio with error handling.
 * @param src - Path to audio file
 * @param options - Playback options
 */
export async function playAudio(
  src: string,
  options: {
    volume?: number;
    loop?: boolean;
    onError?: (error: unknown) => void;
    cache?: boolean;
  } = {}
): Promise<HTMLAudioElement | null> {
  const { volume = 1, loop = false, onError, cache = true } = options;

  try {
    // Use cached audio if available
    let audio: HTMLAudioElement;
    if (cache && audioCache.has(src)) {
      audio = audioCache.get(src)!;
    } else {
      audio = new Audio(src);
      // Set crossOrigin for CORS compliance
      audio.crossOrigin = 'anonymous';
      if (cache) {
        audioCache.set(src, audio);
      }
    }

    audio.volume = Math.max(0, Math.min(1, volume));
    audio.loop = loop;

    // Attempt to play
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }

    return audio;
  } catch (error) {
    console.warn(`Failed to play audio: ${src}`, error);
    onError?.(error);
    return null;
  }
}

/**
 * Stop and reset audio playback.
 */
export function stopAudio(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // Ignore errors when stopping
  }
}

/**
 * Fade audio volume to target value.
 */
export function fadeAudio(
  audio: HTMLAudioElement,
  targetVolume: number,
  duration: number = 1000
): Promise<void> {
  return new Promise((resolve) => {
    const startVolume = audio.volume;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min(1, (now - startTime) / duration);

      audio.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        audio.volume = targetVolume;
        resolve();
      }
    };

    animate();
  });
}

/**
 * Preload audio file into cache.
 */
export function preloadAudio(src: string): HTMLAudioElement {
  if (audioCache.has(src)) {
    return audioCache.get(src)!;
  }

  const audio = new Audio(src);
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  audioCache.set(src, audio);

  return audio;
}

/**
 * Clear audio cache.
 */
export function clearAudioCache(src?: string): void {
  if (src) {
    audioCache.delete(src);
  } else {
    audioCache.clear();
  }
}

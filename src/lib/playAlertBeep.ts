import { Platform } from "react-native";

let unlockedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const AudioCtx =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!unlockedCtx) {
    unlockedCtx = new AudioCtx();
  }
  if (unlockedCtx.state === "suspended") {
    void unlockedCtx.resume();
  }
  return unlockedCtx;
}

/** Call once after a user gesture so later beeps are allowed by the browser. */
export function unlockAlertAudio(): void {
  try {
    getAudioContext();
  } catch {
    // ignore
  }
}

/** Short alert beep for new admin payout requests (web Audio API). */
export function playAlertBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const beep = (start: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    beep(now, 880, 0.12);
    beep(now + 0.16, 1175, 0.14);
  } catch {
    // ignore — sound is best-effort
  }
}

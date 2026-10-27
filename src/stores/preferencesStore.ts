import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MotionPreference = 'auto' | 'reduced' | 'full';
export type PracticeSpeed = 'relaxed' | 'standard' | 'quick';
export const practicePaces: Record<
  PracticeSpeed,
  { robotCardDelayMs: number; trickHoldMs: number }
> = {
  relaxed: { robotCardDelayMs: 1400, trickHoldMs: 2400 },
  standard: { robotCardDelayMs: 700, trickHoldMs: 1200 },
  quick: { robotCardDelayMs: 300, trickHoldMs: 1000 },
};
export const usePreferencesStore = create<{
  motion: MotionPreference;
  sound: boolean;
  practiceSpeed: PracticeSpeed;
  setMotion: (motion: MotionPreference) => void;
  setSound: (sound: boolean) => void;
  setPracticeSpeed: (speed: PracticeSpeed) => void;
}>()(
  persist(
    (set) => ({
      motion: 'auto',
      sound: false,
      practiceSpeed: 'standard',
      setMotion: (motion) => set({ motion }),
      setSound: (sound) => set({ sound }),
      setPracticeSpeed: (practiceSpeed) => set({ practiceSpeed }),
    }),
    {
      name: 'bridge-player-preferences',
      version: 1,
      merge: (saved, current) => {
        const value = saved as Record<string, unknown> | undefined;
        return {
          ...current,
          motion: ['auto', 'reduced', 'full'].includes(String(value?.motion))
            ? (value!.motion as MotionPreference)
            : 'auto',
          sound: value?.sound === true,
          practiceSpeed: ['relaxed', 'standard', 'quick'].includes(
            String(value?.practiceSpeed)
          )
            ? (value!.practiceSpeed as PracticeSpeed)
            : 'standard',
        };
      },
    }
  )
);

export function shouldReduceMotion(
  motion: MotionPreference,
  systemReduced: boolean
) {
  return systemReduced || motion === 'reduced';
}

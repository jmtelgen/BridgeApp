import { useEffect, useState } from 'react';
import {
  usePreferencesStore,
  shouldReduceMotion,
  MotionPreference,
} from '../../../stores/preferencesStore';
import { isSoundUnlocked, unlockSound } from '../../../services/soundService';

export function PreferenceEffects() {
  const motion = usePreferencesStore((state) => state.motion);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      document.documentElement.dataset.motion = shouldReduceMotion(
        motion,
        media.matches
      )
        ? 'reduced'
        : 'full';
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [motion]);
  return null;
}

export function PlayerPreferences() {
  const { motion, sound, setMotion, setSound } = usePreferencesStore();
  const [unlocked, setUnlocked] = useState(isSoundUnlocked);
  const [error, setError] = useState('');
  const enable = async () => {
    setError('');
    try {
      await unlockSound();
      setSound(true);
      setUnlocked(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not enable sound.'
      );
    }
  };
  return (
    <details className="player-preferences">
      <summary>Player preferences</summary>
      <label>
        Motion
        <select
          aria-label="Motion"
          value={motion}
          onChange={(event) =>
            setMotion(event.target.value as MotionPreference)
          }
        >
          <option value="auto">Automatic (system)</option>
          <option value="reduced">Reduced</option>
          <option value="full">Full (respects system reduction)</option>
        </select>
      </label>
      <p>
        System reduced-motion settings always take precedence. Timing remains
        server-controlled.
      </p>
      <button
        className="room-button secondary"
        onClick={() => (sound && unlocked ? setSound(false) : void enable())}
      >
        {sound && unlocked
          ? 'Disable sound'
          : sound
          ? 'Enable sound in this tab'
          : 'Enable sound'}
      </button>
      <small>
        {sound
          ? 'Optional turn cue; browser activation required per tab.'
          : 'Sound is off by default.'}
      </small>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}

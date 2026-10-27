import { usePreferencesStore } from '../stores/preferencesStore';

let context: AudioContext | undefined;
let lastSnapshot:
  | {
      roomId: string;
      revision: number;
      board: string | number;
      myTurn: boolean;
    }
  | undefined;

export async function unlockSound() {
  if (!window.AudioContext)
    throw new Error('Sound is not supported by this browser.');
  context ??= new AudioContext();
  await context.resume();
  if (context.state !== 'running')
    throw new Error('Allow browser audio, then try Enable sound again.');
}

export function isSoundUnlocked() {
  return context?.state === 'running';
}

export function observeSoundSnapshot(data: any, roomId: string) {
  const revision = data.publicState?.revision;
  if (!Number.isFinite(revision)) return;
  const board = data.publicState.boardId ?? data.publicState.boardNumber;
  const myTurn = data.privateState?.isMyTurn === true;
  const previous = lastSnapshot;
  if (
    previous?.roomId === roomId &&
    previous.board === board &&
    revision <= previous.revision
  )
    return;
  lastSnapshot = { roomId, revision, board, myTurn };
  if (
    !previous ||
    previous.roomId !== roomId ||
    previous.board !== board ||
    previous.myTurn ||
    !myTurn ||
    !['bidMade', 'cardPlayed', 'trickCleared'].includes(data.action) ||
    !usePreferencesStore.getState().sound ||
    !context ||
    context.state !== 'running'
  )
    return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.045, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
}

export function resetSoundBaseline() {
  lastSnapshot = undefined;
}

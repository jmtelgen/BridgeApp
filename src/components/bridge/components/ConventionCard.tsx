import { useEffect, useState } from 'react';
import {
  AgreementCard,
  boardFeaturesService,
} from '../../../services/boardFeaturesService';
import { useRoomFeaturesStore } from '../../../stores/roomFeaturesStore';
import { FeatureDialog } from './FeatureDialog';

export function ConventionCard({
  roomId,
  onClose,
}: {
  roomId: string;
  onClose: () => void;
}) {
  const frozen = useRoomFeaturesStore((state) =>
    state.roomId === roomId ? state.board.agreements : undefined
  );
  const [cards, setCards] = useState<AgreementCard[]>([]);
  const [error, setError] = useState('');
  const versionKey = frozen
    ? [...new Set(Object.values(frozen).map((ref) => ref.version))]
        .sort()
        .join(',')
    : '';
  useEffect(() => {
    let active = true;
    const versions = versionKey ? versionKey.split(',') : [undefined];
    setError('');
    setCards([]);
    Promise.all(
      versions.map((version) => boardFeaturesService.agreement(roomId, version))
    )
      .then((results) => {
        if (active) setCards(results.map((result) => result.card));
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [roomId, versionKey]);
  return (
    <FeatureDialog title="Partnership convention card" onClose={onClose}>
      <p>
        Read-only: the server supports one agreement system. This is not a
        configurable convention selector.
      </p>
      {frozen && (
        <p>
          Frozen for this board: NS {frozen.NS.system} {frozen.NS.version} · EW{' '}
          {frozen.EW.system} {frozen.EW.version}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!cards.length && !error && (
        <p role="status">Loading server-supported agreements…</p>
      )}
      {cards.map((card) => (
        <section key={card.version}>
          <h3>
            {card.title} · {card.version}
          </h3>
          <h4>Supported agreements</h4>
          <dl>
            {card.supported.map((item) => (
              <div key={item.topic}>
                <dt>{item.topic}</dt>
                <dd>{item.description}</dd>
              </div>
            ))}
          </dl>
          <h4>Unsupported sections</h4>
          <ul>
            {card.unsupported.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h4>Deviations and limitations</h4>
          <ul>
            {card.deviations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <small>Server source: {card.source}</small>
        </section>
      ))}
    </FeatureDialog>
  );
}

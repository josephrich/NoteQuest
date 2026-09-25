// First-run setup: the player's name (kept on this device only), naming the dragon, and a mic check.
import { useEffect, useState } from 'react';
import { Dragon } from './Dragon';
import { Logo } from './Logo';
import { useProgress } from './store';
import { listener } from '../engine/listener';
import { midiName } from '../engine/music';
import { unlockSound, sfx } from './sound';
import { ACCESSORIES, SKINS, STARTER_ACCESSORIES, STARTER_SKINS, starterShop } from '../game/shop';

const SKIN_NAMES = Object.fromEntries(SKINS.map((s) => [s.id, s.name]));
const WEAR: { id: string | null; label: string }[] = [
  { id: null, label: 'Nothing' },
  ...STARTER_ACCESSORIES.map((id) => ({ id, label: ACCESSORIES.find((a) => a.id === id)!.name })),
];
// Swatch colours, matching the dragon palettes.
const SWATCH: Record<string, string> = { green: '#3fc389', blue: '#4aa8ff', red: '#ff6b5b', purple: '#9b72ff' };

const DRAGON_NAMES = ['Ember', 'Blaze', 'Spark', 'Ziggy', 'Pip'];

export function Welcome({ onDone, onCancel }: { onDone?: () => void; onCancel?: () => void }) {
  const { update } = useProgress();
  const [step, setStep] = useState<'name' | 'look' | 'dragon' | 'mic'>('name');
  const [name, setName] = useState('');
  const [dragonName, setDragonName] = useState('Ember');
  // Each new player's dragon starts a different colour from the last, to nudge towards variety.
  const [skin, setSkin] = useState(() => STARTER_SKINS[Math.floor(Math.random() * STARTER_SKINS.length)]);
  const [wear, setWear] = useState<string | null>(null);
  const look = starterShop(skin, wear);
  const [mic, setMic] = useState<'idle' | 'starting' | 'listening' | 'heard' | 'failed'>('idle');
  const [heard, setHeard] = useState<string | null>(null);

  useEffect(() => {
    if (mic !== 'listening') return;
    return listener.onNote((ev) => {
      setHeard(midiName(ev.midi).replace(/\d/, ''));
      setMic('heard');
      sfx.correct();
    });
  }, [mic]);

  const finish = (input: 'piano' | 'screen' = 'piano') => {
    void listener.stop();
    update((p) => ({
      ...p,
      profile: { name: name.trim(), dragonName: dragonName.trim() || 'Ember' },
      settings: { ...p.settings, input },
      shop: { ...p.shop, ...starterShop(skin, wear) },
    }));
    onDone?.();
  };

  const startMic = async () => {
    unlockSound();
    setMic('starting');
    try {
      await listener.start();
      setMic('listening');
    } catch {
      setMic('failed');
    }
  };

  return (
    <main className="welcome">
      {step === 'name' && (
        <form
          className="welcome-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) setStep('look');
          }}
        >
          <h1 className="welcome-logo" aria-label="Welcome to Clefwing!">
            <Logo size={72} />
          </h1>
          <Dragon mood="happy" size={160} />
          <label className="field">
            <span>What's your name?</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="off" />
          </label>
          <button className="btn btn-primary btn-big" disabled={!name.trim()}>
            Next
          </button>
          {onCancel && (
            <button type="button" className="btn btn-link" onClick={onCancel}>
              Back to players
            </button>
          )}
        </form>
      )}

      {step === 'look' && (
        <div className="welcome-card">
          <Dragon mood="cheer" size={200} skin={look.skin} outfit={look.outfit} />
          <h1>Hi {name.trim()}! Here's your practice dragon.</h1>
          <p>Make it yours!</p>
          <div className="swatches" role="radiogroup" aria-label="Dragon colour">
            {STARTER_SKINS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={skin === id}
                className={`swatch ${skin === id ? 'swatch-on' : ''}`}
                onClick={() => setSkin(id)}
              >
                <span className="swatch-dot" style={{ background: SWATCH[id] }} />
                {SKIN_NAMES[id]}
              </button>
            ))}
          </div>
          <p>Something to wear?</p>
          <div className="chips" role="radiogroup" aria-label="Something to wear">
            {WEAR.map((w) => (
              <button key={w.label} type="button" role="radio" aria-checked={wear === w.id} className={`chip ${wear === w.id ? 'chip-on' : ''}`} onClick={() => setWear(w.id)}>
                {w.label}
              </button>
            ))}
          </div>
          <p className="muted">You can earn more colours and outfits in the shop.</p>
          <button className="btn btn-primary btn-big" onClick={() => setStep('dragon')}>
            Next
          </button>
        </div>
      )}

      {step === 'dragon' && (
        <form
          className="welcome-card"
          onSubmit={(e) => {
            e.preventDefault();
            setStep('mic');
          }}
        >
          <Dragon mood="cheer" size={180} skin={look.skin} outfit={look.outfit} />
          <h1>Looking great! What will you call me?</h1>
          <div className="chips">
            {DRAGON_NAMES.map((n) => (
              <button type="button" key={n} className={`chip ${dragonName === n ? 'chip-on' : ''}`} onClick={() => setDragonName(n)}>
                {n}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Or make up a name</span>
            <input value={dragonName} onChange={(e) => setDragonName(e.target.value)} maxLength={16} autoComplete="off" />
          </label>
          <button className="btn btn-primary btn-big">That's my dragon!</button>
        </form>
      )}

      {step === 'mic' && (
        <div className="welcome-card">
          <Dragon mood={mic === 'heard' ? 'cheer' : mic === 'failed' ? 'sad' : 'think'} size={180} skin={look.skin} outfit={look.outfit} />
          <h1>{mic === 'heard' ? `I heard ${heard}!` : "Let's check I can hear your piano"}</h1>
          {mic === 'idle' && (
            <>
              <p>Put the iPad on the music stand, then tap the button and allow the microphone.</p>
              <button className="btn btn-primary btn-big" onClick={startMic}>
                🎤 Turn on listening
              </button>
            </>
          )}
          {mic === 'starting' && <p>Asking for the microphone…</p>}
          {mic === 'listening' && <p className="pulse">Play any note on the piano…</p>}
          {mic === 'failed' && <p>I couldn't use the microphone. You can still practise on the on-screen piano, and a grown-up can allow the microphone later in the iPad's Settings.</p>}
          {(mic === 'heard' || mic === 'failed') && (
            <button className="btn btn-primary btn-big" onClick={() => finish()}>
              Let's go!
            </button>
          )}
          {(mic === 'idle' || mic === 'listening') && (
            <>
              <button className="btn btn-link" onClick={() => finish()}>
                Skip for now
              </button>
              <button className="btn btn-link" onClick={() => finish('screen')}>
                No piano nearby? Practise on the screen
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

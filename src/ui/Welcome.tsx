// First-run setup: the player's name (kept on this device only), naming the dragon, and a mic check.
import { useEffect, useState } from 'react';
import { Dragon } from './Dragon';
import { Logo } from './Logo';
import { useProgress } from './store';
import { listener } from '../engine/listener';
import { midiName } from '../engine/music';
import { unlockSound, sfx } from './sound';

const DRAGON_NAMES = ['Ember', 'Blaze', 'Spark', 'Ziggy', 'Pip'];

export function Welcome() {
  const { update } = useProgress();
  const [step, setStep] = useState<'name' | 'dragon' | 'mic'>('name');
  const [name, setName] = useState('');
  const [dragonName, setDragonName] = useState('Ember');
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

  const finish = () => {
    void listener.stop();
    update((p) => ({ ...p, profile: { name: name.trim(), dragonName: dragonName.trim() || 'Ember' } }));
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
            if (name.trim()) setStep('dragon');
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
        </form>
      )}

      {step === 'dragon' && (
        <form
          className="welcome-card"
          onSubmit={(e) => {
            e.preventDefault();
            setStep('mic');
          }}
        >
          <Dragon mood="cheer" size={180} />
          <h1>Hi {name.trim()}! I'm your practice dragon.</h1>
          <p>What will you call me?</p>
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
          <Dragon mood={mic === 'heard' ? 'cheer' : mic === 'failed' ? 'sad' : 'think'} size={180} />
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
          {mic === 'failed' && <p>I couldn't use the microphone. You can still practise by tapping note names, and a grown-up can turn it on later in Settings › Safari › Microphone.</p>}
          {(mic === 'heard' || mic === 'failed') && (
            <button className="btn btn-primary btn-big" onClick={finish}>
              Let's go!
            </button>
          )}
          {(mic === 'idle' || mic === 'listening') && (
            <button className="btn btn-link" onClick={finish}>
              Skip for now
            </button>
          )}
        </div>
      )}
    </main>
  );
}

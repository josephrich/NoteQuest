// Grown-ups area: settings, piano tuning, and how his note reading is going.
import { useEffect, useMemo, useState } from 'react';
import { useProgress } from './store';
import { listener } from '../engine/listener';
import { freqToMidiFloat, midiName } from '../engine/music';
import { dayKey, initialProgress } from '../game/progress';
import { itemClef, itemNote, type ItemId } from '../game/content';
import { spell } from '../engine/music';
import { PRIZE_IDEAS, addPrize, markGiven, removePrize } from '../game/shop';
import { remindersSupported, requestReminderPermission } from '../platform/reminders';
import type { Screen } from './App';

function Gate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [q] = useState(() => ({ a: 12 + Math.floor(Math.random() * 8), b: 6 + Math.floor(Math.random() * 4) }));
  const [value, setValue] = useState('');
  return (
    <main className="parent gate">
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(value) === q.a * q.b) onPass();
          else setValue('');
        }}
      >
        <h1>Grown-ups only</h1>
        <label className="field">
          <span>
            What is {q.a} × {q.b}?
          </span>
          <input inputMode="numeric" autoFocus value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
        </label>
        <div className="row">
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Back
          </button>
          <button className="btn btn-primary">Open</button>
        </div>
      </form>
    </main>
  );
}

function Tuning() {
  const { progress, update } = useProgress();
  const [state, setState] = useState<'idle' | 'listening' | 'failed'>('idle');
  const [readings, setReadings] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const [live, setLive] = useState('–');

  useEffect(() => {
    if (state !== 'listening') return;
    const offLevel = listener.onLevel(({ pitch, rms, gate }) => {
      if (!pitch || pitch.clarity < 0.85 || rms < gate) return;
      const mf = freqToMidiFloat(pitch.freq, progress.settings.refA4);
      const cents = Math.round((mf - Math.round(mf)) * 100);
      setLive(`${midiName(Math.round(mf))} ${cents >= 0 ? '+' : ''}${cents}¢`);
    });
    const offNote = listener.onNote((ev) => {
      const mf = freqToMidiFloat(ev.freq, 440);
      if (Math.abs(mf - 69) > 1.5) {
        setMsg(`That sounded like ${midiName(Math.round(mf))}. Play the A above middle C.`);
        return;
      }
      setReadings((r) => {
        const next = [...r, ev.freq];
        if (next.length === 3) {
          const ref = [...next].sort((a, b) => a - b)[1];
          update((p) => ({ ...p, settings: { ...p.settings, refA4: ref } }));
          setMsg('Tuned!');
          setState('idle');
          void listener.stop();
          return [];
        }
        setMsg(`Got it (${next.length} of 3)…`);
        return next;
      });
    });
    return () => {
      offLevel();
      offNote();
    };
  }, [state, update, progress.settings.refA4]);

  const cents = Math.round(1200 * Math.log2(progress.settings.refA4 / 440));
  return (
    <section className="card">
      <h2>Piano tuning</h2>
      <p>
        A = {progress.settings.refA4.toFixed(1)} Hz ({cents === 0 ? 'in tune' : `${Math.abs(cents)} cents ${cents < 0 ? 'flat' : 'sharp'}`}). Re-tune if the piano has been tuned
        or notes are being misheard.
      </p>
      <div className="row">
        <button
          className="btn btn-secondary"
          onClick={async () => {
            try {
              await listener.start();
              setReadings([]);
              setMsg('Play the A above middle C three times.');
              setState('listening');
            } catch {
              setState('failed');
            }
          }}
        >
          Tune to my piano
        </button>
        <span className="muted">{state === 'failed' ? 'Microphone unavailable.' : msg}</span>
      </div>
      {state === 'listening' && (
        <p>
          Hearing: <strong>{live}</strong> {readings.length > 0 && `(${readings.length}/3)`}
        </p>
      )}
    </section>
  );
}

function ReadingSpeeds() {
  const { progress } = useProgress();
  const rows = useMemo(
    () =>
      Object.entries(progress.items)
        .map(([id, s]) => ({ id: id as ItemId, ...s, acc: s.seen ? s.correct / s.seen : 0 }))
        .sort((a, b) => (b.avgMs ?? 9e9) - (a.avgMs ?? 9e9)),
    [progress.items],
  );
  if (!rows.length) return <p className="muted">No notes practised yet.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Note</th>
            <th>Reading time</th>
            <th>Accuracy</th>
            <th>Seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {spell(itemNote(r.id))} <span className="muted">{itemClef(r.id)}</span>
              </td>
              <td className={r.avgMs && r.avgMs > 2500 ? 'slow' : r.avgMs && r.avgMs < 1500 ? 'fast' : ''}>{r.avgMs ? `${(r.avgMs / 1000).toFixed(1)}s` : '–'}</td>
              <td>{Math.round(r.acc * 100)}%</td>
              <td>{r.seen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Activity() {
  const { progress } = useProgress();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = dayKey(d);
    return { key, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), min: (progress.days[key]?.ms ?? 0) / 60_000 };
  });
  const goal = progress.settings.dailyGoalMin;
  const max = Math.max(goal, ...days.map((d) => d.min));
  return (
    <div className="activity" role="img" aria-label="Minutes practised over the last 14 days">
      {days.map((d) => (
        <div key={d.key} className="activity-day" title={`${d.key}: ${d.min.toFixed(1)} min`}>
          <div className="activity-bar-wrap">
            <div className={`activity-bar ${d.min >= goal ? 'met' : ''}`} style={{ height: `${(d.min / max) * 100}%` }} />
          </div>
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const EMOJIS = ['🎁', '🍕', '🍦', '🎮', '🌙', '🛝', '🎬', '📚', '⚽', '🧸'];

function Prizes() {
  const { progress, update } = useProgress();
  const [emoji, setEmoji] = useState('🎁');
  const [name, setName] = useState('');
  const [cost, setCost] = useState('300');
  const pending = progress.claims.filter((c) => !c.given);
  const player = progress.profile?.name ?? 'Your child';

  return (
    <section className="card">
      <h2>Prizes</h2>
      <p className="muted">
        Real-world rewards {player} can claim with gems. A lesson earns about 15–20 gems from its chest, so 300 gems is roughly 15–20 lessons.
      </p>

      {pending.length > 0 && (
        <div className="claims">
          <strong>Waiting for you</strong>
          {pending.map((c) => (
            <div key={c.id} className="claim-row">
              <span>
                {c.emoji} {c.name} <span className="muted">· {new Date(c.at).toLocaleDateString()}</span>
              </span>
              <button className="btn btn-secondary" onClick={() => update((p) => markGiven(p, c.id))}>
                Mark as given
              </button>
            </div>
          ))}
        </div>
      )}

      {progress.prizes.map((p) => (
        <div key={p.id} className="claim-row">
          <span>
            {p.emoji} {p.name} · 💎 {p.cost}
          </span>
          <button className="btn btn-quiet" onClick={() => update((q) => removePrize(q, p.id))} aria-label={`Remove ${p.name}`}>
            Remove
          </button>
        </div>
      ))}

      <form
        className="prize-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !(Number(cost) > 0)) return;
          update((p) => addPrize(p, { emoji, name: name.trim(), cost: Number(cost) }));
          setName('');
        }}
      >
        <select value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Prize icon">
          {EMOJIS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <input placeholder="Prize, e.g. Choose Friday dinner" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Prize name" />
        <input inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, ''))} aria-label="Cost in gems" className="prize-cost" />
        <button className="btn btn-primary">Add</button>
      </form>
      <div className="chips">
        {PRIZE_IDEAS.filter((idea) => !progress.prizes.some((p) => p.name === idea.name)).map((idea) => (
          <button key={idea.name} type="button" className="chip" onClick={() => update((p) => addPrize(p, idea))}>
            + {idea.emoji} {idea.name} ({idea.cost})
          </button>
        ))}
      </div>
    </section>
  );
}

export function Parent({ go }: { go: (s: Screen) => void }) {
  const { progress, update } = useProgress();
  const [open, setOpen] = useState(false);
  if (!open) return <Gate onPass={() => setOpen(true)} onCancel={() => go({ name: 'home' })} />;
  const profile = progress.profile!;
  const setProfile = (patch: Partial<typeof profile>) => update((p) => ({ ...p, profile: { ...p.profile!, ...patch } }));
  const setSettings = (patch: Partial<typeof progress.settings>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } }));

  return (
    <main className="parent">
      <header className="parent-top">
        <button className="btn btn-quiet" onClick={() => go({ name: 'home' })}>
          ← Back
        </button>
        <h1>Grown-ups</h1>
      </header>

      <section className="card">
        <h2>Practice</h2>
        <p>
          Streak: <strong>{progress.streak.count}</strong> days (best {progress.streak.best}) · Total XP: <strong>{progress.xp}</strong> · Gems:{' '}
          <strong>{progress.gems}</strong>
        </p>
        <Activity />
      </section>

      <section className="card">
        <h2>Note reading</h2>
        <p className="muted">Slowest notes first. Under 1.5 s is fluent reading; over 2.5 s means he is still working it out.</p>
        <ReadingSpeeds />
      </section>

      <Prizes />

      <Tuning />

      <section className="card">
        <h2>Settings</h2>
        <label className="field">
          <span>Player name</span>
          <input value={profile.name} maxLength={20} onChange={(e) => setProfile({ name: e.target.value })} />
        </label>
        <label className="field">
          <span>Dragon's name</span>
          <input value={profile.dragonName} maxLength={16} onChange={(e) => setProfile({ dragonName: e.target.value })} />
        </label>
        <label className="field">
          <span>Daily goal</span>
          <select value={progress.settings.dailyGoalMin} onChange={(e) => setSettings({ dailyGoalMin: Number(e.target.value) })}>
            {[5, 10, 15, 20].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={progress.settings.sound} onChange={(e) => setSettings({ sound: e.target.checked })} /> Sound effects
        </label>
        {remindersSupported && (
          <div className="row">
            <label className="check">
              <input
                type="checkbox"
                checked={progress.settings.reminders}
                onChange={async (e) => {
                  const on = e.target.checked;
                  if (on && !(await requestReminderPermission())) {
                    window.alert('Notifications are turned off for Clefwing. You can allow them in Settings › Notifications.');
                    return;
                  }
                  setSettings({ reminders: on });
                }}
              />{' '}
              Daily practice reminder at
            </label>
            <select
              value={progress.settings.reminderAt}
              onChange={(e) => setSettings({ reminderAt: Number(e.target.value) })}
              aria-label="Reminder time"
              className="reminder-time"
            >
              {Array.from({ length: 15 }, (_, i) => 14 * 60 + i * 30).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Troubleshooting</h2>
        <p>
          <a href="./mic-test.html">Open the microphone test page</a> to check note and chord detection.
        </p>
        <p className="muted">Progress is saved in Safari on this iPad only. Clearing Safari website data will erase it.</p>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm('Erase all progress, XP, gems and streak? This cannot be undone.')) {
              update((p) => ({ ...initialProgress(p.settings.refA4), profile: p.profile }));
            }
          }}
        >
          Reset progress
        </button>
      </section>
    </main>
  );
}

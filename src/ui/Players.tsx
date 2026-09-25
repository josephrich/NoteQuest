// "Who's playing?": pick a player, or add someone new. Each player has their own dragon and save.
import { Dragon } from './Dragon';
import { Logo } from './Logo';
import { useHousehold } from './store';
import { currentStreak } from '../game/progress';
import { readyPlayers } from '../game/players';
import type { Screen } from './App';

export function Players({ go }: { go: (s: Screen) => void }) {
  const { household, switchTo, addNew } = useHousehold();
  const now = new Date();
  return (
    <main className="players">
      <Logo size={56} />
      <h1>Who's playing?</h1>
      <div className="player-grid">
        {readyPlayers(household).map((p) => {
          const { profile, shop, xp } = p.progress;
          const streak = currentStreak(p.progress, now);
          return (
            <button
              key={p.id}
              className={`player-card ${p.id === household.active ? 'player-current' : ''}`}
              onClick={() => {
                switchTo(p.id);
                go({ name: 'home' });
              }}
            >
              <Dragon mood="happy" size={110} skin={shop.skin} outfit={shop.outfit} title={profile!.dragonName} />
              <strong>{profile!.name}</strong>
              <span className="player-stats">
                🔥 {streak} · ⚡ {xp}
              </span>
            </button>
          );
        })}
        <button className="player-card player-add" onClick={addNew}>
          <span className="player-plus" aria-hidden="true">
            +
          </span>
          <strong>Add player</strong>
          <span className="player-stats">New dragon, fresh start</span>
        </button>
      </div>
    </main>
  );
}

// The gem shop: dress up the dragon, buy streak freezes, and claim real-world prizes.
import { useState } from 'react';
import { Dragon } from './Dragon';
import { useProgress } from './store';
import { sfx, unlockSound } from './sound';
import { RARITY_STYLE } from './Chest';
import { ACCESSORIES, SKINS, FREEZE_PRICE, MAX_FREEZES, buyFreeze, buyItem, claimPrize, equip, type CatalogItem, type ShopResult } from '../game/shop';
import { CHEST_ODDS } from '../game/rewards';
import type { Screen } from './App';

type Tab = 'dragon' | 'powerups' | 'prizes';

function Price({ gems }: { gems: number }) {
  return <span className="price">💎 {gems}</span>;
}

export function Shop({ go }: { go: (s: Screen) => void }) {
  const { progress, update } = useProgress();
  const [tab, setTab] = useState<Tab>('dragon');
  const [preview, setPreview] = useState<CatalogItem | null>(null);
  const [cheer, setCheer] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmPrize, setConfirmPrize] = useState<string | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const { shop, gems } = progress;
  const dragonName = progress.profile?.dragonName ?? 'Your dragon';

  // What the big dragon shows: what he's wearing, plus the item being tried on.
  const skin = preview?.kind === 'skin' ? preview.id : shop.skin;
  const outfit = preview?.kind === 'accessory' ? { ...shop.outfit, [preview.slot]: preview.id } : shop.outfit;

  const celebrate = (msg: string) => {
    sfx.reveal('rare');
    setCheer((n) => n + 1);
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const apply = (r: ShopResult, msg: string) => {
    if (r.ok) {
      update(() => r.progress);
      celebrate(msg);
    }
    return r.ok;
  };

  const tapItem = (item: CatalogItem) => {
    unlockSound();
    if (shop.owned.includes(item.id)) {
      setPreview(null);
      update((p) => equip(p, item.id));
    } else {
      setPreview(item);
    }
  };

  const renderItem = (item: CatalogItem) => {
    const owned = shop.owned.includes(item.id);
    const wearing = item.kind === 'skin' ? shop.skin === item.id : shop.outfit[item.slot] === item.id;
    const previewing = preview?.id === item.id;
    return (
      <button
        key={item.id}
        className={`shop-item ${wearing ? 'wearing' : ''} ${previewing ? 'previewing' : ''} ${!owned && gems < item.price ? 'pricey' : ''}`}
        onClick={() => tapItem(item)}
        aria-pressed={wearing}
      >
        <Dragon size={76} mood="idle" skin={item.kind === 'skin' ? item.id : shop.skin} outfit={item.kind === 'accessory' ? { [item.slot]: item.id } : {}} title={item.name} />
        <span className="shop-item-name">{item.name}</span>
        <span className="shop-item-state">{wearing ? '✓ Wearing' : owned ? 'Tap to wear' : <Price gems={item.price} />}</span>
      </button>
    );
  };

  const prize = progress.prizes.find((p) => p.id === confirmPrize);

  return (
    <div className="shop">
      <header className="topbar">
        <button className="btn btn-quiet" onClick={() => go({ name: 'home' })}>
          ← Back
        </button>
        <h1 className="shop-title">Shop</h1>
        <span className="spacer" />
        <span className="pill pill-gem">💎 {gems}</span>
      </header>

      <section className="shop-hero">
        <Dragon key={cheer} mood={cheer ? 'cheer' : 'happy'} size={170} skin={skin} outfit={outfit} title={dragonName} />
        {toast && (
          <div className="shop-toast" role="status">
            {toast}
          </div>
        )}
      </section>

      <div className="tabs" role="tablist">
        {(
          [
            ['dragon', '🐉 Dragon'],
            ['powerups', '🧊 Power-ups'],
            ['prizes', '🎁 Prizes'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className="tab"
            onClick={() => {
              setTab(id);
              setPreview(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'dragon' && (
        <>
          <h2 className="shop-section">Colours</h2>
          <div className="shop-grid">{SKINS.map(renderItem)}</div>
          <h2 className="shop-section">Accessories</h2>
          <div className="shop-grid">{ACCESSORIES.map(renderItem)}</div>
        </>
      )}

      {tab === 'powerups' && (
        <div className="shop-list">
          <div className="shop-row">
            <span className="shop-row-icon">🧊</span>
            <div className="shop-row-text">
              <strong>Streak freeze</strong>
              <span>Keeps your streak safe if you miss a day. You have {progress.streak.freezes} of {MAX_FREEZES}.</span>
            </div>
            <button
              className="btn btn-primary"
              disabled={progress.streak.freezes >= MAX_FREEZES || gems < FREEZE_PRICE}
              onClick={() => apply(buyFreeze(progress), 'Streak freeze ready! 🧊')}
            >
              {progress.streak.freezes >= MAX_FREEZES ? 'Full' : <Price gems={FREEZE_PRICE} />}
            </button>
          </div>
        </div>
      )}

      {tab === 'prizes' && (
        <div className="shop-list">
          {progress.prizes.length === 0 && <p className="shop-empty">No prizes yet. Ask a grown-up to add some in ⚙︎ Grown-ups!</p>}
          {progress.prizes.map((p) => (
            <div key={p.id} className="shop-row">
              <span className="shop-row-icon">{p.emoji}</span>
              <div className="shop-row-text">
                <strong>{p.name}</strong>
                {gems < p.cost && <span>{p.cost - gems} more gems to go</span>}
              </div>
              <button className="btn btn-primary" disabled={gems < p.cost} onClick={() => setConfirmPrize(p.id)}>
                <Price gems={p.cost} />
              </button>
            </div>
          ))}
          {progress.claims.length > 0 && (
            <>
              <h2 className="shop-section">Claimed</h2>
              {progress.claims.slice(0, 8).map((c) => (
                <div key={c.id} className={`shop-row claim ${c.given ? 'given' : ''}`}>
                  <span className="shop-row-icon">{c.emoji}</span>
                  <div className="shop-row-text">
                    <strong>{c.name}</strong>
                    <span>{c.given ? '✓ Done!' : 'Waiting for a grown-up'}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <button className="btn btn-link odds-link" onClick={() => setShowOdds(true)}>
        ⓘ Chest odds
      </button>

      {preview && (
        <footer className="shop-buy">
          <div>
            <strong>{preview.name}</strong>
            <div className="muted">{gems >= preview.price ? 'Looks great!' : `You need ${preview.price - gems} more gems. Keep practising!`}</div>
          </div>
          <button className="btn btn-quiet" onClick={() => setPreview(null)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={gems < preview.price}
            onClick={() => {
              if (apply(buyItem(progress, preview.id), `${dragonName} loves it!`)) setPreview(null);
            }}
          >
            Buy <Price gems={preview.price} />
          </button>
        </footer>
      )}

      {prize && (
        <div className="sheet-backdrop" onClick={() => setConfirmPrize(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Claim ${prize.name}`}>
            <div className="sheet-emoji">{prize.emoji}</div>
            <h2>{prize.name}</h2>
            <p className="sheet-notes">
              Spend 💎 {prize.cost} on this prize? A grown-up will see it in ⚙︎ Grown-ups.
            </p>
            <button
              className="btn btn-primary btn-big"
              onClick={() => {
                apply(claimPrize(progress, prize.id, new Date()), 'Claimed! Show a grown-up 🎉');
                setConfirmPrize(null);
              }}
            >
              Yes, claim it!
            </button>
            <button className="btn btn-quiet" onClick={() => setConfirmPrize(null)}>
              Not yet
            </button>
          </div>
        </div>
      )}

      {showOdds && (
        <div className="sheet-backdrop" onClick={() => setShowOdds(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Chest odds">
            <h2>Chest odds</h2>
            <table className="odds">
              <tbody>
                {CHEST_ODDS.map((o) => (
                  <tr key={o.rarity}>
                    <td style={{ color: RARITY_STYLE[o.rarity].color }}>{o.rarity[0].toUpperCase() + o.rarity.slice(1)}</td>
                    <td>{o.gems}</td>
                    <td>
                      {o.chance}% <span className="muted">({o.perfectChance}% after a perfect lesson)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sheet-notes">After 4 Common chests in a row, the next one is always Rare or better. Gems can only be earned by practising.</p>
            <button className="btn btn-primary" onClick={() => setShowOdds(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

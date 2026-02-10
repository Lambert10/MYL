import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { pickCardImage } from "../lib/image";
import { useNavigate } from "react-router-dom";
import "./DecksPage.css";

function normalizeType(value) {
  const t = String(value || "").toLowerCase();
  if (!t) return "Otros";
  if (t.includes("oro")) return "Oro";
  if (t.includes("talis")) return "Talismán";
  if (t.includes("totem") || t.includes("tótem")) return "Tótem";
  if (t.includes("arma")) return "Arma";
  if (t.includes("aliado")) return "Aliado";
  return "Otros";
}

function analyzeDeck(items) {
  const counts = {
    Oro: 0,
    Talismán: 0,
    Tótem: 0,
    Arma: 0,
    Aliado: 0,
    Otros: 0,
  };
  const curve = {};
  let total = 0;
  let costKnown = 0;
  let costUnknown = 0;
  let costSum = 0;

  function parseCost(value, type) {
    const s = String(value ?? "").trim();
    if (!s) return null;
    const n = Number(s.replace(",", "."));
    if (!Number.isFinite(n)) return null;
    if (n === 0) {
      const t = String(type || "").toLowerCase();
      if (t.includes("oro")) return 0;
      return null;
    }
    return n;
  }

  for (const item of items || []) {
    const qty = Number(item?.count) || 0;
    if (!qty) continue;
    total += qty;
    const cat = normalizeType(item?.type);
    counts[cat] += qty;

    const cost = parseCost(item?.cost, item?.type);
    if (cost !== null && Number.isFinite(cost)) {
      const label = cost >= 10 ? "10+" : String(cost);
      curve[label] = (curve[label] || 0) + qty;
      costKnown += qty;
      costSum += cost * qty;
    } else {
      curve["?"] = (curve["?"] || 0) + qty;
      costUnknown += qty;
    }
  }

  const avgCost = costKnown ? costSum / costKnown : 0;
  return { total, counts, curve, costKnown, costUnknown, avgCost };
}

function curveBars(curve) {
  const keys = [];
  for (let i = 0; i <= 9; i += 1) keys.push(String(i));
  keys.push("10+");
  if (curve["?"]) keys.push("?");
  const bars = keys.map((k) => ({ label: k, value: curve[k] || 0 }));
  const max = Math.max(1, ...bars.map((b) => b.value));
  return { bars, max };
}

function buildThumbnails(items) {
  const map = new Map();
  for (const it of items || []) {
    const qty = Number(it?.count) || 1;
    const image = pickCardImage(it) || "";
    const idKey = String((it?.id ?? it?.card_id ?? it?.name ?? image) || Math.random());
    const key = image || idKey;
    if (map.has(key)) {
      const cur = map.get(key);
      cur.count += qty;
    } else {
      map.set(key, { key, image, count: qty, label: String(it?.name || it?.id || it?.card_id || "Carta") });
    }
  }
  return Array.from(map.values());
}

export default function DecksPage() {
  const navigate = useNavigate();

  const [savedDecks, setSavedDecks] = useState(() => {
    try {
      const raw = localStorage.getItem("myl_decks_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const sortedDecks = useMemo(() => {
    const copy = [...savedDecks];
    copy.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
    return copy;
  }, [savedDecks]);

  function createNewDeck() {
    try {
      localStorage.removeItem("myl_deck_v1");
      localStorage.removeItem("myl_deck_name_v1");
    } catch {}
    navigate("/");
  }

  function editDeck(deck) {
    try {
      localStorage.setItem("myl_deck_v1", JSON.stringify(deck.items || []));
      localStorage.setItem("myl_deck_name_v1", deck.name || "");
    } catch {}
    navigate("/");
  }

  useEffect(() => {
    let cancelled = false;

    async function refreshCosts() {
      if (!savedDecks.length) return;

      const ids = new Set();
      for (const deck of savedDecks) {
        for (const item of deck?.items || []) {
          const cost = item?.cost;
          if (cost === null || cost === undefined || cost === "" || cost === 0) {
            ids.add(String(item.id));
          }
        }
      }

      if (!ids.size) return;

      const results = await Promise.all(
        Array.from(ids).map((id) => apiGet(`/api/cards/${id}`).catch(() => null))
      );

      if (cancelled) return;

      const costMap = new Map();
      for (const card of results) {
        if (!card || card.id == null) continue;
        costMap.set(String(card.id), card.cost ?? null);
      }

      setSavedDecks((prev) => {
        const next = prev.map((deck) => {
          const items = (deck.items || []).map((item) => {
            const key = String(item.id);
            if (!costMap.has(key)) return item;
            return { ...item, cost: costMap.get(key) };
          });
          return { ...deck, items };
        });

        try {
          localStorage.setItem("myl_decks_v1", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }

    refreshCosts();
    return () => {
      cancelled = true;
    };
  }, []);

  function deleteDeck(deckId) {
    setSavedDecks((prev) => {
      const next = prev.filter((d) => d.id !== deckId);
      try {
        localStorage.setItem("myl_decks_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="decks-page">
      <div className="decks-header">
        <div>
          <h1>Mazos guardados</h1>
          <p>Todos los mazos tienen 50 cartas. Revisa conteo por tipo y curva de oro.</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="decks-count">Total: {sortedDecks.length}</div>
          <button className="deck-btn" onClick={createNewDeck}>Nuevo mazo</button>
        </div>
      </div>

      {sortedDecks.length === 0 ? (
        <div className="decks-empty">No hay mazos guardados todavía.</div>
      ) : (
        <div className="decks-grid">
          {sortedDecks.map((deck) => {
            const stats = analyzeDeck(deck.items || []);
            const { bars, max } = curveBars(stats.curve);
            const dateLabel = deck.createdAt
              ? new Date(deck.createdAt).toLocaleDateString()
              : "sin fecha";
            const typeSummary = [
              { key: "Aliado", label: "Aliado", count: stats.counts.Aliado, icon: <IconAliado /> },
              { key: "Talismán", label: "Talismán", count: stats.counts["Talismán"], icon: <IconTalisman /> },
              { key: "Tótem", label: "Tótem", count: stats.counts["Tótem"], icon: <IconTotem /> },
              { key: "Oro", label: "Oro", count: stats.counts.Oro, icon: <IconOro /> },
              { key: "Arma", label: "Arma", count: stats.counts.Arma, icon: <IconArma /> },
            ];
            return (
              <div key={deck.id} className="deck-card">
                {/* Thumbnails: unique images with counts for duplicates */}
                <div className="deck-thumbs">
                  {buildThumbnails(deck.items || []).map((t) => (
                    <div key={t.key} className="deck-thumb" title={`${t.label} x${t.count}`}>
                      {t.image ? (
                        <img src={t.image} alt={t.label} />
                      ) : (
                        <div className="deck-thumb__placeholder">{(t.label || "?")[0]}</div>
                      )}
                      {t.count > 1 ? <div className="deck-thumb__count">x{t.count}</div> : null}
                    </div>
                  ))}
                </div>
                <div className="deck-card__header">
                  <div>
                    <div className="deck-card__name">{deck.name || "Mazo sin nombre"}</div>
                    <div className="deck-card__meta">
                      {stats.total} / 50 · {dateLabel}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="deck-btn" onClick={() => editDeck(deck)}>Editar</button>
                    <button className="deck-btn deck-btn--ghost" onClick={() => deleteDeck(deck.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="deck-card__icons">
                  {typeSummary.map((t) => (
                    <div key={t.key} className="deck-iconCard">
                      <div className="deck-iconCard__icon">{t.icon}</div>
                      <div className="deck-iconCard__count">{t.count}</div>
                      <div className="deck-iconCard__label">{t.label}</div>
                    </div>
                  ))}
                </div>

                <div className="deck-curveHeader">
                  <div className="deck-curveTitle">Curva de oro (coste)</div>
                  <div className="deck-curveMeta">
                    Promedio: {stats.avgCost.toFixed(2)} · Sin coste: {stats.costUnknown}
                  </div>
                </div>
                <div className="deck-curve">
                  {bars.map((b) => (
                    <div key={b.label} className="deck-curve__col">
                      <div className="deck-curve__value">{b.value}</div>
                      <div
                        className="deck-curve__bar"
                        style={{ height: `${Math.max(6, (b.value / max) * 70)}px` }}
                        title={`${b.label}: ${b.value}`}
                      />
                      <div className="deck-curve__label">{b.label}</div>
                    </div>
                  ))}
                </div>
                {stats.counts.Otros ? (
                  <div className="deck-card__others">Otros: {stats.counts.Otros}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconAliado() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6 20c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4 12.5c1.1-1.2 2.5-1.9 4-2.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M20 12.5c-1.1-1.2-2.5-1.9-4-2.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTalisman() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10v14l-5 3-5-3V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 12h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTotem() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3.5" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="8" y="10" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="9" y="16.5" width="6" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconOro() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.5 12h7M12 8.5v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconArma() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 19l4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 15l7-7 2 2-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15 8l2-2 2 2-2 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

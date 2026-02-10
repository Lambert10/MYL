// frontend/src/pages/GalleryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { pickCardImage } from "../lib/image";
import CardModal from "../components/CardModal";
import "./GalleryPage.css";

export default function GalleryPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 40 });

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");
  const [edition, setEdition] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [showIncomplete, setShowIncomplete] = useState(false);

  const [meta, setMeta] = useState({ types: [], rarities: [], editions: [] });
  const [selected, setSelected] = useState(null);
  const [deckItems, setDeckItems] = useState(() => {
    try {
      const raw = localStorage.getItem("myl_deck_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [savedDecks, setSavedDecks] = useState(() => {
    try {
      const raw = localStorage.getItem("myl_decks_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [deckName, setDeckName] = useState(() => {
    try {
      return localStorage.getItem("myl_deck_name_v1") || "";
    } catch {
      return "";
    }
  });
  const [deckMsg, setDeckMsg] = useState("");

  async function loadMeta() {
    try {
      const m = await apiGet("/api/cards/meta");
      setMeta(m);
    } catch {
      // no fatal
    }
  }

  async function loadCards() {
    setLoading(true);
    setErr("");

    try {
      const qs = new URLSearchParams({
        q,
        type,
        rarity,
        edition,
        sort,
        page: String(page),
        pageSize: String(pageSize),
        requireName: showIncomplete ? "0" : "1",
        onlyWithImage: showIncomplete ? "0" : "1",
        includeStats: "1",
      });

      const res = await apiGet(`/api/cards?${qs.toString()}`);

      // IMPORTANTÍSIMO: no tocar image_url/image_custom_url, solo calculamos imgSrc
      const mapped = {
        ...res,
        items: (res.items || []).map((c) => ({
          ...c,
          __img: pickCardImage(c),
        })),
      };

      setData(mapped);
    } catch (e) {
      setErr(e?.message || "Error cargando cartas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, rarity, edition, sort, page, pageSize, showIncomplete]);

  useEffect(() => {
    try {
      localStorage.setItem("myl_deck_v1", JSON.stringify(deckItems));
    } catch {
      // ignore storage errors
    }
  }, [deckItems]);

  useEffect(() => {
    try {
      localStorage.setItem("myl_decks_v1", JSON.stringify(savedDecks));
    } catch {
      // ignore storage errors
    }
  }, [savedDecks]);

  const totalPages = useMemo(() => {
    const t = data.total || 0;
    return Math.max(1, Math.ceil(t / (data.pageSize || 40)));
  }, [data.total, data.pageSize]);

  const deckTotal = useMemo(
    () => deckItems.reduce((sum, item) => sum + (item.count || 0), 0),
    [deckItems]
  );

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

    for (const item of items) {
      const qty = Number(item.count) || 0;
      if (!qty) continue;
      total += qty;
      const cat = normalizeType(item.type);
      counts[cat] += qty;

      const cost = parseCost(item.cost, item.type);
      if (cost !== null && Number.isFinite(cost)) {
        const label = cost >= 10 ? "10+" : String(cost);
        curve[label] = (curve[label] || 0) + qty;
      } else {
        curve["?"] = (curve["?"] || 0) + qty;
      }
    }

    return { total, counts, curve };
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

  function addToDeck(card) {
    setDeckMsg("");
    setDeckItems((prev) => {
      const total = prev.reduce((sum, item) => sum + (item.count || 0), 0);
      if (total >= 50) {
        setDeckMsg("El mazo ya tiene 50 cartas.");
        return prev;
      }

      const idx = prev.findIndex((i) => String(i.id) === String(card.id));
      if (idx === -1) {
        const next = [
          ...prev,
          {
            id: card.id,
            name: card.name || "Sin nombre",
            type: card.type || "",
            rarity: card.rarity || "",
            cost: card.cost ?? null,
            image_url: card.image_url || "",
            image_custom_url: card.image_custom_url || "",
            count: 1,
          },
        ];
        return next;
      }

      const next = [...prev];
      next[idx] = {
        ...next[idx],
        count: (next[idx].count || 0) + 1,
        cost: next[idx].cost ?? card.cost ?? null,
      };
      return next;
    });
  }

  function removeFromDeck(cardId) {
    setDeckItems((prev) => {
      const idx = prev.findIndex((i) => String(i.id) === String(cardId));
      if (idx === -1) return prev;
      const current = prev[idx];
      if ((current.count || 0) <= 1) {
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }
      const next = [...prev];
      next[idx] = { ...current, count: (current.count || 0) - 1 };
      return next;
    });
  }

  function clearDeck() {
    setDeckItems([]);
    setDeckMsg("");
  }

  function saveDeck() {
    setDeckMsg("");
    if (deckTotal !== 50) {
      setDeckMsg("El mazo debe tener exactamente 50 cartas para guardarse.");
      return;
    }

    const name = String(deckName || "").trim() || `Mazo ${savedDecks.length + 1}`;
    const newDeck = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: new Date().toISOString(),
      items: deckItems,
    };
    setSavedDecks((prev) => [newDeck, ...prev]);
    setDeckName("");
    setDeckMsg(`Mazo "${name}" guardado.`);
    try {
      localStorage.removeItem("myl_deck_v1");
      localStorage.removeItem("myl_deck_name_v1");
    } catch {}
  }

  function loadDeck(deck) {
    setDeckItems(Array.isArray(deck?.items) ? deck.items : []);
    setDeckMsg(`Mazo "${deck?.name || "sin nombre"}" cargado.`);
  }

  function deleteDeck(deckId) {
    setSavedDecks((prev) => prev.filter((d) => d.id !== deckId));
  }

  return (
    <div className="myl-page">
      <div className="myl-header">
        <div>
          <h1>Galería</h1>
          <p>Click en una carta para ver detalle.</p>
          <div className="myl-box">
            {loading
              ? "Cargando..."
              : `${data.total} resultados · Página ${data.page} de ${totalPages}`}
            {!loading && data?.stats ? (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                Incompletas: {data.stats.totalIncomplete} · Completas: {data.stats.totalComplete}
              </div>
            ) : null}
          </div>
        </div>

        <div className="myl-controls">
          <input
            className="myl-input"
            placeholder="Buscar por nombre..."
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />

          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
          >
            {[20, 40, 80, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => {
              setPage(1);
              setType(e.target.value);
            }}
          >
            <option value="">Tipo (todos)</option>
            {meta.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={rarity}
            onChange={(e) => {
              setPage(1);
              setRarity(e.target.value);
            }}
          >
            <option value="">Rareza (todas)</option>
            {meta.rarities.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={edition}
            onChange={(e) => {
              setPage(1);
              setEdition(e.target.value);
            }}
          >
            <option value="">Edición (todas)</option>
            {meta.editions.map((ed) => (
              <option key={ed} value={ed}>
                {ed}
              </option>
            ))}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name_asc">Orden: Nombre A→Z</option>
            <option value="name_desc">Orden: Nombre Z→A</option>
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={showIncomplete}
              onChange={(e) => {
                setPage(1);
                setShowIncomplete(e.target.checked);
              }}
            />
            Mostrar incompletas
          </label>

          <button
            onClick={() => {
              setQ("");
              setType("");
              setRarity("");
              setEdition("");
              setSort("name_asc");
              setPage(1);
              setShowIncomplete(false);
            }}
          >
            Limpiar
          </button>
        </div>
      </div>

      {err ? <div className="myl-alert">{err}</div> : null}

      <div className="myl-layout">
        <div>
          <div className="myl-grid">
            {(data.items || []).map((card) => {
              const imgSrc = card.__img || pickCardImage(card);
              const deckItem = deckItems.find((i) => String(i.id) === String(card.id));
              const count = deckItem?.count || 0;
              return (
                <div
                  key={card.id}
                  className="myl-card"
                  onClick={() => setSelected(card)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="myl-card__imageWrap">
                    {imgSrc ? (
                      <img
                        className="myl-card__image"
                        src={imgSrc}
                        alt={card.name || "Carta"}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // si falla la URL, ocultamos imagen y mostramos fallback
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector("[data-fallback='1']")) {
                            const div = document.createElement("div");
                            div.dataset.fallback = "1";
                            div.style.opacity = "0.8";
                            div.textContent = "Sin imagen";
                            parent.appendChild(div);
                          }
                        }}
                      />
                    ) : (
                      <div style={{ opacity: 0.8 }}>Sin imagen</div>
                    )}
                  </div>

                  <div className="myl-card__body">
                    <div className="myl-card__title">{card.name || "Sin nombre"}</div>

                    <div className="myl-card__row">
                      <div className="myl-card__stats">
                        <span className="pill">
                          <span className="pill__label">C</span>
                          <span className="pill__value">{card.cost ?? "-"}</span>
                        </span>
                        <span className="pill">
                          <span className="pill__label">F</span>
                          <span className="pill__value">{card.strength ?? "-"}</span>
                        </span>
                      </div>
                      <div className="myl-card__type">
                        <span className="pill pill--soft">{card.type || "—"}</span>
                      </div>
                    </div>

                    <div className="myl-card__meta">
                      <span className="pill pill--soft">{card.rarity || "—"}</span>
                      <span className="pill pill--soft">{card.race || "—"}</span>
                      <span className="pill pill--soft">{card.edition || "—"}</span>
                    </div>

                    <p className="myl-card__ability">{card.ability || ""}</p>

                    <div className="myl-card__deckActions">
                      <button
                        className="myl-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToDeck(card);
                        }}
                        disabled={deckTotal >= 50}
                      >
                        + Agregar
                      </button>
                      {count > 0 ? (
                        <button
                          className="myl-btn myl-btn--ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromDeck(card.id);
                          }}
                        >
                          − Quitar
                        </button>
                      ) : null}
                      {count > 0 ? <span className="myl-deckCount">x{count}</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="myl-pager">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ← Anterior
            </button>
            <div className="myl-box">Página {page} / {totalPages}</div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente →
            </button>
          </div>
        </div>

        <aside className="myl-deck">
          <div className="myl-deck__header">
            <div>
              <div className="myl-deck__title">Mazo</div>
              <div className="myl-deck__subtitle">{deckTotal} / 50 cartas</div>
            </div>
            <button className="myl-btn myl-btn--ghost" onClick={clearDeck} disabled={deckItems.length === 0}>
              Vaciar
            </button>
          </div>

          {deckMsg ? <div className="myl-deck__msg">{deckMsg}</div> : null}

          <div className="myl-deck__save">
            <input
              className="myl-input"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Nombre del mazo"
            />
            <button className="myl-btn" onClick={saveDeck} disabled={deckTotal !== 50}>
              Guardar mazo
            </button>
          </div>

          {deckItems.length === 0 ? (
            <div className="myl-deck__empty">Aún no agregas cartas.</div>
          ) : (
            <div className="myl-deck__list">
              {deckItems.map((item) => {
                const src = pickCardImage(item);
                return (
                  <div key={item.id} className="myl-deck__item">
                    <div className="myl-deck__thumb">
                      {src ? (
                        <img src={src} alt={item.name} referrerPolicy="no-referrer" />
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    <div className="myl-deck__info">
                      <div className="myl-deck__name">{item.name}</div>
                      <div className="myl-deck__meta">
                        {item.type || "—"} · {item.rarity || "—"}
                      </div>
                    </div>
                    <div className="myl-deck__actions">
                      <button className="myl-btn myl-btn--ghost" onClick={() => removeFromDeck(item.id)}>
                        −
                      </button>
                      <span className="myl-deck__qty">{item.count}</span>
                      <button
                        className="myl-btn"
                        onClick={() => addToDeck(item)}
                        disabled={deckTotal >= 50}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="myl-deck__sectionTitle">Mazos guardados</div>
          {savedDecks.length === 0 ? (
            <div className="myl-deck__empty">No hay mazos guardados.</div>
          ) : (
            <div className="myl-deck__savedList">
              {savedDecks.map((deck) => {
                const stats = analyzeDeck(deck.items || []);
                const { bars, max } = curveBars(stats.curve);
                const dateLabel = deck.createdAt
                  ? new Date(deck.createdAt).toLocaleDateString()
                  : "sin fecha";
                return (
                  <div key={deck.id} className="myl-deck__savedCard">
                    <div className="myl-deck__savedHeader">
                      <div>
                        <div className="myl-deck__savedName">{deck.name}</div>
                        <div className="myl-deck__savedMeta">
                          {stats.total} / 50 · {dateLabel}
                        </div>
                      </div>
                      <div className="myl-deck__savedActions">
                        <button className="myl-btn myl-btn--ghost" onClick={() => loadDeck(deck)}>
                          Cargar
                        </button>
                        <button className="myl-btn myl-btn--ghost" onClick={() => deleteDeck(deck.id)}>
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="myl-deck__counts">
                      <span>Oros: {stats.counts.Oro}</span>
                      <span>Talismanes: {stats.counts["Talismán"]}</span>
                      <span>Tótem: {stats.counts["Tótem"]}</span>
                      <span>Armas: {stats.counts.Arma}</span>
                      <span>Aliados: {stats.counts.Aliado}</span>
                      <span>Otros: {stats.counts.Otros}</span>
                    </div>

                    <div className="myl-curve">
                      {bars.map((b) => (
                        <div key={b.label} className="myl-curve__col">
                          <div
                            className="myl-curve__bar"
                            style={{ height: `${Math.max(6, (b.value / max) * 60)}px` }}
                            title={`${b.label}: ${b.value}`}
                          />
                          <div className="myl-curve__label">{b.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      {selected ? <CardModal cardId={selected.id} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

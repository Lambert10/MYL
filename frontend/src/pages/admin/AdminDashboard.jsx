import React, { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../../lib/api";
import { pickCardImage } from "../../lib/image";
import { useAuth } from "../../auth/AuthContext.jsx";

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [cards, setCards] = useState([]);
  const [totalFromServer, setTotalFromServer] = useState(0);

  const [q, setQ] = useState("");
  const [adminPage, setAdminPage] = useState(1);
  const [adminPageSize, setAdminPageSize] = useState(200);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null); // card o null para nueva

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("all", "1");
      params.set("includeDeleted", "0");
      const data = await apiGet(`api/admin/cards?${params.toString()}`);

      const items = Array.isArray(data?.items) ? data.items : [];
      setCards(items);
      setTotalFromServer(Number(data?.total || items.length));
    } catch (e) {
      console.error(e);
      setCards([]);
      setTotalFromServer(0);
      setError("No pude cargar cartas para administración.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    setAdminPage(1);
  }, [q, adminPageSize]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return cards;

    return cards.filter((c) => {
      const name = String(c?.name || "").toLowerCase();
      const type = String(c?.type || "").toLowerCase();
      const rarity = String(c?.rarity || "").toLowerCase();
      const edition = String(c?.edition || "").toLowerCase();
      const race = String(c?.race || "").toLowerCase();
      return (
        name.includes(qq) ||
        type.includes(qq) ||
        rarity.includes(qq) ||
        edition.includes(qq) ||
        race.includes(qq)
      );
    });
  }, [cards, q]);

  const totalAdminPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / adminPageSize));
  }, [filtered.length, adminPageSize]);

  useEffect(() => {
    if (adminPage > totalAdminPages) setAdminPage(totalAdminPages);
  }, [adminPage, totalAdminPages]);

  const paged = useMemo(() => {
    const start = (adminPage - 1) * adminPageSize;
    return filtered.slice(start, start + adminPageSize);
  }, [filtered, adminPage, adminPageSize]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(card) {
    setEditing(card);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
  }

  async function handleSave(payload, mode) {
    // mode: "create" | "update"
    setSaving(true);
    setError("");

    try {
      if (mode === "create") {
        await apiPost("api/admin/cards", payload);
      } else {
        await apiPut(`api/admin/cards/${payload.id}`, payload);
      }

      await reload();
      closeEditor();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          "No pude guardar. Revisa que estés logueado como admin."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = confirm("¿Seguro que quieres borrar esta carta? (se ocultará en la galería)");
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      await apiDelete(`api/admin/cards/${id}`);
      await reload();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          "No pude borrar. Revisa que estés logueado como admin."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Bienvenido{user?.email ? `, ${user.email}` : ""}. Aquí podrás editar y completar cartas.
          </p>
          <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Cargadas en Admin: {cards.length} (Total en CSV: {totalFromServer})
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={openNew} disabled={saving}>
            + Nueva carta
          </button>

          <button className="btn" onClick={reload} disabled={loading || saving}>
            Recargar
          </button>

          <button className="btn" onClick={logout} title="Cerrar sesión" disabled={saving}>
            Logout
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, tipo, rareza, edición..."
          style={inputStyle}
        />
        <select
          value={adminPageSize}
          onChange={(e) => setAdminPageSize(Number(e.target.value))}
          style={inputStyle}
        >
          {[50, 100, 200, 500, 1000].map((n) => (
            <option key={n} value={n}>
              {n} / página
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 12 }}>
          Mostrando: {paged.length} / {filtered.length}
        </span>
        {saving ? <span className="muted" style={{ fontSize: 12 }}>Guardando…</span> : null}
      </div>

      {error && (
        <div style={{ ...boxStyle, borderColor: "rgba(244,63,94,.45)", marginTop: 14 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ ...boxStyle, marginTop: 14 }}>Cargando...</div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Imagen</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Rareza</th>
                  <th style={thStyle}>Edición</th>
                  <th style={thStyle}>Coste</th>
                  <th style={thStyle}>Fuerza</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c, idx) => (
                  <tr key={c.id ?? `${c.name_slug || c.name}-${idx}`}>
                    <td style={tdStyle}>{c.id}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700 }}>{c.name || "—"}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {c.race ? `Raza: ${c.race}` : ""}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <ThumbImage card={c} />
                    </td>
                    <td style={tdStyle}>{c.type || "—"}</td>
                    <td style={tdStyle}>{c.rarity || "—"}</td>
                    <td style={tdStyle}>{c.edition || "—"}</td>
                    <td style={tdStyle}>{c.cost ?? "—"}</td>
                    <td style={tdStyle}>{c.strength ?? "—"}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => openEdit(c)} disabled={saving}>
                          Editar
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleDelete(c.id)}
                          disabled={saving}
                          title="Borra (oculta) la carta"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="muted" style={{ fontSize: 12, marginTop: 10, padding: "0 12px 12px" }}>
              Página {adminPage} / {totalAdminPages}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
            <button
              className="btn"
              onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
              disabled={adminPage <= 1}
            >
              ← Anterior
            </button>
            <div className="muted" style={{ fontSize: 12 }}>
              Página {adminPage} / {totalAdminPages}
            </div>
            <button
              className="btn"
              onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))}
              disabled={adminPage >= totalAdminPages}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      <AdminCardEditorModal
        open={editorOpen}
        initialCard={editing}
        onClose={closeEditor}
        onSave={handleSave}
        saving={saving}
      />
    </section>
  );
}

/* -------------------- Modal Editor (Admin) -------------------- */

function AdminCardEditorModal({ open, initialCard, onClose, onSave, saving }) {
  const isNew = !initialCard;

  const [form, setForm] = useState(makeInitialForm(initialCard));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setForm(makeInitialForm(initialCard));
    setTouched(false);
  }, [initialCard, open]);

  if (!open) return null;

  function setField(k, v) {
    setTouched(true);
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function validate() {
    if (!String(form.name || "").trim()) return "El nombre es obligatorio.";
    return "";
  }

  const validationError = touched ? validate() : "";

  function handleSave() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const payload = {
      ...form,
      // si estamos editando, mandamos id
      ...(isNew ? {} : { id: initialCard.id }),
      // normalizamos números
      cost: normalizeNumOrNull(form.cost),
      strength: normalizeNumOrNull(form.strength),
    };

    onSave(payload, isNew ? "create" : "update");
  }

  return (
    <div style={modalOverlayStyle} onMouseDown={onClose}>
      <div style={modalStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>{isNew ? "Nueva carta" : "Editar carta"}</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Esto guarda en Base_MYL.csv.
            </p>
          </div>

          <button className="btn" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "260px 1fr", gap: 14 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Vista previa
            </div>
            <LargePreview
              card={{
                ...form,
                image_custom_url: form.image_custom_url,
                image_url: form.image_url,
              }}
            />
            <Field
              label="Image URL (myl.cl)"
              value={form.image_url}
              onChange={(v) => setField("image_url", v)}
              placeholder="https://api.myl.cl/static/cards/..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Nombre" value={form.name} onChange={(v) => setField("name", v)} />
            <Field label="Tipo" value={form.type} onChange={(v) => setField("type", v)} />

            <Field label="Rareza" value={form.rarity} onChange={(v) => setField("rarity", v)} />
            <Field label="Edición" value={form.edition} onChange={(v) => setField("edition", v)} />

            <Field label="Raza" value={form.race} onChange={(v) => setField("race", v)} />
            <Field label="Coste" value={form.cost} onChange={(v) => setField("cost", v)} placeholder="Ej: 3" />

            <Field
              label="Fuerza"
              value={form.strength}
              onChange={(v) => setField("strength", v)}
              placeholder="Ej: 2"
            />
            <div />

            <div style={{ gridColumn: "1 / -1" }}>
              <TextArea
                label="Habilidad"
                value={form.ability}
                onChange={(v) => setField("ability", v)}
                placeholder="Texto de habilidad..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <TextArea
                label="Descripción"
                value={form.description}
                onChange={(v) => setField("description", v)}
                placeholder="Lore, flavor, etc..."
              />
            </div>
          </div>
        </div>

        {validationError ? (
          <div style={{ marginTop: 10, color: "rgba(244,63,94,.95)", fontSize: 13 }}>
            {validationError}
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeNumOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === "null" || low === "none" || low === "undefined") return null;
  if (low === "n/d" || low === "nd" || low === "n/a" || low === "na") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function makeInitialForm(card) {
  return {
    name: card?.name || "",
    type: card?.type || "",
    rarity: card?.rarity || "",
    edition: card?.edition || "",
    race: card?.race || "",
    cost: card?.cost ?? "",
    strength: card?.strength ?? "",
    ability: card?.ability || "",
    description: card?.description || "",
    image_url: card?.image_url || "",
  };
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="muted" style={{ fontSize: 12 }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="muted" style={{ fontSize: 12 }}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
      />
    </label>
  );
}

function ThumbImage({ card }) {
  const src = pickCardImage(card);
  if (!src) return <span className="muted">—</span>;
  return (
    <img
      src={src}
      alt={card?.name || "Carta"}
      referrerPolicy="no-referrer"
      style={{
        width: 48,
        height: 68,
        objectFit: "cover",
        borderRadius: 6,
        border: "1px solid rgba(148,163,184,.2)",
        background: "rgba(2,6,23,.4)",
      }}
    />
  );
}

function LargePreview({ card }) {
  const src = pickCardImage(card);
  return (
    <div
      style={{
        width: 240,
        height: 340,
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,.2)",
        background: "rgba(2,6,23,.5)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={card?.name || "Carta"}
          referrerPolicy="no-referrer"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <span className="muted" style={{ fontSize: 12 }}>
          Sin imagen
        </span>
      )}
    </div>
  );
}

/* -------------------- Styles -------------------- */

const inputStyle = {
  background: "rgba(15,23,42,.7)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 12,
  padding: "0.65rem 0.75rem",
  outline: "none",
  width: "min(520px, 92vw)",
};

const boxStyle = {
  border: "1px solid var(--border)",
  background: "rgba(15,23,42,.5)",
  borderRadius: 12,
  padding: "0.75rem 0.85rem",
};

const tableWrapStyle = {
  border: "1px solid var(--border)",
  background: "rgba(15,23,42,.35)",
  borderRadius: 14,
  overflow: "hidden",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  fontSize: 12,
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
  background: "rgba(2,6,23,.5)",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(148,163,184,.12)",
  verticalAlign: "top",
  fontSize: 14,
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 50,
};

const modalStyle = {
  width: "min(1200px, 98vw)",
  maxHeight: "90vh",
  overflow: "auto",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "rgba(2,6,23,.95)",
  boxShadow: "0 20px 80px rgba(0,0,0,.5)",
  padding: 14,
};

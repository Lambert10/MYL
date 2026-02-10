import React, { useEffect, useMemo, useState } from "react";
import { pickCardImage } from "../lib/image";

export default function ImageModal({ open, onClose, card }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const imgSrc = useMemo(() => pickCardImage(card), [card]);

  if (!open || !card) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={card?.name || "Carta MYL"}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ padding: 16, textAlign: "center" }}>
            {imgSrc ? "Error al cargar imagen" : "Sin imagen"}
          </div>
        )}

        <div className="meta">
          <h3>{card?.name || "Sin nombre"}</h3>
          <p>
            {card?.type || ""} {card?.race ? `· ${card.race}` : ""}
          </p>
          <p>{card?.edition || ""}</p>
        </div>

        <button className="close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

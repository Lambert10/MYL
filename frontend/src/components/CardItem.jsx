import React, { useMemo, useState } from "react";
import { pickCardImage } from "../lib/image";
import "./CardItem.css";

export default function CardItem({ card, onClick }) {
  const [imgError, setImgError] = useState(false);

  const imgSrc = useMemo(() => pickCardImage(card), [card]);

  const name = card?.name?.trim?.() ? card.name : "Sin nombre";
  const ability = card?.ability?.trim?.() ? card.ability : "";
  const description = card?.description?.trim?.() ? card.description : "";
  const text = ability || description;

  const cost = card?.cost ?? null;
  const strength = card?.strength ?? null;
  const type = card?.type?.trim?.() ? card.type : "";
  const rarity = card?.rarity?.trim?.() ? card.rarity : "";
  const race = card?.race?.trim?.() ? card.race : "";

  return (
    <div className="card-item" onClick={onClick} role="button" tabIndex={0}>
      <div className="card-item__imageWrap">
        {imgSrc && !imgError ? (
          <img
            className="card-item__image"
            src={imgSrc}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="card-item__noImage">
            {imgSrc ? "Error al cargar imagen" : "Sin imagen"}
          </div>
        )}
      </div>

      <div className="card-item__body">
        <h3 className="card-item__title">{name}</h3>

        <div className="card-item__chips">
          <span className="chip">C {cost ?? "—"}</span>
          <span className="chip">F {strength ?? "—"}</span>
          {type ? <span className="chip chip--soft">{type}</span> : null}
          {rarity ? <span className="chip chip--soft">{rarity}</span> : null}
          {race ? <span className="chip chip--soft">{race}</span> : null}
        </div>

        {text ? (
          <p className="card-item__text">{text}</p>
        ) : (
          <p className="card-item__text card-item__text--muted">—</p>
        )}
      </div>
    </div>
  );
}

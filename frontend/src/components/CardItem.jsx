import React, { useState } from 'react'

export default function CardItem({ card, onClick }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <button className={`card ${loaded ? 'loaded' : ''}`} onClick={() => onClick(card)}>
      <img
        loading="lazy"
        src={card.image}
        alt={card.name || 'Carta MYL'}
        onLoad={() => setLoaded(true)}
        onError={(e) => { e.currentTarget.alt = 'Imagen no disponible' }}
      />
      <div className="caption">
        <strong>{card.name || 'Sin nombre'}</strong>
        {card.edition && <span>{card.edition}</span>}
      </div>
    </button>
  )
}
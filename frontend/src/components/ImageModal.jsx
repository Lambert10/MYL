import React, { useEffect } from 'react'

export default function ImageModal({ open, onClose, card }) {
  useEffect(() => {
    function onKey(e){ if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !card) return null
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-body" onClick={e => e.stopPropagation()}>
        <img src={card.image} alt={card.name || 'Carta MYL'} />
        <div className="meta">
          <h3>{card.name}</h3>
          <p>{card.type} {card.faction ? `· ${card.faction}` : ''}</p>
          <p>{card.edition}</p>
        </div>
        <button className="close" onClick={onClose}>×</button>
      </div>
    </div>
  )
}
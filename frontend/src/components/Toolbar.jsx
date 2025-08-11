import React from 'react'

export default function Toolbar({ filters, setFilters }) {
  return (
    <div className="toolbar">
      <input
        placeholder="Buscar carta..."
        value={filters.q}
        onChange={(e) => setFilters(f => ({ ...f, page: 1, q: e.target.value }))}
      />
      <input
        placeholder="Tipo (ej: Talismán)"
        value={filters.type}
        onChange={(e) => setFilters(f => ({ ...f, page: 1, type: e.target.value }))}
      />
      <input
        placeholder="Edición (ej: Furia)"
        value={filters.edition}
        onChange={(e) => setFilters(f => ({ ...f, page: 1, edition: e.target.value }))}
      />
    </div>
  )
}
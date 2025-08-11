import React, { useState } from 'react'
import useCards from '../hooks/useCards'
import CardItem from '../components/CardItem'
import ImageModal from '../components/ImageModal'
import Toolbar from '../components/Toolbar'
import '../styles/gallery.css'

export default function Gallery(){
  const { data, loading, error, filters, setFilters } = useCards()
  const [selected, setSelected] = useState(null)

  return (
    <section className="container">
      <h1>Cartas Mitos y Leyendas</h1>
      <Toolbar filters={filters} setFilters={setFilters} />

      {error && <p className="error">{error}</p>}
      {loading && <p className="loading">Cargando...</p>}

      <div className="grid">
        {data.items.map(card => (
          <CardItem key={card.id} card={card} onClick={setSelected} />
        ))}
      </div>

      <div className="pager">
        <button
          disabled={filters.page <= 1}
          onClick={() => setFilters(f => ({...f, page: f.page - 1}))}
        >Anterior</button>
        <span>
          Página {data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}
        </span>
        <button
          disabled={data.page * data.pageSize >= data.total}
          onClick={() => setFilters(f => ({...f, page: f.page + 1}))}
        >Siguiente</button>
      </div>

      <ImageModal open={!!selected} onClose={() => setSelected(null)} card={selected} />
    </section>
  )
}
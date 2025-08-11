import { useEffect, useState } from 'react'
import { fetchCards } from '../lib/api'

export default function useCards(initial = {}){
  const [filters, setFilters] = useState({ q: '', type: '', edition: '', page: 1, pageSize: 40, ...initial })
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 40 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true); setError(null)
    fetchCards(filters)
      .then(d => { if (alive) setData(d) })
      .catch(e => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [filters.q, filters.type, filters.edition, filters.page, filters.pageSize])

  return { data, loading, error, filters, setFilters }
}
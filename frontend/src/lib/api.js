export async function fetchCards({ q = '', type = '', edition = '', page = 1, pageSize = 40 } = {}){
  const params = new URLSearchParams({ q, type, edition, page, pageSize })
  const res = await fetch(`/api/cards?${params}`)
  if (!res.ok) throw new Error('Error cargando cartas')
  return res.json()
}
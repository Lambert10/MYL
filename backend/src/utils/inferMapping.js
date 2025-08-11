export function pickHeader(headers = [], candidates) {
  const parts = (candidates || "").split("|").map(s => s.trim().toLowerCase()).filter(Boolean);
  const low = headers.map(h => h.toLowerCase());
  for (const p of parts) {
    const idx = low.indexOf(p);
    if (idx !== -1) return headers[idx];
  }
  const heur = low.findIndex(h => /(img|image|url)/.test(h));
  return heur !== -1 ? headers[heur] : null;
}

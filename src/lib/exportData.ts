export function exportToJSON() {
  const data = localStorage.getItem('byk_v3')
  if (!data) return alert('Dışa aktarılacak veri bulunamadı.')

  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `briket-yedek-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

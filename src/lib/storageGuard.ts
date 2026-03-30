export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      alert('Depolama alanı doldu! Lütfen eski kayıtları temizleyin veya verilerinizi dışa aktarın.')
    }
    return false
  }
}

import { describe, it, expect } from 'vitest'

describe('Mali hesaplamalar', () => {
  it('haftalık ücret doğru hesaplanmalı', () => {
    const gunlukUcret = 500
    const gunSayisi = 6
    expect(gunlukUcret * gunSayisi).toBe(3000)
  })

  it('toplam üretim doğru toplanmalı', () => {
    const uretimler = [100, 200, 150]
    const toplam = uretimler.reduce((a, b) => a + b, 0)
    expect(toplam).toBe(450)
  })
})

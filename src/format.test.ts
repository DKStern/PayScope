import { describe, expect, it } from 'vitest'
import { money, parseMoney } from './format'

describe('parseMoney', () => {
  it('accepts amounts copied from the calculator and its examples', () => {
    expect(parseMoney(money('150000.50'))?.toString()).toBe('150000.5')
    expect(parseMoney('150 000 ₽')?.toString()).toBe('150000')
  })

  it('keeps numeric values available for range validation', () => {
    expect(parseMoney('-1 ₽')?.toString()).toBe('-1')
    expect(parseMoney('100000001')?.toString()).toBe('100000001')
  })

  it('rejects malformed and overprecise values', () => {
    expect(parseMoney('₽')).toBeNull()
    expect(parseMoney('150 ₽ 000')).toBeNull()
    expect(parseMoney('150 000,123 ₽')).toBeNull()
  })
})

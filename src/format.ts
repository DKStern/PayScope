import Decimal from 'decimal.js'

const rubles = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 2, minimumFractionDigits: 0,
})
const whole = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const hours = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const pension = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 })

export const money = (value: Decimal.Value) => rubles.format(new Decimal(value).toNumber())
export const requestedMoney = (value: Decimal) => money(value.ceil())
export const workTime = (value: Decimal.Value) => hours.format(new Decimal(value).toNumber())
export const points = (value: Decimal) => pension.format(value.toNumber())
export const formatExample = (value: number) => whole.format(value)

export function parseMoney(input: string) {
  const normalized = input.replace(/\s/g, '').replace(/₽$/, '').replace(',', '.')
  if (!/^-?\d+(?:\.\d{0,2})?$/.test(normalized)) return null

  return new Decimal(normalized)
}

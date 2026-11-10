import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { calculateContractor, calculateEmployment, ndfl } from './calculator'
import type { CompensationOptions, ContractorScenario } from './calculator'

const defaults: CompensationOptions = { taxes: true, leave: false, sick: false, sickDays: 5, pension: false }
const ip: ContractorScenario = { kind: 'ip' }
const npd: ContractorScenario = { kind: 'npd', client: 'companies', deduction: new Decimal(0) }

describe('annual income model', () => {
  it('applies marginal NDFL brackets and reaches the requested net income', () => {
    expect(ndfl(new Decimal(2_400_000)).toNumber()).toBe(312_000)
    expect(ndfl(new Decimal(5_000_000)).toNumber()).toBe(702_000)
    expect(ndfl(new Decimal(50_000_001)).toNumber()).toBe(9_402_000.22)

    const result = calculateEmployment(new Decimal(200_000))
    expect(result.annualNet.gte(2_400_000)).toBe(true)
    expect(result.annualNet.lt('2400000.01')).toBe(true)
    expect(result.employerCost.minus(result.annualGross).eq(result.insurance.plus(result.accident))).toBe(true)
    expect(calculateEmployment(new Decimal(300_000)).points.toNumber()).toBe(10)
  })

  it('deducts eligible IP contributions from the USN tax once', () => {
    const target = new Decimal(117_500)
    const result = calculateContractor(target, ip, defaults, new Decimal(5))

    expect(result.annualRevenue.toNumber()).toBe(1_500_000)
    expect(result.annualPayments.tax.toNumber()).toBe(20_610)
    expect(result.annualPayments.additional.toNumber()).toBe(12_000)
    expect(result.annualPayments.total.toNumber()).toBe(90_000)
    expect(result.pension.mandatoryPoints.toNumber()).toBeCloseTo(0.884, 3)
  })

  it('uses the NPD client rate, remaining deduction and inclusive annual limit', () => {
    const atLimit = calculateContractor(new Decimal(188_000), npd, defaults, new Decimal(0))
    expect(atLimit.annualRevenue.toNumber()).toBe(2_400_000)
    expect(atLimit.exceedsLimit).toBe(false)
    expect(calculateContractor(new Decimal('188000.01'), npd, defaults, new Decimal(0)).exceedsLimit).toBe(true)

    const people: ContractorScenario = { kind: 'npd', client: 'people', deduction: new Decimal(2_000) }
    const withDeduction = calculateContractor(new Decimal(100_000), people, defaults, new Decimal(0))
    expect(withDeduction.annualPayments.deduction.toNumber()).toBe(2_000)
    expect(withDeduction.annualRevenue.lt(calculateContractor(new Decimal(100_000), npd, defaults, new Decimal(0)).annualRevenue)).toBe(true)
  })

  it('reduces paid hours for leave and sickness without adding an annual expense twice', () => {
    const target = new Decimal(100_000)
    const reference = calculateEmployment(target)
    const baseline = calculateContractor(target, ip, defaults, reference.points)
    const result = calculateContractor(target, ip, { ...defaults, leave: true, sick: true }, reference.points)

    expect(result.paidHours.toNumber()).toBe(1772)
    expect(result.annualRevenue.eq(baseline.annualRevenue)).toBe(true)
    expect(result.monthlyBase.plus(result.leavePremium).plus(result.sickPremium).toNumber())
      .toBeCloseTo(result.monthlyRequest.toNumber(), 8)
  })

  it('limits voluntary pension contributions and shows an unresolved gap', () => {
    const target = new Decimal(220_000)
    const reference = calculateEmployment(target)
    const result = calculateContractor(target, ip, { ...defaults, pension: true }, reference.points)

    expect(result.pension.points.toNumber()).toBeCloseTo(8.72, 2)
    expect(result.pension.gap.gt(0)).toBe(true)
    expect(result.annualNet.gte(target.mul(12))).toBe(true)
  })

  it('uses the full-year minimum when an IP needs only a small voluntary contribution', () => {
    const target = new Decimal(17_000)
    const reference = calculateEmployment(target)
    const result = calculateContractor(target, ip, { ...defaults, pension: true }, reference.points)

    expect(result.pension.contribution.toNumber()).toBe(71_525.52)
    expect(result.pension.points.gte(reference.points)).toBe(true)
  })

  it('keeps the required target in the hypothetical case without mandatory payments', () => {
    const target = new Decimal('25000.37')
    const result = calculateContractor(target, ip, { ...defaults, taxes: false }, new Decimal(1))

    expect(result.annualRevenue.eq(target.mul(12))).toBe(true)
    expect(result.annualNet.eq(result.annualRevenue)).toBe(true)
    expect(result.pension.mandatoryPoints.gt(0)).toBe(true)
  })
})

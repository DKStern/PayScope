import Decimal from 'decimal.js'
import { rules } from './rules'

export type CompensationOptions = {
  taxes: boolean
  leave: boolean
  sick: boolean
  sickDays: number
  pension: boolean
}

export type ContractorScenario =
  | { kind: 'ip' }
  | { kind: 'npd'; client: keyof typeof rules.npd.clients; deduction: Decimal }

const zero = new Decimal(0)
const workHours = new Decimal(rules.workHours)

export function ndfl(annualSalary: Decimal) {
  let tax = zero
  let lowerLimit = 0

  for (const { limit, rate } of rules.ndfl) {
    const portion = Decimal.min(annualSalary, limit).minus(lowerLimit)
    if (portion.lte(0)) break
    tax = tax.plus(portion.mul(rate))
    lowerLimit = limit
  }

  return tax
}

function ipPayments(revenue: Decimal) {
  const { taxRate, fixed, additionalThreshold, additionalRate, additionalCap } = rules.ip
  const additional = Decimal.min(
    additionalCap,
    Decimal.max(0, revenue.minus(additionalThreshold)).mul(additionalRate),
  )
  const fixedContribution = new Decimal(fixed)
  const contributions = fixedContribution.plus(additional)
  const tax = Decimal.max(0, revenue.mul(taxRate).minus(contributions))

  return { tax, fixed: fixedContribution, additional, deduction: zero, total: tax.plus(contributions) }
}

function payments(scenario: ContractorScenario, revenue: Decimal) {
  if (scenario.kind === 'ip') return ipPayments(revenue)

  const { rate, deductionRate } = rules.npd.clients[scenario.client]
  const deduction = Decimal.min(scenario.deduction, revenue.mul(deductionRate))
  const tax = revenue.mul(rate).minus(deduction)

  return { tax, fixed: zero, additional: zero, deduction, total: tax }
}

function pensionPoints(payment: Decimal) {
  return payment.mul(rules.pension.voluntaryIndividualShare).mul(10).div(rules.pension.norm)
}

function pensionPlan(revenue: Decimal, scenario: ContractorScenario, reference: Decimal, enabled: boolean) {
  const mandatoryPayment = scenario.kind === 'ip'
    ? ipPayments(revenue).additional.plus(rules.ip.fixedPensionShare)
    : zero
  const mandatoryPoints = pensionPoints(mandatoryPayment)
  const gap = Decimal.max(0, reference.minus(mandatoryPoints))
  const needed = gap.mul(rules.pension.norm).div(10).div(rules.pension.voluntaryIndividualShare)
    .toDecimalPlaces(2, Decimal.ROUND_CEIL)
  const minimum = scenario.kind === 'ip' && needed.gt(0) ? rules.pension.ipMinimumVoluntaryPayment : 0
  const limit = new Decimal(rules.pension.maxCombinedPayment).minus(mandatoryPayment)
    .toDecimalPlaces(2, Decimal.ROUND_FLOOR)
  const contribution = enabled ? Decimal.min(Decimal.max(needed, minimum), limit) : zero
  const points = pensionPoints(mandatoryPayment.plus(contribution))

  return { contribution, mandatoryPoints, points, gap: Decimal.max(0, reference.minus(points)) }
}

function grossForNet(target: Decimal, netOf: (gross: Decimal) => Decimal) {
  let lower = new Decimal(0)
  let upper = Decimal.max(100, target.mul(100).ceil())

  while (netOf(upper.div(100)).lt(target)) upper = upper.mul(2)

  while (lower.lt(upper)) {
    const midpoint = lower.plus(upper).div(2).floor()
    if (netOf(midpoint.div(100)).gte(target)) {
      upper = midpoint
    } else {
      lower = midpoint.plus(1)
    }
  }

  return lower.div(100)
}

export function calculateEmployment(monthlyNet: Decimal) {
  const annualGross = grossForNet(monthlyNet.mul(rules.months), (gross) => gross.minus(ndfl(gross)))
  const tax = ndfl(annualGross)
  const annualNet = annualGross.minus(tax)
  const base = Decimal.min(annualGross, rules.employer.contributionBase)
  const insurance = base.mul(rules.employer.baseRate)
    .plus(annualGross.minus(base).mul(rules.employer.excessRate))
  const accident = annualGross.mul(rules.employer.accidentRate)

  return {
    annualGross, annualNet, tax, insurance, accident,
    employerCost: annualGross.plus(insurance).plus(accident),
    hourlyGross: annualGross.div(workHours),
    hourlyNet: annualNet.div(workHours),
    points: base.div(rules.employer.contributionBase).mul(10),
  }
}

export function calculateContractor(
  monthlyNet: Decimal,
  scenario: ContractorScenario,
  options: CompensationOptions,
  referencePoints: Decimal,
) {
  const annualTarget = monthlyNet.mul(rules.months)
  const obligation = (revenue: Decimal) => options.taxes ? payments(scenario, revenue).total : zero
  const netBeforePension = (revenue: Decimal) => revenue.minus(obligation(revenue))
  const baseRevenue = grossForNet(annualTarget, netBeforePension)
  const annualRevenue = options.pension
    ? grossForNet(annualTarget, (revenue) => netBeforePension(revenue)
      .minus(pensionPlan(revenue, scenario, referencePoints, true).contribution))
    : baseRevenue

  const annualPayments = payments(scenario, annualRevenue)
  const pension = pensionPlan(annualRevenue, scenario, referencePoints, options.pension)
  const annualNet = netBeforePension(annualRevenue).minus(pension.contribution)
  const afterLeave = workHours.minus(options.leave ? rules.leaveWorkdays * rules.hoursPerDay : 0)
  const paidHours = afterLeave.minus(options.sick ? options.sickDays * rules.hoursPerDay : 0)
  const monthlyBase = baseRevenue.div(rules.months)
  const monthlyWithLeave = baseRevenue.mul(workHours).div(afterLeave).div(rules.months)
  const monthlyWithSick = baseRevenue.mul(workHours).div(paidHours).div(rules.months)
  const monthlyRequest = annualRevenue.mul(workHours).div(paidHours).div(rules.months)
  const limit = scenario.kind === 'npd' ? rules.npd.limit : rules.ip.limitWithoutVat

  return {
    annualRevenue, annualNet, annualPayments, pension, paidHours, monthlyBase, monthlyRequest,
    hourlyGross: annualRevenue.div(paidHours),
    hourlyNet: annualNet.div(paidHours),
    leavePremium: monthlyWithLeave.minus(monthlyBase),
    sickPremium: monthlyWithSick.minus(monthlyWithLeave),
    pensionPremium: monthlyRequest.minus(monthlyWithSick),
    exceedsLimit: annualRevenue.gt(limit),
  }
}

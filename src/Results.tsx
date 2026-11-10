import type { ReactNode } from 'react'
import { calculateContractor, calculateEmployment } from './calculations/calculator'
import type { CompensationOptions, ContractorScenario } from './calculations/calculator'
import { rules, sources } from './calculations/rules'
import { money, points, requestedMoney, workTime } from './format'

type Employment = ReturnType<typeof calculateEmployment>
type Contractor = ReturnType<typeof calculateContractor>

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="data-row"><dt>{label}</dt><dd>{value}</dd></div>
}

function MonthlyAmounts({ gross, net, conditional }: {
  gross: Employment['annualGross'] | null
  net: Employment['annualNet'] | null
  conditional?: boolean
}) {
  return (
    <dl className="monthly-amounts">
      <DataRow label="До платежей в среднем за календарный месяц" value={gross ? money(gross.div(rules.months)) : '—'} />
      <DataRow label={conditional ? 'Условный доход в среднем за месяц' : 'На руки в среднем за месяц'}
        value={net ? money(net.div(rules.months)) : '—'} />
    </dl>
  )
}

function HourlyRates({ gross, net, conditional }: {
  gross: Employment['hourlyGross']
  net: Employment['hourlyNet']
  conditional?: boolean
}) {
  return (
    <dl className="hourly-rates">
      <DataRow label="До платежей / час" value={money(gross)} />
      <DataRow label={conditional ? 'Условно / час' : 'На руки / час'} value={money(net)} />
    </dl>
  )
}

export function EmploymentCard({ result }: { result: Employment }) {
  const { annualGross, annualNet, hourlyGross, hourlyNet, tax, insurance, accident, employerCost } = result
  const contributions = insurance.plus(accident)

  return (
    <article className="comparison-card comparison-card--benchmark" aria-labelledby="employment-title">
      <div className="card-heading">
        <div><h3 id="employment-title">ТК РФ</h3><p>Трудовой договор</p></div>
        <span className="reference-label">Эталон</span>
      </div>
      <div className="amount-block">
        <p className="amount-label">Начисленная зарплата</p>
        <p className="card-amount">{requestedMoney(annualGross.div(rules.months))}</p>
        <p className="amount-period">в среднем за месяц</p>
      </div>
      <MonthlyAmounts gross={annualGross} net={annualNet} />
      <HourlyRates gross={hourlyGross} net={hourlyNet} />
      <div className="card-controls">
        <dl className="detail-rows">
          <DataRow label="НДФЛ в месяц" value={money(tax.div(rules.months))} />
          <DataRow label="Стоимость для работодателя" value={money(employerCost.div(rules.months))} />
        </dl>
        <details className="disclosure contribution-disclosure">
          <summary>Взносы работодателя <span>{money(contributions.div(rules.months))} / мес.</span></summary>
          <dl className="detail-rows">
            <DataRow label="Единый страховой тариф" value={money(insurance.div(rules.months))} />
            <DataRow label="Травматизм · I класс" value={money(accident.div(rules.months))} />
          </dl>
          <p>Работодатель перечисляет взносы сверх начисленной зарплаты. Доход на руки от них не уменьшается.</p>
        </details>
      </div>
      <details className="disclosure card-details">
        <summary>Социальные гарантии</summary>
        <ul className="guarantees-list">
          <li><strong>Оплачиваемый отпуск.</strong> Обычно 28 календарных дней в год.</li>
          <li><strong>Больничные.</strong> Оплата зависит от страхового стажа и заработка.</li>
          <li><strong>Пенсионные права.</strong> По расчёту за год — {points(result.points)} ИПК.</li>
          <li><strong>Гарантии при увольнении.</strong> Предусмотрены Трудовым кодексом.</li>
        </ul>
      </details>
    </article>
  )
}

const optionsList = [
  { key: 'taxes', label: 'Учесть обязательные платежи' },
  { key: 'leave', label: 'Компенсировать отпуск' },
  { key: 'sick', label: 'Заложить резерв на больничные' },
  { key: 'pension', label: 'Приблизить ИПК к уровню ТК РФ' },
] as const

type ContractorProps = {
  kind: ContractorScenario['kind']
  result: Contractor
  options: CompensationOptions
  setOptions: (options: CompensationOptions) => void
  client?: 'companies' | 'people'
  onClientChange?: (client: 'companies' | 'people') => void
  deduction?: string
  onDeductionChange?: (deduction: string) => void
}

export function ContractorCard({ kind, result, options, setOptions, client, onClientChange, deduction, onDeductionChange }: ContractorProps) {
  const isIp = kind === 'ip'
  const title = isIp ? 'ИП' : 'Самозанятый'
  const limit = isIp ? rules.ip.limitWithoutVat : rules.npd.limit
  const { annualRevenue, annualPayments, pension, exceedsLimit } = result
  const npdUnavailable = !isIp && exceedsLimit

  return (
    <article className={`comparison-card${npdUnavailable ? ' comparison-card--unavailable' : ''}`} aria-labelledby={`${kind}-title`}>
      <div className="card-heading">
        <div><h3 id={`${kind}-title`}>{title}</h3><p>{isIp ? 'УСН «Доходы» · 6%' : 'Налог на профессиональный доход'}</p></div>
      </div>
      <div className="amount-block">
        {npdUnavailable ? (
          <div className="limit-warning" role="status">
            <span className="limit-warning-icon" aria-hidden="true">!</span>
            <div>
              <strong>НПД недоступен</strong>
              <p>Годовой лимит превышен. Требуется <span>{money(annualRevenue)}</span> за год при лимите <span>{money(limit)}</span>.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="amount-label">{exceedsLimit ? 'Запрос сверх порога' : 'Сколько запрашивать'}</p>
            <p className="card-amount">{requestedMoney(result.monthlyRequest)}</p>
            <p className="amount-period">{options.leave || options.sick ? 'за оплачиваемый месяц' : 'в среднем за месяц'}</p>
          </>
        )}
      </div>
      <MonthlyAmounts gross={exceedsLimit ? null : annualRevenue}
        net={exceedsLimit ? null : result.annualNet} conditional={!options.taxes} />
      {isIp && exceedsLimit && (
        <p className="limit-notice" role="status">
          Порог модели без НДС — {money(limit)}. Требуется {money(annualRevenue)} за год.
        </p>
      )}
      {!exceedsLimit && <HourlyRates gross={result.hourlyGross} net={result.hourlyNet} conditional={!options.taxes} />}

      <div className="card-controls">
        {client && onClientChange && (
          <label className="client-control">
            <span>Заказчики</span>
            <select value={client} onChange={(event) => onClientChange(event.currentTarget.value === 'people' ? 'people' : 'companies')}>
              <option value="companies">Компании и ИП · 6%</option>
              <option value="people">Физлица · 4%</option>
            </select>
          </label>
        )}
        <fieldset className="scenario-options">
          <legend>Параметры расчёта</legend>
          {optionsList.map(({ key, label }) => (
            <label className="check-control" key={key}>
              <input type="checkbox" checked={options[key]}
                onChange={(event) => setOptions({ ...options, [key]: event.currentTarget.checked })} />
              <span>{label}</span>
            </label>
          ))}
          {options.sick && (
            <label className="number-control">
              <span>Рабочих дней болезни за год</span>
              <input type="number" min="0" max="60" step="1" value={options.sickDays}
                onChange={(event) => setOptions({ ...options,
                  sickDays: Math.max(0, Math.min(60, Math.trunc(event.currentTarget.valueAsNumber || 0))),
                })} />
            </label>
          )}
          {!options.taxes && <p className="scenario-note">Условный сценарий. Обязанность платить налоги и взносы сохраняется.</p>}
        </fieldset>
      </div>

      <details className="disclosure card-details">
        <summary>Расшифровка и гарантии</summary>
        <p>
          <strong>При работе по гражданско-правовому договору трудовые гарантии по ТК РФ не предоставляются автоматически.</strong>{' '}
          До подписания договора согласуйте с заказчиком условия перерывов на отдых и на случай болезни, порядок уведомления и оплату этих периодов.
        </p>
        <dl className="detail-rows">
          <DataRow label="Базовая выручка / мес." value={money(result.monthlyBase)} />
          {options.leave && <DataRow label="Компенсация отпуска / мес." value={money(result.leavePremium)} />}
          {options.sick && <DataRow label="Резерв на больничные / мес." value={money(result.sickPremium)} />}
          {options.pension && <DataRow label="Пенсионная надбавка / мес." value={money(result.pensionPremium)} />}
          <DataRow label="Требуемая выручка за год" value={money(annualRevenue)} />
          <DataRow label="Оплачиваемые часы за год" value={workTime(result.paidHours)} />
        </dl>
        {!exceedsLimit && options.taxes && (
          <dl className="detail-rows detail-rows--separated">
            <DataRow label={isIp ? 'УСН после уменьшения / год' : 'НПД к уплате / год'} value={money(annualPayments.tax)} />
            {isIp ? <>
              <DataRow label="Фиксированные взносы / год" value={money(annualPayments.fixed)} />
              <DataRow label="Дополнительный взнос / год" value={money(annualPayments.additional)} />
            </> : <DataRow label="Использованный вычет / год" value={money(annualPayments.deduction)} />}
          </dl>
        )}
        {onDeductionChange && (
          <label className="number-control">
            <span>Остаток вычета НПД, ₽</span>
            <input type="number" min="0" max={rules.npd.deductionLimit} step="0.01" value={deduction}
              onChange={(event) => onDeductionChange(event.currentTarget.value)} />
          </label>
        )}
        {!exceedsLimit && (
          <dl className="detail-rows detail-rows--separated">
            <DataRow label={options.taxes ? 'ИПК от обязательных взносов' : 'ИПК при уплате обязательных взносов'}
              value={points(pension.mandatoryPoints)} />
            {options.pension && <>
              <DataRow label="Добровольный взнос / год" value={money(pension.contribution)} />
              <DataRow label="ИПК с добровольным взносом" value={points(pension.points)} />
            </>}
            <DataRow label="Разница с эталоном, ИПК" value={points(pension.gap)} />
          </dl>
        )}
        <p>Доступно <a href={isIp ? sources.voluntary : sources.sickNpd}>добровольное страхование на случай болезни</a>.</p>
        <p>{isIp
          ? 'Модель для ИП без работников, с правом на освобождение от НДС и без расходов на деятельность.'
          : 'НПД рассчитан для одного типа заказчиков. Режим требует соблюдения лимита и ограничений по деятельности, работникам и доходам от работодателей.'}</p>
      </details>
    </article>
  )
}

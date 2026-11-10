import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Decimal from 'decimal.js'
import { calculateContractor, calculateEmployment } from './calculations/calculator'
import type { CompensationOptions } from './calculations/calculator'
import { rules, sources } from './calculations/rules'
import { formatExample, money, parseMoney, workTime } from './format'
import { ContractorCard, EmploymentCard } from './Results'

const defaults: CompensationOptions = {
  taxes: true, leave: false, sick: false, sickDays: 5, pension: false,
}
const examples = [100_000, 150_000, 200_000]
const maxIncome = 100_000_000
const inputFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

function incomeError(raw: string, amount: Decimal | null) {
  if (!raw.trim()) return ''
  if (!amount) return 'Введите сумму в рублях, например 150 000,50 ₽.'
  if (amount.lte(0)) return 'Введите сумму больше нуля.'
  if (amount.gt(maxIncome)) return 'Введите сумму до 100 млн ₽ включительно.'
  return ''
}

function Methodology() {
  return (
    <details className="methodology disclosure" id="methodology">
      <summary>Как считаем</summary>
      <div className="methodology-content">
        <section>
          <h2>Годовая модель</h2>
          <p>Умножаем желаемую сумму на 12 и подбираем годовую зарплату или выручку. Сумма «На руки» — среднее за 12 месяцев. Запрашиваемая ставка округляется вверх до рубля. Налоги оцениваем по годовой базе, поэтому округление при реальных начислениях может отличаться.</p>
          <p>Для почасовых ставок берём {workTime(rules.workHours)} часов при 40-часовой неделе. Отпуск в 28 календарных дней моделируем как четыре недели без праздничных дней, то есть 20 рабочих дней. Для больничных используем выбранное число рабочих дней. В обоих случаях тот же годовой доход нужно заработать за меньшее число оплачиваемых часов. Размеры отпускных и пособий зависят от фактических обстоятельств.</p>
          <ul className="source-links">
            <li><a href={sources.calendar}>Перенос выходных в {rules.year} году</a></li>
            <li><a href={sources.ndfl}>Шкала НДФЛ</a></li>
            <li><a href={sources.contributions}>Страховые взносы и предельная база</a></li>
            <li><a href={sources.accident}>Тарифы на травматизм</a></li>
          </ul>
        </section>
        <section>
          <h2>Допущения и ограничения</h2>
          <p>ТК РФ — налоговый резидент, основная шкала НДФЛ без вычетов, стандартные страховые взносы. ИП — УСН «Доходы» 6% без работников, с освобождением от НДС. Фиксированные и дополнительные взносы уменьшают налог в годовой модели. НПД — один тип клиентов, остаток разового вычета по умолчанию равен нулю.</p>
          <p>ИПК отражает пенсионные права. Для оценки добровольного взноса предполагаем полный год участия в ОПС. Учитываем минимальный добровольный платёж ИП, допустимый максимум и оставшуюся разницу с эталоном. Резерв на болезнь — личный финансовый запас, условия выплат по добровольному страхованию зависят от программы.</p>
          <ul className="source-links">
            <li><a href={sources.usn}>УСН для ИП</a></li>
            <li><a href={sources.usnDeduction}>Уменьшение УСН на взносы</a></li>
            <li><a href={sources.vat}>НДС при УСН</a></li>
            <li><a href={sources.npd}>Правила НПД</a></li>
            <li><a href={sources.pension}>Расчёт ИПК</a></li>
            <li><a href={sources.voluntary}>Добровольные взносы</a></li>
            <li><a href={sources.pensionLimits}>Минимум и максимум добровольного взноса</a></li>
          </ul>
        </section>
      </div>
    </details>
  )
}

export function App() {
  const [amount, setAmount] = useState('')
  const [ipOptions, setIpOptions] = useState(defaults)
  const [npdOptions, setNpdOptions] = useState(defaults)
  const [client, setClient] = useState<'companies' | 'people'>('companies')
  const [deductionInput, setDeductionInput] = useState('0')
  const [resultAnnouncement, setResultAnnouncement] = useState('')
  const incomeControl = useRef<HTMLDivElement>(null)
  const previousPosition = useRef<DOMRect | null>(null)
  const parsed = parseMoney(amount)
  const error = incomeError(amount, parsed)
  const target = error ? null : parsed
  const targetValue = target?.toString() ?? ''
  const hasResults = Boolean(target)
  const employee = target ? calculateEmployment(target) : null
  const ip = target && employee ? calculateContractor(target, { kind: 'ip' }, ipOptions, employee.points) : null
  const deduction = Decimal.min(rules.npd.deductionLimit, Decimal.max(0, parseMoney(deductionInput) ?? 0))
  const npd = target && employee ? calculateContractor(target, { kind: 'npd', client, deduction }, npdOptions, employee.points) : null

  function changeAmount(value: string) {
    if (!hasResults && value.trim() && !incomeError(value, parseMoney(value)) &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previousPosition.current = incomeControl.current?.getBoundingClientRect() ?? null
    }
    setAmount(value)
  }

  useLayoutEffect(() => {
    const control = incomeControl.current
    const previous = previousPosition.current
    previousPosition.current = null
    if (!hasResults || !control || !previous) return

    const current = control.getBoundingClientRect()
    const animation = control.animate([
      { transform: `translate(${previous.left - current.left}px, ${previous.top - current.top}px)` },
      { transform: 'none' },
    ], { duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)' })

    return () => animation.cancel()
  }, [hasResults])

  useEffect(() => {
    if (!targetValue) return

    const timeout = window.setTimeout(() => {
      setResultAnnouncement(targetValue)
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [targetValue])

  return (
    <div className={`page${hasResults ? ' page--has-results' : ''}`}>
      <a className="skip-link" href="#calculator">К калькулятору</a>
      <header className="site-header">
        <div className="shell header-inner">
          <span className="brand">PayScope</span>
          <span className="header-year">Расчёт на {rules.year} год</span>
        </div>
      </header>
      <main className="shell main-content" id="calculator" tabIndex={-1}>
        <section className="entry" aria-labelledby="page-title">
          <div className="entry-inner">
            <div className="entry-copy">
              <h1 id="page-title">Сколько нужно зарабатывать?</h1>
              <p>Сравните зарплату по трудовому договору и выручку при работе на себя.</p>
            </div>
            <div className="income-control" ref={incomeControl}>
              <label htmlFor="monthly-income">Желаемый доход на руки в месяц</label>
              <div className="input-frame">
                <input id="monthly-income" name="monthly-income" inputMode="decimal" autoComplete="off"
                  value={amount} placeholder="Например, 150 000…" aria-describedby={error ? 'income-error' : undefined}
                  aria-invalid={Boolean(error)} onChange={(event) => changeAmount(event.currentTarget.value)}
                  onBlur={() => { if (target) setAmount(inputFormat.format(target.toNumber())) }} />
                <span className="currency" aria-hidden="true">₽</span>
              </div>
              <p id="income-error" className="input-error" aria-live="polite">{error}</p>
              <div className="examples">
                {examples.map((value) => <button key={value} type="button" aria-pressed={Boolean(target?.eq(value))}
                  onClick={() => changeAmount(formatExample(value))}>
                  {formatExample(value)} ₽
                </button>)}
              </div>
            </div>
          </div>
        </section>
        <p className="visually-hidden" role="status">
          {targetValue && targetValue === resultAnnouncement && `Результаты для дохода ${money(targetValue)} в месяц готовы.`}
        </p>
        {employee && ip && npd && (
          <section className="comparison" aria-labelledby="comparison-title">
            <div className="comparison-heading">
              <h2 id="comparison-title">Сравнение доходов</h2>
              <p>Зарплата и выручка при одном целевом доходе</p>
            </div>
            <div className="comparison-grid">
              <EmploymentCard result={employee} />
              <ContractorCard kind="ip" result={ip} options={ipOptions} setOptions={setIpOptions} />
              <ContractorCard kind="npd" result={npd} options={npdOptions} setOptions={setNpdOptions}
                client={client} onClientChange={setClient} deduction={deductionInput} onDeductionChange={setDeductionInput} />
            </div>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <div className="shell"><Methodology /></div>
      </footer>
    </div>
  )
}

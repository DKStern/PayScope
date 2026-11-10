export const rules = {
  year: 2026,
  months: 12,
  workHours: 1972,
  hoursPerDay: 8,
  leaveDays: 28,
  leaveWorkdays: 20,
  ndfl: [
    { limit: 2_400_000, rate: '0.13' },
    { limit: 5_000_000, rate: '0.15' },
    { limit: 20_000_000, rate: '0.18' },
    { limit: 50_000_000, rate: '0.20' },
    { limit: Infinity, rate: '0.22' },
  ],
  employer: {
    contributionBase: 2_979_000,
    baseRate: '0.30',
    excessRate: '0.151',
    accidentRate: '0.002',
  },
  ip: {
    taxRate: '0.06',
    fixed: 57_390,
    fixedPensionShare: '45973.87',
    additionalRate: '0.01',
    additionalThreshold: 300_000,
    additionalCap: 321_818,
    limitWithoutVat: 20_000_000,
  },
  npd: {
    limit: 2_400_000,
    deductionLimit: 10_000,
    clients: {
      companies: { rate: '0.06', deductionRate: '0.02' },
      people: { rate: '0.04', deductionRate: '0.01' },
    },
  },
  pension: {
    norm: '477235.80',
    voluntaryIndividualShare: '0.7273',
    ipMinimumVoluntaryPayment: '71525.52',
    maxCombinedPayment: '572204.16',
  },
} as const

export const sources = {
  ndfl: 'https://www.nalog.gov.ru/rn64/news/activities_fts/16639359/',
  contributions: 'https://www.nalog.gov.ru/html/sites/www.rn92.nalog.ru/24122025_NDFL%20SV.pdf',
  accident: 'https://sfr.gov.ru/employers/insurance_premiums_tariffs/~8297',
  usn: 'https://www.nalog.gov.ru/rn77/service/mp/?p=0402',
  vat: 'https://www.nalog.gov.ru/rn77/promo/new2026/',
  usnDeduction: 'https://www.nalog.gov.ru/rn93/news/activities_fts/16633718/',
  npd: 'https://npd.nalog.ru/',
  pension: 'https://sfr.gov.ru/grazhdanam/pensionnoe_obespechenie/ipk/',
  voluntary: 'https://sfr.gov.ru/employers/IP_i_samozanyatym/',
  pensionLimits: 'https://sfr.gov.ru/branches/pskov/info/~/15399',
  sickNpd: 'https://sfr.gov.ru/branches/alania/info/~/14783',
  calendar: 'https://static.government.ru/media/files/4jeB8hNKm69ggOa9yDiYOli6YoAyM21i.pdf',
} as const

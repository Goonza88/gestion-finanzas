import test from 'node:test'
import assert from 'node:assert/strict'
import { getMonthKeyFromDate, getMonthLabel, getMonthSequence } from '../src/utils/date.js'
import { getCreditMonthlyPayment, isCreditActiveInMonth, isOngoingCredit } from '../src/utils/credit.js'
import { addCreditExtraExpense, applyMonthlyTransactions, closeRecurringRule, omitCreditInstallment, summarizeRecurringHistory } from '../src/utils/monthlyRecords.js'

test('getMonthKeyFromDate keeps a valid ISO calendar date in its written month', () => {
  assert.equal(getMonthKeyFromDate('2024-02-29'), '2024-02')
  assert.equal(getMonthKeyFromDate('2024-01-01'), '2024-01')
})

test('getMonthKeyFromDate rejects missing and impossible ISO dates', () => {
  assert.equal(getMonthKeyFromDate(''), '')
  assert.equal(getMonthKeyFromDate('2023-02-29'), '')
  assert.equal(getMonthKeyFromDate('2024-04-31'), '')
  assert.equal(getMonthKeyFromDate('2024-13-01'), '')
})

test('month labels and sequences cover all months with zero-padded keys', () => {
  assert.equal(getMonthLabel('2026-03'), 'Marzo 2026')
  assert.deepEqual(getMonthSequence(2024), [
    '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
    '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
  ])
})

const fixedCredit = {
  duration: 'fixed',
  startKey: '2025-11',
  endKey: '2026-01',
  amount: 100,
  installments: 3,
  baseMonthlyPayment: 33,
}

test('fixed credit installments distribute rounding remainder across the schedule', () => {
  assert.deepEqual(
    ['2025-11', '2025-12', '2026-01'].map((month) => getCreditMonthlyPayment(fixedCredit, month)),
    [33, 33, 34],
  )
})

test('fixed credit uses its base payment outside its installment months', () => {
  assert.equal(getCreditMonthlyPayment(fixedCredit, '2025-10'), 33)
  assert.equal(getCreditMonthlyPayment(fixedCredit, '2026-02'), 33)
})

test('effective payment changes apply from their month and select the latest eligible month', () => {
  const credit = {
    ...fixedCredit,
    paymentChanges: [
      { effectiveMonth: '2026-01', monthlyPayment: 45 },
      { effectiveMonth: '2025-12', monthlyPayment: 40 },
    ],
  }
  assert.equal(getCreditMonthlyPayment(credit, '2025-11'), 33)
  assert.equal(getCreditMonthlyPayment(credit, '2025-12'), 40)
  assert.equal(getCreditMonthlyPayment(credit, '2026-02'), 45)
})

test('ongoing credit stays active after its start month and fixed credit ends on endKey', () => {
  const ongoing = { duration: 'ongoing', startKey: '2026-02', monthlyPayment: 120 }
  assert.equal(isOngoingCredit(ongoing), true)
  assert.equal(isCreditActiveInMonth(ongoing, '2026-01'), false)
  assert.equal(isCreditActiveInMonth(ongoing, '2026-02'), true)
  assert.equal(isCreditActiveInMonth(ongoing, '2030-12'), true)
  assert.equal(getCreditMonthlyPayment(ongoing, '2030-12'), 120)
  assert.equal(isCreditActiveInMonth(fixedCredit, '2025-10'), false)
  assert.equal(isCreditActiveInMonth(fixedCredit, '2026-01'), true)
  assert.equal(isCreditActiveInMonth(fixedCredit, '2026-02'), false)
})

test('monthly repetitions are stored once and do not duplicate when a month is revisited', () => {
  const budget = {
    monthlyRecords: {},
    credits: [],
    recurringRules: [{ id: 7, active: true, type: 'expense', description: 'Alquiler', amount: 300, startMonth: '2026-11' }],
  }
  const firstVisit = applyMonthlyTransactions(budget, '2026-11')
  const secondVisit = applyMonthlyTransactions(firstVisit, '2026-11')
  const transactions = secondVisit.monthlyRecords['2026-11'].transactions

  assert.equal(transactions.length, 1)
  assert.equal(transactions[0].sourceRecurringId, 7)
  assert.deepEqual(secondVisit.monthlyRecords['2026-11'].appliedRecurringIds, [7])
})

test('monthly repetitions backfill every missing month through the requested month, but not later months', () => {
  const budget = {
    monthlyRecords: {},
    credits: [],
    recurringRules: [{ id: 7, active: true, type: 'expense', description: 'Alquiler', amount: 300, startMonth: '2026-08', dayOfMonth: 5 }],
  }

  const updated = applyMonthlyTransactions(budget, '2026-11')

  assert.deepEqual(
    ['2026-08', '2026-09', '2026-10', '2026-11'].map((month) => updated.monthlyRecords[month].transactions[0].date),
    ['2026-08-05', '2026-09-05', '2026-10-05', '2026-11-05'],
  )
  assert.equal(updated.monthlyRecords['2026-12'], undefined)
})

test('catch-up respects skipped occurrences and does not recreate them', () => {
  const budget = {
    monthlyRecords: {
      '2026-09': { transactions: [], appliedRecurringIds: [7] },
    },
    credits: [],
    recurringRules: [{ id: 7, active: true, type: 'expense', description: 'Alquiler', amount: 300, startMonth: '2026-08' }],
  }

  const updated = applyMonthlyTransactions(budget, '2026-11')

  assert.equal(updated.monthlyRecords['2026-09'].transactions.length, 0)
  assert.deepEqual(updated.monthlyRecords['2026-09'].appliedRecurringIds, [7])
  assert.equal(updated.monthlyRecords['2026-08'].transactions.length, 1)
  assert.equal(updated.monthlyRecords['2026-10'].transactions.length, 1)
  assert.equal(updated.monthlyRecords['2026-11'].transactions.length, 1)
})

test('closed repetitions backfill only through their end month', () => {
  const budget = {
    monthlyRecords: {},
    credits: [],
    recurringRules: [{
      id: 7,
      active: false,
      type: 'expense',
      description: 'Servicio',
      amount: 300,
      startMonth: '2026-08',
      endMonth: '2026-10',
    }],
  }

  const updated = applyMonthlyTransactions(budget, '2026-11')

  assert.equal(updated.monthlyRecords['2026-08'].transactions.length, 1)
  assert.equal(updated.monthlyRecords['2026-09'].transactions.length, 1)
  assert.equal(updated.monthlyRecords['2026-10'].transactions.length, 1)
  assert.equal(updated.monthlyRecords['2026-11'].transactions.length, 0)
})

test('fixed credit installments become saved expenses in every due month through the current month', () => {
  const budget = {
    monthlyRecords: {},
    recurringRules: [],
    credits: [{ id: 9, name: 'Heladera', duration: 'fixed', totalPrice: 100, installments: 3, startDate: '2026-09-15' }],
  }
  const updated = applyMonthlyTransactions(budget, '2026-11')

  assert.deepEqual(['2026-09', '2026-10', '2026-11'].map((month) => (
    updated.monthlyRecords[month].transactions[0].amount
  )), [33, 33, 34])
  assert.ok(Object.values(updated.monthlyRecords).every((record) => record.transactions[0].isCreditInstallment))
})

test('omitted credit installment stays omitted after the month is reapplied', () => {
  const budget = {
    monthlyRecords: {},
    recurringRules: [],
    credits: [{ id: 9, name: 'Heladera', duration: 'fixed', totalPrice: 300, installments: 3, startDate: '2026-09-15' }],
  }
  const scheduled = applyMonthlyTransactions(budget, '2026-11')
  const installment = scheduled.monthlyRecords['2026-10'].transactions[0]
  const omitted = omitCreditInstallment(scheduled, '2026-10', installment.id)
  const reapplied = applyMonthlyTransactions(omitted, '2026-11')

  assert.equal(reapplied.monthlyRecords['2026-10'].transactions.length, 0)
  assert.deepEqual(reapplied.monthlyRecords['2026-10'].skippedCreditInstallments, [9])
})

test('a credit extra expense is saved separately and does not change its installments', () => {
  const budget = {
    monthlyRecords: {},
    recurringRules: [],
    credits: [{ id: 9, name: 'Heladera', duration: 'fixed', totalPrice: 100, installments: 3, startDate: '2026-11-15' }],
  }
  const withInstallment = applyMonthlyTransactions(budget, '2026-11')
  const withExtra = addCreditExtraExpense(withInstallment, 9, '2026-11', 50_000)
  const transactions = withExtra.monthlyRecords['2026-11'].transactions
  const installment = transactions.find((transaction) => transaction.isCreditInstallment)
  const extraExpense = transactions.find((transaction) => transaction.isCreditExtraPayment)

  assert.equal(installment.amount, 33)
  assert.equal(extraExpense.amount, 50_000)
  assert.equal(transactions.reduce((sum, transaction) => sum + transaction.amount, 0), 50_033)
  assert.equal(withExtra.credits[0].totalPrice, 100)
})

test('closing a repetition can include the current month or remove only its current occurrence', () => {
  const budget = {
    monthlyRecords: {
      '2026-10': { transactions: [{ id: 1, sourceRecurringId: 4, amount: 250 }] },
      '2026-11': { transactions: [{ id: 2, sourceRecurringId: 4, amount: 250 }], appliedRecurringIds: [4] },
    },
    credits: [],
    recurringRules: [{ id: 4, active: true, type: 'expense', description: 'Servicio', amount: 250, startMonth: '2026-10' }],
  }
  const included = closeRecurringRule(budget, 4, '2026-11', true)
  const excluded = closeRecurringRule(budget, 4, '2026-11', false)

  assert.equal(included.recurringRules[0].active, false)
  assert.equal(included.recurringRules[0].endMonth, '2026-11')
  assert.equal(included.monthlyRecords['2026-11'].transactions.length, 1)
  assert.equal(excluded.recurringRules[0].endMonth, '2026-10')
  assert.equal(excluded.monthlyRecords['2026-10'].transactions.length, 1)
  assert.equal(excluded.monthlyRecords['2026-11'].transactions.length, 0)
})

test('closing a repetition with yes creates the current month occurrence if it was still missing', () => {
  const budget = {
    monthlyRecords: {},
    credits: [],
    recurringRules: [{ id: 4, active: true, type: 'expense', description: 'Servicio', amount: 250, startMonth: '2026-11' }],
  }
  const closed = closeRecurringRule(budget, 4, '2026-11', true)
  const currentTransactions = closed.monthlyRecords['2026-11'].transactions

  assert.equal(closed.recurringRules[0].active, false)
  assert.equal(closed.recurringRules[0].countedCurrentMonth, true)
  assert.equal(currentTransactions.length, 1)
  assert.equal(currentTransactions[0].amount, 250)
})

test('recurring history totals the saved transaction amounts', () => {
  const summary = summarizeRecurringHistory(
    { id: 4 },
    {
      '2026-10': { transactions: [{ sourceRecurringId: 4, amount: 250 }] },
      '2026-11': { transactions: [{ sourceRecurringId: 4, amount: 300 }] },
    },
  )

  assert.deepEqual(summary, { months: 2, total: 550 })
})

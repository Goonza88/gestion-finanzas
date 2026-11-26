import test from 'node:test'
import assert from 'node:assert/strict'
import { readStoredBudget } from '../src/utils/storedBudget.js'
import { isValidBudgetData } from '../src/utils/budgetValidation.js'

const key = 'budget'
const createDefault = () => ({ year: 2026, monthlyRecords: {}, credits: [], recurringRules: [] })
const isValid = (value) => Boolean(value && typeof value === 'object' && value.valid === true)

function createStorage(value) {
  const values = new Map(value === undefined ? [] : [[key, value]])
  return {
    values,
    getItem: (itemKey) => values.get(itemKey) ?? null,
    setItem: (itemKey, itemValue) => values.set(itemKey, itemValue),
  }
}

function withoutConsoleErrors(callback) {
  const originalError = console.error
  console.error = () => {}
  try {
    return callback()
  } finally {
    console.error = originalError
  }
}

test('a valid saved budget loads and fills fields introduced by newer versions', () => {
  const storage = createStorage(JSON.stringify({ valid: true, year: 2025, monthlyRecords: {}, credits: [] }))

  const result = readStoredBudget(storage, key, createDefault, isValid)

  assert.equal(result.status, 'valid')
  assert.equal(result.data.year, 2025)
  assert.deepEqual(result.data.recurringRules, [])
})

test('malformed saved JSON is preserved and marked for recovery', () => {
  const original = '{not valid json'
  const storage = createStorage(original)

  const result = withoutConsoleErrors(() => readStoredBudget(storage, key, createDefault, isValid))

  assert.equal(result.status, 'invalid')
  assert.deepEqual(result.data, createDefault())
  assert.equal(storage.values.get(key), original)
})

test('valid JSON with an invalid budget shape is preserved and marked for recovery', () => {
  const original = JSON.stringify({ valid: false, transactions: [] })
  const storage = createStorage(original)

  const result = readStoredBudget(storage, key, createDefault, isValid)

  assert.equal(result.status, 'invalid')
  assert.equal(storage.values.get(key), original)
})

test('missing data creates a default budget without marking recovery as necessary', () => {
  const storage = createStorage()

  const result = readStoredBudget(storage, key, createDefault, isValid)

  assert.equal(result.status, 'empty')
  assert.deepEqual(result.data, createDefault())
})

test('inaccessible storage is marked for recovery instead of treated as empty', () => {
  const storage = { getItem() { throw new Error('storage unavailable') } }

  const result = withoutConsoleErrors(() => readStoredBudget(storage, key, createDefault, isValid))

  assert.equal(result.status, 'unavailable')
  assert.deepEqual(result.data, createDefault())
})

test('malformed skipped-credit markers are rejected and preserved for recovery', () => {
  const original = JSON.stringify({
    year: 2026,
    monthlyRecords: {
      '2026-01': { transactions: [], skippedCreditInstallments: { creditId: 7 } },
    },
    credits: [],
  })
  const storage = createStorage(original)

  const result = readStoredBudget(storage, key, createDefault, isValidBudgetData)

  assert.equal(result.status, 'invalid')
  assert.equal(storage.values.get(key), original)
})

import type { FormulaNode, FormulaFn } from './grammar'

export type FormulaValue = string | number | boolean | null

export type FormulaContext = {
  fieldValues: Record<string, FormulaValue>
}

export class FormulaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FormulaError'
  }
}

const MAX_STEPS = 5000

type Counter = { steps: number }

export function evaluateFormula(
  node: FormulaNode,
  context: FormulaContext,
): FormulaValue {
  const counter: Counter = { steps: 0 }
  return evalNode(node, context, counter)
}

function tick(counter: Counter) {
  counter.steps += 1
  if (counter.steps > MAX_STEPS) {
    throw new FormulaError('Formula evaluation exceeded step limit.')
  }
}

function evalNode(node: FormulaNode, ctx: FormulaContext, counter: Counter): FormulaValue {
  tick(counter)
  switch (node.kind) {
    case 'number':
    case 'string':
    case 'boolean':
      return node.value
    case 'null':
      return null
    case 'field': {
      const v = ctx.fieldValues[node.fieldId]
      return v === undefined ? null : v
    }
    case 'unary': {
      const arg = evalNode(node.arg, ctx, counter)
      if (node.op === '-') {
        const num = toNumber(arg)
        return num === null ? null : -num
      }
      return !toBoolean(arg)
    }
    case 'binary': {
      // short-circuit evaluation for boolean ops
      if (node.op === '&&') {
        const left = evalNode(node.left, ctx, counter)
        if (!toBoolean(left)) return left
        return evalNode(node.right, ctx, counter)
      }
      if (node.op === '||') {
        const left = evalNode(node.left, ctx, counter)
        if (toBoolean(left)) return left
        return evalNode(node.right, ctx, counter)
      }
      const a = evalNode(node.left, ctx, counter)
      const b = evalNode(node.right, ctx, counter)
      switch (node.op) {
        case '+':
          if (typeof a === 'string' || typeof b === 'string') return `${valueToString(a)}${valueToString(b)}`
          return toNum(a) + toNum(b)
        case '-':
          return toNum(a) - toNum(b)
        case '*':
          return toNum(a) * toNum(b)
        case '/': {
          const d = toNum(b)
          if (d === 0) return null
          return toNum(a) / d
        }
        case '%': {
          const d = toNum(b)
          if (d === 0) return null
          return toNum(a) % d
        }
        case '==':
          return looseEqual(a, b)
        case '!=':
          return !looseEqual(a, b)
        case '<':
          return compare(a, b) < 0
        case '<=':
          return compare(a, b) <= 0
        case '>':
          return compare(a, b) > 0
        case '>=':
          return compare(a, b) >= 0
        case 'concat':
          return `${valueToString(a)}${valueToString(b)}`
        default:
          throw new FormulaError(`Unknown operator "${node.op}"`)
      }
    }
    case 'ternary': {
      const cond = evalNode(node.cond, ctx, counter)
      return toBoolean(cond)
        ? evalNode(node.consequent, ctx, counter)
        : evalNode(node.alternate, ctx, counter)
    }
    case 'call': {
      const args = node.args.map((a) => evalNode(a, ctx, counter))
      return callFn(node.fn, args)
    }
  }
}

function callFn(fn: FormulaFn, args: FormulaValue[]): FormulaValue {
  switch (fn) {
    case 'if':
      return toBoolean(args[0] ?? null) ? args[1] ?? null : args[2] ?? null
    case 'now':
      return new Date().toISOString()
    case 'today':
      return new Date().toISOString().slice(0, 10)
    case 'formatDate': {
      const dateRaw = args[0]
      const fmt = typeof args[1] === 'string' ? args[1] : 'YYYY-MM-DD'
      if (typeof dateRaw !== 'string') return null
      const date = new Date(dateRaw)
      if (Number.isNaN(date.getTime())) return null
      return formatDate(date, fmt)
    }
    case 'round':
      return Math.round(toNum(args[0] ?? 0))
    case 'floor':
      return Math.floor(toNum(args[0] ?? 0))
    case 'ceil':
      return Math.ceil(toNum(args[0] ?? 0))
    case 'abs':
      return Math.abs(toNum(args[0] ?? 0))
    case 'min': {
      const nums = args.map(toNum)
      return nums.length === 0 ? null : Math.min(...nums)
    }
    case 'max': {
      const nums = args.map(toNum)
      return nums.length === 0 ? null : Math.max(...nums)
    }
    case 'len':
      return valueToString(args[0] ?? '').length
    case 'lower':
      return valueToString(args[0] ?? '').toLowerCase()
    case 'upper':
      return valueToString(args[0] ?? '').toUpperCase()
    case 'trim':
      return valueToString(args[0] ?? '').trim()
    case 'concat':
      return args.map(valueToString).join('')
    case 'isEmpty': {
      const v = args[0] ?? null
      if (v === null || v === undefined) return true
      if (typeof v === 'string' && v.trim() === '') return true
      return false
    }
    case 'isNotEmpty': {
      const v = args[0] ?? null
      if (v === null || v === undefined) return false
      if (typeof v === 'string' && v.trim() === '') return false
      return true
    }
  }
}

function toNumber(value: FormulaValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function toNum(value: FormulaValue) {
  return toNumber(value) ?? 0
}

function toBoolean(value: FormulaValue) {
  if (value === null || value === undefined) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value.length > 0 && value.toLowerCase() !== 'false'
  return Boolean(value)
}

function valueToString(value: FormulaValue) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return String(value)
}

function looseEqual(a: FormulaValue, b: FormulaValue) {
  if (a === null || b === null) return a === b
  if (typeof a === typeof b) return a === b
  if (typeof a === 'number' || typeof b === 'number') {
    return toNumber(a) === toNumber(b)
  }
  return valueToString(a) === valueToString(b)
}

function compare(a: FormulaValue, b: FormulaValue) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const aNum = toNumber(a)
  const bNum = toNumber(b)
  if (aNum !== null && bNum !== null) return aNum - bNum
  return valueToString(a).localeCompare(valueToString(b))
}

function formatDate(date: Date, fmt: string) {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  const y = date.getFullYear()
  const M = date.getMonth() + 1
  const d = date.getDate()
  const h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  return fmt
    .replace(/YYYY/g, String(y))
    .replace(/MM/g, pad(M))
    .replace(/DD/g, pad(d))
    .replace(/HH/g, pad(h))
    .replace(/mm/g, pad(m))
    .replace(/ss/g, pad(s))
    .replace(/MMM/g, date.toLocaleString(undefined, { month: 'short' }))
    .replace(/MMMM/g, date.toLocaleString(undefined, { month: 'long' }))
}

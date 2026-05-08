// Whitelisted AST grammar for SKAIL formula fields.
// No JavaScript eval. Every expression is parsed into typed AST nodes
// that the evaluator interprets with bounded operations only.

export type FormulaNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null' }
  | { kind: 'field'; fieldId: string }
  | { kind: 'unary'; op: '-' | '!'; arg: FormulaNode }
  | { kind: 'binary'; op: BinaryOp; left: FormulaNode; right: FormulaNode }
  | { kind: 'ternary'; cond: FormulaNode; consequent: FormulaNode; alternate: FormulaNode }
  | { kind: 'call'; fn: FormulaFn; args: FormulaNode[] }

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '%'
  | '==' | '!=' | '>' | '>=' | '<' | '<='
  | '&&' | '||'
  | 'concat'

export const FORMULA_FUNCTIONS = [
  'if',
  'now',
  'today',
  'formatDate',
  'round',
  'floor',
  'ceil',
  'abs',
  'min',
  'max',
  'len',
  'lower',
  'upper',
  'trim',
  'concat',
  'isEmpty',
  'isNotEmpty',
] as const
export type FormulaFn = (typeof FORMULA_FUNCTIONS)[number]

export type FormulaParseResult =
  | { ok: true; ast: FormulaNode; referencedFieldIds: string[] }
  | { ok: false; error: string; offset?: number }

// Parser for a tiny expression language.
// Supports: number/string/bool/null literals, field refs (`{fieldId}` or `field("name")`),
// arithmetic, comparisons, boolean ops, ternary, function calls.
export function parseFormula(source: string): FormulaParseResult {
  const tokens = tokenize(source)
  if (!tokens.ok) return { ok: false, error: tokens.error, offset: tokens.offset }

  const referenced = new Set<string>()
  const parser = new Parser(tokens.tokens, source, referenced)
  try {
    const node = parser.parseExpression()
    parser.expectEnd()
    return { ok: true, ast: node, referencedFieldIds: Array.from(referenced) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse error'
    return { ok: false, error: message }
  }
}

type Token =
  | { type: 'number'; value: number; pos: number }
  | { type: 'string'; value: string; pos: number }
  | { type: 'ident'; value: string; pos: number }
  | { type: 'field'; fieldId: string; pos: number }
  | { type: 'op'; value: string; pos: number }
  | { type: 'paren'; value: '(' | ')'; pos: number }
  | { type: 'comma'; pos: number }
  | { type: 'qmark'; pos: number }
  | { type: 'colon'; pos: number }

type TokenizeResult =
  | { ok: true; tokens: Token[] }
  | { ok: false; error: string; offset: number }

const SINGLE_OPS = new Set(['+', '-', '*', '/', '%'])
const COMPOUND_HEADS = new Set(['=', '!', '<', '>', '&', '|'])

function tokenize(source: string): TokenizeResult {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]!
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch, pos: i })
      i += 1
      continue
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', pos: i })
      i += 1
      continue
    }
    if (ch === '?') {
      tokens.push({ type: 'qmark', pos: i })
      i += 1
      continue
    }
    if (ch === ':') {
      tokens.push({ type: 'colon', pos: i })
      i += 1
      continue
    }
    if (ch === '{') {
      const close = source.indexOf('}', i + 1)
      if (close === -1) return { ok: false, error: 'Unterminated field reference', offset: i }
      const fieldId = source.slice(i + 1, close).trim()
      if (fieldId.length === 0) return { ok: false, error: 'Empty field reference', offset: i }
      tokens.push({ type: 'field', fieldId, pos: i })
      i = close + 1
      continue
    }
    if (ch === '"' || ch === "'") {
      const quote = ch
      let end = i + 1
      let value = ''
      while (end < source.length) {
        const c = source[end]!
        if (c === '\\' && end + 1 < source.length) {
          const next = source[end + 1]!
          value += next === 'n' ? '\n' : next === 't' ? '\t' : next
          end += 2
          continue
        }
        if (c === quote) break
        value += c
        end += 1
      }
      if (end >= source.length) return { ok: false, error: 'Unterminated string', offset: i }
      tokens.push({ type: 'string', value, pos: i })
      i = end + 1
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      let end = i
      while (end < source.length && /[0-9.]/.test(source[end]!)) end += 1
      const numText = source.slice(i, end)
      const value = Number(numText)
      if (!Number.isFinite(value)) return { ok: false, error: 'Invalid number', offset: i }
      tokens.push({ type: 'number', value, pos: i })
      i = end
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      let end = i
      while (end < source.length && /[A-Za-z0-9_]/.test(source[end]!)) end += 1
      const value = source.slice(i, end)
      tokens.push({ type: 'ident', value, pos: i })
      i = end
      continue
    }
    if (SINGLE_OPS.has(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i })
      i += 1
      continue
    }
    if (COMPOUND_HEADS.has(ch)) {
      const next = source[i + 1] ?? ''
      let op: string = ch
      if (
        (ch === '=' && next === '=') ||
        (ch === '!' && next === '=') ||
        (ch === '<' && next === '=') ||
        (ch === '>' && next === '=') ||
        (ch === '&' && next === '&') ||
        (ch === '|' && next === '|')
      ) {
        op = ch + next
        tokens.push({ type: 'op', value: op, pos: i })
        i += 2
        continue
      }
      if (ch === '!' || ch === '<' || ch === '>') {
        tokens.push({ type: 'op', value: ch, pos: i })
        i += 1
        continue
      }
      return { ok: false, error: `Unexpected character "${ch}"`, offset: i }
    }
    return { ok: false, error: `Unexpected character "${ch}"`, offset: i }
  }
  return { ok: true, tokens }
}

class Parser {
  private idx = 0
  constructor(
    private readonly tokens: Token[],
    private readonly source: string,
    private readonly referenced: Set<string>,
  ) {}

  expectEnd() {
    if (this.idx < this.tokens.length) {
      throw new Error(`Unexpected token at position ${this.tokens[this.idx]!.pos}`)
    }
  }

  parseExpression(): FormulaNode {
    return this.parseTernary()
  }

  parseTernary(): FormulaNode {
    const cond = this.parseLogicalOr()
    const next = this.peek()
    if (next?.type === 'qmark') {
      this.consume()
      const consequent = this.parseLogicalOr()
      const colon = this.peek()
      if (colon?.type !== 'colon') throw new Error('Expected ":" in ternary')
      this.consume()
      const alternate = this.parseLogicalOr()
      return { kind: 'ternary', cond, consequent, alternate }
    }
    return cond
  }

  parseLogicalOr(): FormulaNode {
    let left = this.parseLogicalAnd()
    while (this.matchOp('||')) {
      const right = this.parseLogicalAnd()
      left = { kind: 'binary', op: '||', left, right }
    }
    return left
  }

  parseLogicalAnd(): FormulaNode {
    let left = this.parseEquality()
    while (this.matchOp('&&')) {
      const right = this.parseEquality()
      left = { kind: 'binary', op: '&&', left, right }
    }
    return left
  }

  parseEquality(): FormulaNode {
    let left = this.parseComparison()
    while (true) {
      const op = this.peek()
      if (op?.type === 'op' && (op.value === '==' || op.value === '!=')) {
        this.consume()
        const right = this.parseComparison()
        left = { kind: 'binary', op: op.value, left, right }
        continue
      }
      break
    }
    return left
  }

  parseComparison(): FormulaNode {
    let left = this.parseAdditive()
    while (true) {
      const op = this.peek()
      if (op?.type === 'op' && ['<', '<=', '>', '>='].includes(op.value)) {
        this.consume()
        const right = this.parseAdditive()
        left = { kind: 'binary', op: op.value as BinaryOp, left, right }
        continue
      }
      break
    }
    return left
  }

  parseAdditive(): FormulaNode {
    let left = this.parseMultiplicative()
    while (true) {
      const op = this.peek()
      if (op?.type === 'op' && (op.value === '+' || op.value === '-')) {
        this.consume()
        const right = this.parseMultiplicative()
        left = { kind: 'binary', op: op.value, left, right }
        continue
      }
      break
    }
    return left
  }

  parseMultiplicative(): FormulaNode {
    let left = this.parseUnary()
    while (true) {
      const op = this.peek()
      if (op?.type === 'op' && (op.value === '*' || op.value === '/' || op.value === '%')) {
        this.consume()
        const right = this.parseUnary()
        left = { kind: 'binary', op: op.value, left, right }
        continue
      }
      break
    }
    return left
  }

  parseUnary(): FormulaNode {
    const next = this.peek()
    if (next?.type === 'op' && (next.value === '-' || next.value === '!')) {
      this.consume()
      const arg = this.parseUnary()
      return { kind: 'unary', op: next.value as '-' | '!', arg }
    }
    return this.parsePrimary()
  }

  parsePrimary(): FormulaNode {
    const tok = this.peek()
    if (!tok) throw new Error('Unexpected end of expression')
    if (tok.type === 'number') {
      this.consume()
      return { kind: 'number', value: tok.value }
    }
    if (tok.type === 'string') {
      this.consume()
      return { kind: 'string', value: tok.value }
    }
    if (tok.type === 'field') {
      this.consume()
      this.referenced.add(tok.fieldId)
      return { kind: 'field', fieldId: tok.fieldId }
    }
    if (tok.type === 'paren' && tok.value === '(') {
      this.consume()
      const inner = this.parseExpression()
      const close = this.peek()
      if (close?.type !== 'paren' || close.value !== ')') {
        throw new Error('Expected ")"')
      }
      this.consume()
      return inner
    }
    if (tok.type === 'ident') {
      // boolean / null / function call
      if (tok.value === 'true' || tok.value === 'false') {
        this.consume()
        return { kind: 'boolean', value: tok.value === 'true' }
      }
      if (tok.value === 'null') {
        this.consume()
        return { kind: 'null' }
      }
      // function call
      this.consume()
      const open = this.peek()
      if (open?.type !== 'paren' || open.value !== '(') {
        throw new Error(`Unknown identifier "${tok.value}"`)
      }
      this.consume()
      const args: FormulaNode[] = []
      const next = this.peek()
      if (!(next?.type === 'paren' && next.value === ')')) {
        args.push(this.parseExpression())
        while (this.peek()?.type === 'comma') {
          this.consume()
          args.push(this.parseExpression())
        }
      }
      const closeParen = this.peek()
      if (closeParen?.type !== 'paren' || closeParen.value !== ')') {
        throw new Error('Expected ")" closing function call')
      }
      this.consume()
      const fn = tok.value as FormulaFn
      if (!FORMULA_FUNCTIONS.includes(fn)) {
        throw new Error(`Unknown function "${tok.value}"`)
      }
      return { kind: 'call', fn, args }
    }
    throw new Error(`Unexpected token at position ${tok.pos}`)
  }

  private peek(): Token | null {
    return this.tokens[this.idx] ?? null
  }

  private consume() {
    this.idx += 1
  }

  private matchOp(value: string) {
    const tok = this.peek()
    if (tok?.type === 'op' && tok.value === value) {
      this.consume()
      return true
    }
    return false
  }
}

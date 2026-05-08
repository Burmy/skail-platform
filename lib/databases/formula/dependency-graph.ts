import type { FormulaNode } from './grammar'

export type FormulaEntry = {
  fieldId: string
  ast: FormulaNode
  dependsOn: string[]
}

// Build adjacency map and detect cycles via Tarjan-like DFS.
export function detectCycles(entries: FormulaEntry[]): { cycles: string[][] } {
  const byId = new Map(entries.map((e) => [e.fieldId, e]))
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const cycles: string[][] = []
  const stack: string[] = []

  function dfs(fieldId: string) {
    const entry = byId.get(fieldId)
    if (!entry) return
    if (visiting.has(fieldId)) {
      const idx = stack.indexOf(fieldId)
      if (idx !== -1) cycles.push(stack.slice(idx).concat(fieldId))
      return
    }
    if (visited.has(fieldId)) return
    visiting.add(fieldId)
    stack.push(fieldId)
    for (const dep of entry.dependsOn) {
      if (!byId.has(dep)) continue
      dfs(dep)
    }
    stack.pop()
    visiting.delete(fieldId)
    visited.add(fieldId)
  }

  for (const entry of entries) dfs(entry.fieldId)

  return { cycles }
}

// Topologically sort formula entries so dependencies are evaluated first.
// Entries that participate in a cycle are returned at the end (caller decides
// how to handle — usually return null for them).
export function topologicallySort(entries: FormulaEntry[]) {
  const byId = new Map(entries.map((e) => [e.fieldId, e]))
  const inCycle = new Set<string>()
  const { cycles } = detectCycles(entries)
  for (const c of cycles) for (const id of c) inCycle.add(id)

  const seen = new Set<string>()
  const order: FormulaEntry[] = []

  function visit(fieldId: string) {
    const entry = byId.get(fieldId)
    if (!entry || seen.has(fieldId) || inCycle.has(fieldId)) return
    seen.add(fieldId)
    for (const dep of entry.dependsOn) {
      if (byId.has(dep)) visit(dep)
    }
    order.push(entry)
  }

  for (const entry of entries) visit(entry.fieldId)
  return { order, inCycle: Array.from(inCycle) }
}

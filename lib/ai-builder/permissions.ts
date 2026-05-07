export function canApplyAiBuilderChanges(roleKey: string | null) {
  return roleKey === 'owner' || roleKey === 'admin'
}

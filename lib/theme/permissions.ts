export type ThemePermissions = {
  canManageWorkspace: boolean
  canManageLayouts: boolean
  canEditSharedTheme: boolean
  canCreatePersonalOverrides: boolean
}

export function getThemePermissions(roleKey: string | null): ThemePermissions {
  const canManageWorkspace = roleKey === 'owner' || roleKey === 'admin'
  const canManageLayouts =
    canManageWorkspace || roleKey === 'designer' || roleKey === 'editor'

  return {
    canManageWorkspace,
    canManageLayouts,
    canEditSharedTheme: canManageWorkspace || canManageLayouts,
    canCreatePersonalOverrides: Boolean(roleKey),
  }
}

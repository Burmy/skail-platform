'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

export function ThemeModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <Button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-muted-foreground"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      size="icon"
      type="button"
      variant="ghost"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}

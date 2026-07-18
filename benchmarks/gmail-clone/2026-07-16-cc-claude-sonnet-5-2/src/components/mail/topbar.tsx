import { useEffect, useRef, useState } from 'react'
import { Keyboard, Menu, Search, Settings, SlidersHorizontal, X } from 'lucide-react'
import { useMailStore } from '@/store/mail-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ME } from '@/lib/seed-data'
import { initialsFor } from '@/lib/format'
import { SettingsDialog } from './settings-dialog'
import { SearchHelpPopover } from './search-help-popover'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const searchQuery = useMailStore((s) => s.searchQuery)
  const setSearchQuery = useMailStore((s) => s.setSearchQuery)
  const clearSearch = useMailStore((s) => s.clearSearch)
  const setShortcutsDialogOpen = useMailStore((s) => s.setShortcutsDialogOpen)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-1 sm:w-[220px] sm:shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Toggle navigation">
              <Menu className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Main menu</TooltipContent>
        </Tooltip>
        <a href="/" className="flex items-center gap-1.5 pl-1">
          <svg width="30" height="30" viewBox="0 0 48 48" className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#0b57d0" />
            <path d="M8 15a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" fill="#ffffff" />
            <path
              d="M8.6 14.2 24 26 39.4 14.2"
              fill="none"
              stroke="#0b57d0"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden truncate text-[22px] tracking-tight text-[#5f6368] sm:inline">
            Sonnet 5
          </span>
        </a>
      </div>

      <div className="flex min-w-0 flex-1 items-center">
        <div className="flex h-12 w-full max-w-[720px] items-center rounded-full bg-muted px-4 transition-colors focus-within:bg-card focus-within:shadow-md">
          <Search className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearchQuery(localQuery)
              if (e.key === 'Escape') {
                setLocalQuery('')
                clearSearch()
                inputRef.current?.blur()
              }
            }}
            onBlur={() => setSearchQuery(localQuery)}
            placeholder="Search mail"
            className="w-full flex-1 truncate bg-transparent px-3 text-[16px] outline-none placeholder:text-muted-foreground"
            aria-label="Search mail"
          />
          {localQuery && (
            <button
              onClick={() => {
                setLocalQuery('')
                clearSearch()
              }}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-hover"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
          <SearchHelpPopover>
            <button
              className="ml-1 rounded-full p-1.5 text-muted-foreground hover:bg-surface-hover"
              aria-label="Search options"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </SearchHelpPopover>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
              <Settings className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full" aria-label="Account">
              <Avatar>
                <AvatarFallback style={{ backgroundColor: ME.color }}>
                  {initialsFor(ME.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
              <span className="text-sm font-medium text-foreground">{ME.name}</span>
              <span className="text-xs text-muted-foreground">{ME.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShortcutsDialogOpen(true)}>
              <Keyboard />
              Keyboard shortcuts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  )
}

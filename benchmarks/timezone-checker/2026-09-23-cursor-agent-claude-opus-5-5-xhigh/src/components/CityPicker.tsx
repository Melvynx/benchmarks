import * as Popover from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { Check, Plus, Search } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { CITIES, citySearchScore, REGIONS, searchKeywords } from '../domain/cities'
import { formatUtcOffset, getUtcOffsetMinutes } from '../domain/time'
import { withViewTransition } from '../lib/view-transition'
import { useAppStore } from '../state/app-store'
import { useUiStore } from '../state/ui-store'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

export function CityPicker({ now }: { now: Date }) {
  const open = useUiStore((s) => s.pickerOpen)
  const setOpen = useUiStore((s) => s.setPickerOpen)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(!useUiStore.getState().pickerOpen)
      } else if (event.key === '/' && !isEditable(event.target)) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setOpen])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="primary">
          <Plus aria-hidden />
          Add city
          <Kbd className="ml-0.5 hidden md:inline-flex">{IS_MAC ? '⌘K' : 'Ctrl K'}</Kbd>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="popover w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden"
        >
          <CityCommand now={now} onDone={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function CityCommand({ now, onDone }: { now: Date; onDone: () => void }) {
  const cityIds = useAppStore((s) => s.cityIds)
  const addCity = useAppStore((s) => s.addCity)
  const offsets = useMemo(() => new Map(CITIES.map((c) => [c.id, getUtcOffsetMinutes(c.timeZone, now)])), [now])

  return (
    <Command label="Add a city" loop filter={citySearchScore}>
      <div className="flex items-center gap-2.5 border-b border-line px-3.5">
        <Search aria-hidden className="size-4 shrink-0 text-ink-3" />
        <Command.Input
          placeholder="Search city or country…"
          className="h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      <Command.List className="max-h-[min(24rem,55vh)] scroll-py-2 overflow-y-auto overscroll-contain p-1.5">
        <Command.Empty className="px-4 py-10 text-center text-sm text-ink-3">
          No city matches. Try a country or region.
        </Command.Empty>
        {REGIONS.map((region) => (
          <Command.Group key={region} heading={region}>
            {CITIES.filter((city) => city.region === region).map((city) => {
              const added = cityIds.includes(city.id)
              return (
                <Command.Item
                  key={city.id}
                  value={city.name}
                  keywords={searchKeywords(city)}
                  disabled={added}
                  onSelect={() => {
                    onDone()
                    withViewTransition(() => addCity(city.id))
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-sm outline-none select-none data-[disabled=true]:cursor-default data-[disabled=true]:opacity-45 data-[selected=true]:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{city.name}</div>
                    <div className="truncate text-xs text-ink-3">{city.country}</div>
                  </div>
                  {added ? (
                    <span className="flex items-center gap-1 text-xs text-ink-3">
                      <Check aria-hidden className="size-3.5" />
                      Added
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-ink-3 tabular-nums">
                      {formatUtcOffset(offsets.get(city.id) ?? 0)}
                    </span>
                  )}
                </Command.Item>
              )
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command>
  )
}

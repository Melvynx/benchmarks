import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { STORAGE_KEY } from './state/storage'
import { setViewportWidth } from './test/viewport'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-30T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

const rowNames = () => screen.getAllByTestId('city-name').map((node) => node.textContent)

const rowFor = (cityId: string) =>
  screen.getAllByTestId('city-row').find((row) => row.getAttribute('data-city') === cityId)!

const statesOf = (cityId: string) =>
  within(rowFor(cityId))
    .getAllByTestId('hour-cell')
    .map((cell) => cell.getAttribute('data-state'))

const hoursWithState = (cityId: string, state: string) =>
  statesOf(cityId).flatMap((value, hour) => (value === state ? [hour] : []))

async function addCity(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.click(screen.getByRole('button', { name: /add city/i }))
  await user.type(screen.getByRole('combobox'), query)
  await user.keyboard('{Enter}')
}

describe('first visit', () => {
  it('uses the model name as the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Claude Sonnet 5\.5$/)
  })

  it('shows San Francisco, Denpasar and Geneva with SF as the reference', () => {
    render(<App />)

    expect(rowNames()).toEqual(['San Francisco', 'Denpasar', 'Geneva'])
    expect(within(rowFor('san-francisco')).getByTestId('ref-badge')).toHaveTextContent('REF')
    expect(screen.getAllByTestId('ref-badge')).toHaveLength(1)
    expect(within(rowFor('san-francisco')).getByTestId('utc-offset')).toHaveTextContent('UTC-7')
    expect(within(rowFor('denpasar')).getByTestId('utc-offset')).toHaveTextContent('UTC+8')
    expect(within(rowFor('geneva')).getByTestId('utc-offset')).toHaveTextContent('UTC+2')
  })

  it('renders 24 cells per city and highlights the shared overlap in every row', () => {
    render(<App />)

    for (const id of ['san-francisco', 'denpasar', 'geneva']) {
      expect(statesOf(id)).toHaveLength(24)
      expect(hoursWithState(id, 'overlap')).toEqual([7, 22])
    }
    expect(hoursWithState('san-francisco', 'sleep')).toEqual([0, 1, 2, 3, 4, 5, 6, 23])
  })

  it('summarises the common hours and shows the hint', () => {
    render(<App />)

    expect(screen.getByTestId('overlap-count')).toHaveTextContent('2 hours')
    expect(screen.getAllByTestId('overlap-range').map((node) => node.textContent)).toEqual([
      '7am — 8am',
      '10pm — 11pm',
    ])
    expect(screen.getByText('Green cells = everyone awake')).toBeInTheDocument()
  })
})

describe('cities', () => {
  it('adds a city from the searchable dropdown', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await addCity(user, 'tokyo')

    expect(rowNames()).toEqual(['San Francisco', 'Denpasar', 'Geneva', 'Tokyo'])
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('finds cities by country', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /add city/i }))
    await user.type(screen.getByRole('combobox'), 'japan')

    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option')).toHaveTextContent('Tokyo')
  })

  it('does not allow duplicates', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /add city/i }))
    await user.type(screen.getByRole('combobox'), 'geneva')
    const option = screen.getByRole('option', { name: /geneva/i })
    expect(option).toHaveAttribute('aria-disabled', 'true')

    await user.click(option)
    await user.keyboard('{Enter}')

    expect(rowNames()).toEqual(['San Francisco', 'Denpasar', 'Geneva'])
  })

  it('shows a message when nothing matches', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /add city/i }))
    await user.type(screen.getByRole('combobox'), 'zzzz')

    expect(screen.getByText(/no cities match/i)).toBeInTheDocument()
  })

  it('closes the dropdown with Escape', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /add city/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('removes any city, and the next one becomes the reference', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Remove San Francisco' }))

    expect(rowNames()).toEqual(['Denpasar', 'Geneva'])
    expect(within(rowFor('denpasar')).getByTestId('ref-badge')).toBeInTheDocument()
  })

  it('promotes a city to reference when its name is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(within(rowFor('geneva')).getByTestId('city-name'))

    expect(rowNames()).toEqual(['Geneva', 'San Francisco', 'Denpasar'])
    expect(within(rowFor('geneva')).getByTestId('ref-badge')).toBeInTheDocument()
    expect(screen.getAllByTestId('ref-badge')).toHaveLength(1)
    // Columns are now Geneva hours: Geneva's own row reads 0..23.
    const labels = within(rowFor('geneva')).getAllByTestId('hour-cell').map((cell) => cell.getAttribute('data-hour'))
    expect(labels[0]).toBe('0')
    expect(screen.getByText('Hours in Geneva')).toBeInTheDocument()
  })

  it('handles the empty list and can restore the defaults', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    for (const name of ['San Francisco', 'Denpasar', 'Geneva']) {
      await user.click(screen.getByRole('button', { name: `Remove ${name}` }))
    }
    expect(screen.getByText('No cities yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /restore default cities/i }))
    expect(rowNames()).toEqual(['San Francisco', 'Denpasar', 'Geneva'])
  })

  it('hides the summary until there are two cities', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Remove Denpasar' }))
    expect(screen.getByRole('region', { name: 'Overlap summary' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Geneva' }))
    expect(screen.queryByRole('region', { name: 'Overlap summary' })).not.toBeInTheDocument()
    expect(hoursWithState('san-francisco', 'overlap')).toEqual([])
  })
})

describe('modes', () => {
  it('computes each city against the base in base mode', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Base' }))

    const lines = screen.getAllByTestId('overlap-line')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveTextContent('Denpasar')
    expect(lines[0]).toHaveTextContent('8 hours')
    expect(lines[0]).toHaveTextContent('7am — 8am')
    expect(lines[0]).toHaveTextContent('4pm — 11pm')
    expect(lines[1]).toHaveTextContent('Geneva')
    expect(lines[1]).toHaveTextContent('7am — 2pm')
    expect(lines[1]).toHaveTextContent('10pm — 11pm')

    expect(hoursWithState('san-francisco', 'overlap')).toEqual([])
    expect(hoursWithState('denpasar', 'overlap')).toEqual([7, 16, 17, 18, 19, 20, 21, 22])
    expect(hoursWithState('geneva', 'overlap')).toEqual([7, 8, 9, 10, 11, 12, 13, 22])
  })

  it('warns per city when a city has no overlap with the base', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await addCity(user, 'new york')
    await user.click(screen.getByRole('button', { name: 'Base' }))
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '9')
    await user.selectOptions(screen.getByLabelText('Sleep hour'), '17')

    const [denpasar, geneva, newYork] = screen.getAllByTestId('overlap-line')
    expect(within(denpasar!).getByTestId('overlap-warning')).toHaveTextContent(/no overlap/i)
    expect(within(geneva!).getByTestId('overlap-warning')).toHaveTextContent(/no overlap/i)
    expect(within(newYork!).queryByTestId('overlap-warning')).not.toBeInTheDocument()
    expect(newYork).toHaveTextContent('9am — 2pm')
  })

  it('warns in meeting mode when nobody overlaps', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '9')

    expect(screen.getByTestId('overlap-warning')).toHaveTextContent(/no overlap/i)
    expect(screen.queryAllByTestId('overlap-range')).toHaveLength(0)
  })
})

describe('settings', () => {
  it('applies changes immediately', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: '24h' }))

    expect(screen.getAllByTestId('overlap-range').map((node) => node.textContent)).toEqual([
      '07:00 — 08:00',
      '22:00 — 23:00',
    ])
    expect(within(rowFor('san-francisco')).getAllByTestId('hour-cell')[0]).toHaveTextContent('00')
  })

  it('supports overnight awake windows', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '22')
    await user.selectOptions(screen.getByLabelText('Sleep hour'), '6')

    expect(hoursWithState('san-francisco', 'sleep')).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21])
    expect(screen.getByText(/overnight schedule/i)).toBeInTheDocument()
  })
})

describe('persistence', () => {
  it('restores cities, settings and mode after a reload', async () => {
    const user = userEvent.setup({ delay: null })
    const first = render(<App />)

    await addCity(user, 'tokyo')
    await user.click(within(rowFor('geneva')).getByTestId('city-name'))
    await user.click(screen.getByRole('button', { name: 'Base' }))
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '8')
    await user.click(screen.getByRole('button', { name: '24h' }))

    first.unmount()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({
      cityIds: ['geneva', 'san-francisco', 'denpasar', 'tokyo'],
      settings: { wake: 8, sleep: 23, format: '24h' },
      mode: 'base',
    })

    render(<App />)
    expect(rowNames()).toEqual(['Geneva', 'San Francisco', 'Denpasar', 'Tokyo'])
    expect(screen.getByRole('button', { name: 'Base' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByTestId('overlap-line')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByLabelText('Wake-up hour')).toHaveValue('8')
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('starts from defaults when storage is corrupt', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    render(<App />)
    expect(rowNames()).toEqual(['San Francisco', 'Denpasar', 'Geneva'])
  })
})

describe('responsive layouts', () => {
  it('renders cities as columns and hours as rows below 768px', () => {
    setViewportWidth(390)
    render(<App />)

    expect(screen.queryAllByTestId('city-row')).toHaveLength(0)
    expect(screen.getAllByTestId('city-column')).toHaveLength(3)
    expect(screen.getAllByTestId('hour-row')).toHaveLength(24)
    expect(screen.getAllByTestId('hour-cell')).toHaveLength(72)
    expect(screen.getAllByTestId('ref-badge')).toHaveLength(1)
  })

  it('renders cities as rows and hours as columns from 768px', () => {
    setViewportWidth(768)
    render(<App />)

    expect(screen.getAllByTestId('city-row')).toHaveLength(3)
    expect(screen.queryAllByTestId('city-column')).toHaveLength(0)
    expect(screen.getAllByTestId('hour-cell')).toHaveLength(72)
  })
})

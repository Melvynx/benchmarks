import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import indexHtml from '../index.html?raw'
import App from './App'
import { APP_TITLE } from './config'
import { STORAGE_KEY } from './state/storage'

const rows = () => screen.getAllByTestId('city-row')
const cellsIn = (row: HTMLElement) => within(row).getAllByTestId('hour-cell')
const countState = (cells: HTMLElement[], state: string) =>
  cells.filter((cell) => cell.dataset.state === state).length
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')

const originalWidth = window.innerWidth
afterEach(() => {
  window.innerWidth = originalWidth
})

describe('branding', () => {
  it('uses the model name as the only page title and heading', () => {
    render(<App />)
    expect(APP_TITLE).toBe('Claude Sonnet 5.5')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Claude Sonnet 5\.5$/)
    expect(indexHtml).toContain('<title>Claude Sonnet 5.5</title>')
  })
})

describe('default state', () => {
  it('starts with three cities, San Francisco as the reference, in Meeting mode', () => {
    render(<App />)
    const [first, second, third] = rows()
    expect(rows()).toHaveLength(3)
    expect(first).toHaveTextContent('San Francisco')
    expect(first).toHaveTextContent('REF')
    expect(second).toHaveTextContent('Denpasar')
    expect(third).toHaveTextContent('Geneva')
    expect(second).not.toHaveTextContent('REF')
    expect(screen.getByRole('radio', { name: 'Meeting' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '12h' })).toBeChecked()
    expect(screen.getByLabelText('Wake-up hour')).toHaveValue('7')
    expect(screen.getByLabelText('Sleep hour')).toHaveValue('23')
    expect(screen.getByText('Green cells = everyone awake')).toBeInTheDocument()
    expect(screen.getByTestId('overlap-summary')).toBeInTheDocument()
  })

  it('renders 24 hour cells per city and 16 awake hours in the reference row', () => {
    render(<App />)
    for (const row of rows()) expect(cellsIn(row)).toHaveLength(24)
    const reference = cellsIn(rows()[0])
    expect(countState(reference, 'sleeping')).toBe(8)
    expect(reference[0]).toHaveTextContent('12am')
    expect(reference[7]).toHaveTextContent('7am')
  })

  it('highlights the same hours in every row in Meeting mode', () => {
    render(<App />)
    const [first, ...others] = rows().map(cellsIn)
    const overlapHours = (cells: HTMLElement[]) =>
      cells.filter((cell) => cell.dataset.state === 'overlap').map((cell) => cell.dataset.refHour)
    for (const cells of others) expect(overlapHours(cells)).toEqual(overlapHours(first))
  })
})

describe('cities', () => {
  it('removes a city', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Remove Geneva' }))
    expect(rows()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Remove Geneva' })).not.toBeInTheDocument()
    expect(rows().every((row) => !row.textContent?.includes('Geneva'))).toBe(true)
  })

  it('shows the empty state once every city is removed', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (const name of ['Geneva', 'Denpasar', 'San Francisco']) {
      await user.click(screen.getByRole('button', { name: `Remove ${name}` }))
    }
    expect(screen.queryAllByTestId('city-row')).toHaveLength(0)
    expect(screen.getByText('No cities yet')).toBeInTheDocument()
    expect(screen.getByText('Add a city to get started.')).toBeInTheDocument()
  })

  it('adds a city found by name or by country, and never twice', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByRole('combobox', { name: 'Add a city' })

    await user.type(input, 'tok')
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: /Tokyo/ }))
    expect(rows()).toHaveLength(4)
    expect(rows()[3]).toHaveTextContent('Tokyo')

    await user.type(input, 'india')
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: /Mumbai/ }))
    expect(rows()).toHaveLength(5)

    await user.type(input, 'geneva')
    expect(within(screen.getByRole('listbox')).queryByRole('option')).not.toBeInTheDocument()
    expect(screen.getByText('Geneva is already in your list.')).toBeInTheDocument()
    expect(rows()).toHaveLength(5)
  })

  it('adds the highlighted city with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByRole('combobox', { name: 'Add a city' })
    await user.type(input, 'sing')
    await user.keyboard('{Enter}')
    expect(rows()[3]).toHaveTextContent('Singapore')
    expect(input).toHaveValue('')
  })

  it('makes a clicked city the reference city and moves it to the top', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTitle('Make Geneva the reference city'))
    expect(rows()[0]).toHaveTextContent('Geneva')
    expect(rows()[0]).toHaveTextContent('REF')
    expect(rows()[1]).toHaveTextContent('San Francisco')
    expect(screen.getAllByText('REF')).toHaveLength(1)
    expect(screen.getByTestId('overlap-summary')).toHaveTextContent('Geneva')
    expect(stored().cityIds[0]).toBe('geneva')
  })
})

describe('modes', () => {
  it('compares each city with the reference city independently in Base mode', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: 'Base' }))

    const lines = screen.getAllByTestId('overlap-line')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveTextContent('Denpasar')
    expect(lines[1]).toHaveTextContent('Geneva')
    expect(screen.getByText('Green cells = awake at the same time as San Francisco')).toBeInTheDocument()
    expect(countState(cellsIn(rows()[0]), 'overlap')).toBe(0)
  })

  it('reports every city that has no overlap on its own line in Base mode', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: 'Base' }))
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '0')
    await user.selectOptions(screen.getByLabelText('Sleep hour'), '0')
    for (const line of screen.getAllByTestId('overlap-line')) {
      expect(line).toHaveTextContent('24 hours')
      expect(line).toHaveTextContent('All day')
    }
  })

  it('shows a single shared window with a warning when nobody overlaps', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '9')
    await user.selectOptions(screen.getByLabelText('Sleep hour'), '10')
    const summary = screen.getByTestId('overlap-summary')
    expect(summary).toHaveTextContent('No overlap')
    expect(screen.queryByTestId('overlap-range')).not.toBeInTheDocument()
    for (const row of rows()) expect(countState(cellsIn(row), 'overlap')).toBe(0)
  })
})

describe('availability settings', () => {
  it('applies a new awake window immediately', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '0')
    await user.selectOptions(screen.getByLabelText('Sleep hour'), '0')
    for (const row of rows()) expect(countState(cellsIn(row), 'overlap')).toBe(24)
    expect(screen.getByTestId('overlap-summary')).toHaveTextContent('24 hours')
    expect(screen.getByTestId('overlap-range')).toHaveTextContent('All day')
  })

  it('supports overnight windows', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '22')
    await user.selectOptions(screen.getByLabelText('Sleep hour'), '6')
    const reference = cellsIn(rows()[0])
    expect(countState(reference, 'sleeping')).toBe(16)
    expect(reference[22]).not.toHaveAttribute('data-state', 'sleeping')
    expect(reference[3]).not.toHaveAttribute('data-state', 'sleeping')
    expect(reference[12]).toHaveAttribute('data-state', 'sleeping')
    expect(screen.getByText(/Awake 8 hours a day, overnight/)).toBeInTheDocument()
  })

  it('switches between 12h and 24h clocks', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: '24h' }))
    const reference = cellsIn(rows()[0])
    expect(reference[0]).toHaveTextContent(/^00$/)
    expect(reference[15]).toHaveTextContent(/^15$/)
    expect(screen.getByLabelText('Wake-up hour')).toHaveDisplayValue('07:00')
  })
})

describe('persistence', () => {
  it('restores cities, settings and mode after a reload', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await user.click(screen.getByRole('radio', { name: 'Base' }))
    await user.click(screen.getByRole('radio', { name: '24h' }))
    await user.selectOptions(screen.getByLabelText('Wake-up hour'), '8')
    await user.click(screen.getByRole('button', { name: 'Remove Denpasar' }))
    await user.click(screen.getByTitle('Make Geneva the reference city'))

    expect(stored()).toEqual({
      cityIds: ['geneva', 'san-francisco'],
      mode: 'base',
      settings: { wake: 8, sleep: 23, timeFormat: '24h' },
    })

    first.unmount()
    render(<App />)
    expect(rows()).toHaveLength(2)
    expect(rows()[0]).toHaveTextContent('Geneva')
    expect(screen.getByRole('radio', { name: 'Base' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '24h' })).toBeChecked()
    expect(screen.getByLabelText('Wake-up hour')).toHaveValue('8')
  })

  it('falls back to the defaults when stored data is corrupt', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    render(<App />)
    expect(rows()).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Meeting' })).toBeChecked()
  })

  it('ignores unknown cities and out-of-range settings', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cityIds: ['tokyo', 'atlantis', 'tokyo'],
        mode: 'nonsense',
        settings: { wake: 99, sleep: -3, timeFormat: 'metric' },
      }),
    )
    render(<App />)
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('Tokyo')
    expect(screen.getByRole('radio', { name: 'Meeting' })).toBeChecked()
    expect(screen.getByLabelText('Wake-up hour')).toHaveValue('7')
    expect(screen.getByLabelText('Sleep hour')).toHaveValue('23')
    expect(screen.getByRole('radio', { name: '12h' })).toBeChecked()
  })
})

describe('responsive layout', () => {
  it('renders cities as rows on desktop', () => {
    window.innerWidth = 1280
    render(<App />)
    expect(screen.getAllByTestId('city-row')).toHaveLength(3)
    expect(screen.queryAllByTestId('city-column')).toHaveLength(0)
    expect(screen.getAllByTestId('hour-cell')[0]).toHaveAttribute('data-axis', 'x')
  })

  it('renders cities as columns and hours as rows on mobile', () => {
    window.innerWidth = 390
    render(<App />)
    expect(screen.getAllByTestId('city-column')).toHaveLength(3)
    expect(screen.queryAllByTestId('city-row')).toHaveLength(0)
    const cells = screen.getAllByTestId('hour-cell')
    expect(cells).toHaveLength(72)
    expect(cells[0]).toHaveAttribute('data-axis', 'y')
  })
})

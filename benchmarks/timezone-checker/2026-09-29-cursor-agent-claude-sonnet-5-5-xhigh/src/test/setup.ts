import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { resetViewport } from './viewport'

Element.prototype.scrollIntoView = () => {}

beforeEach(() => {
  resetViewport()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

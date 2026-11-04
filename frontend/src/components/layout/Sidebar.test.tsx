import {
  render,
  screen,
  within,
} from '@testing-library/react'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  Sidebar,
} from './Sidebar'


describe('Sidebar', () => {
  it('names the icon navigation buttons', () => {
    render(
      <Sidebar
        activeSection="library"
        backendStatus="connected"
        onNavigate={vi.fn()}
      />,
    )

    const navigation =
      screen.getByRole(
        'navigation',
        {
          name:
            'Main navigation',
        },
      )

    for (
      const name
      of [
        'Library',
        'Boards',
        'Discover',
      ]
    ) {
      expect(
        within(navigation).getByRole(
          'button',
          { name },
        ),
      ).toBeInTheDocument()
    }
  })
})

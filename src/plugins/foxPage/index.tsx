import type { Plugin } from 'plugins'
import * as ta from 'type-assertions'
import { FoxIcon } from 'components/Icons/FoxIcon'

import { FoxPage } from './foxPage'

export const configValidators = {}

export function register() {
  const out = {
    icon: <FoxIcon />,
    routes: [
      {
        path: '/fox',
        label: 'navBar.foxToken',
        main: () => <FoxPage />,
        icon: <FoxIcon />,
        routes: [
          {
            path: '/fox',
            label: 'navBar.foxToken',
            main: () => <FoxPage />,
          },
          {
            path: '/foxy',
            label: 'navBar.foxToken',
            main: () => <FoxPage />,
          },
        ],
      },
    ],
  } as const
  ta.assert<ta.Extends<typeof out, Plugin>>()
  return out
}

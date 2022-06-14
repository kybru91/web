import { cosmossdk } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugin } from 'plugins'
import * as ta from 'type-assertions'

export const configValidators = {}

export function register() {
  const out = {
    featureFlag: 'Osmosis' as const,
    providers: {
      chainAdapters: {
        [ChainTypes.Osmosis]: () => {
          const http = new unchained.osmosis.V1Api(
            new unchained.osmosis.Configuration({
              basePath: getConfig().REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL,
            }),
          )

          const ws = new unchained.ws.Client<unchained.osmosis.Tx>(
            getConfig().REACT_APP_UNCHAINED_OSMOSIS_WS_URL,
          )

          return new cosmossdk.osmosis.ChainAdapter({
            providers: { http, ws },
            coinName: 'Osmosis',
          })
        },
      },
    },
  } as const
  ta.assert<ta.Extends<typeof out, Plugin>>()
  return out
}

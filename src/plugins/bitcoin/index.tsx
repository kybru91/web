import { bitcoin } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import type { ValidatorResult, ValidatorSet } from 'config'
import * as envalid from 'envalid'
import type { Plugin } from 'plugins'
import * as ta from 'type-assertions'

export const configValidators = {
  REACT_APP_UNCHAINED_BITCOIN_HTTP_URL: envalid.url(),
  REACT_APP_UNCHAINED_BITCOIN_WS_URL: envalid.url(),
}
ta.assert<ta.Extends<typeof configValidators, ValidatorSet>>()

export function register(config: ValidatorResult<typeof configValidators>) {
  const out = {
    providers: {
      chainAdapters: {
        [ChainTypes.Bitcoin]: () => {
          const http = new unchained.bitcoin.V1Api(
            new unchained.bitcoin.Configuration({
              basePath: config.REACT_APP_UNCHAINED_BITCOIN_HTTP_URL,
            }),
          )

          const ws = new unchained.ws.Client<unchained.bitcoin.BitcoinTx>(
            config.REACT_APP_UNCHAINED_BITCOIN_WS_URL,
          )

          return new bitcoin.ChainAdapter({ providers: { http, ws }, coinName: 'Bitcoin' })
        },
      },
    },
  } as const
  ta.assert<ta.Extends<typeof out, Plugin>>()
  return out
}

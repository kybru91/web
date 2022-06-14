import type { bitcoin, cosmossdk, ethereum } from '@shapeshiftoss/chain-adapters'
import type { ChainTypes } from '@shapeshiftoss/types'
import * as ta from 'type-assertions'

import type { PluginChainAdapter, PluginChainAdapterType } from './index'

describe('plugin types', () => {
  it('work', async () => {
    ta.assert<ta.Extends<ChainTypes.Bitcoin, PluginChainAdapterType>>()
    ta.assert<ta.Extends<ChainTypes.Ethereum, PluginChainAdapterType>>()
    ta.assert<ta.Extends<ChainTypes.Cosmos, PluginChainAdapterType>>()
    ta.assert<ta.Extends<ChainTypes.Osmosis, PluginChainAdapterType>>()
    ta.assert<ta.Equal<PluginChainAdapter<ChainTypes.Bitcoin>, bitcoin.ChainAdapter>>()
    ta.assert<ta.Equal<PluginChainAdapter<ChainTypes.Ethereum>, ethereum.ChainAdapter>>()
    ta.assert<ta.Equal<PluginChainAdapter<ChainTypes.Cosmos>, cosmossdk.cosmos.ChainAdapter>>()
    ta.assert<ta.Equal<PluginChainAdapter<ChainTypes.Osmosis>, cosmossdk.osmosis.ChainAdapter>>()
    // ta.assert() is checked at compile time, not runtime. This do-nothing expect() is included simply to pacify jest.
    expect(() => ta.assert<true>()).not.toThrow()
  })
})

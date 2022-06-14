import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { ChainTypes } from '@shapeshiftoss/types'
import { getConfig, ValidatorResult, ValidatorSet } from 'config'
import type { ReadonlyDeep } from 'type-fest'
import { logger } from 'lib/logger'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

import type { Route } from '../Routes/helpers'

export type RegistrablePlugin<T extends ValidatorSet = ValidatorSet> = {
  register: (config: ValidatorResult<T>) => Plugin
  configValidators: T
}

// We need plugins to be able to export (a register function that returns) a narrow (i.e. non-widened) type. The simplest
// way to do this is for them to use "as const", but that will also turn the value Readonly and cause TypeScript to throw
// a fit. As a workaround, we explicitly ask for the Readonly version here so plugins can use "as const".
export type Plugin = ReadonlyDeep<{
  icon?: JSX.Element
  featureFlag?: keyof FeatureFlags
  providers?: {
    chainAdapters?: Partial<Record<ChainTypes, () => ChainAdapter<ChainTypes>>>
  }
  routes?: Route[]
}>

type ActiveRegistrablePlugin = Awaited<
  ReturnType<typeof import('./active_generated').getActivePlugins>
>[number]
type RegistrablePluginPluginType<T extends RegistrablePlugin<any>> = ReturnType<T['register']>
type ActivePlugin = RegistrablePluginPluginType<ActiveRegistrablePlugin>
type MaybeValueOf<T, U extends string> = U extends keyof T ? T[U] : never
type DistributiveMaybeValueOf<T, U extends string> = T extends unknown ? MaybeValueOf<T, U> : never
type DistributiveKeyOf<T> = T extends unknown ? keyof T : never
type MaybeReturnType<T> = T extends (...args: any) => any ? ReturnType<T> : never
export type PluginChainAdapterType = DistributiveKeyOf<
  DistributiveMaybeValueOf<DistributiveMaybeValueOf<ActivePlugin, 'providers'>, 'chainAdapters'>
>
export type PluginChainAdapter<T extends PluginChainAdapterType = PluginChainAdapterType> =
  T extends any
    ? MaybeReturnType<
        DistributiveMaybeValueOf<
          DistributiveMaybeValueOf<
            DistributiveMaybeValueOf<ActivePlugin, 'providers'>,
            'chainAdapters'
          >,
          T
        >
      >
    : never

const moduleLogger = logger.child({ namespace: ['PluginManager'] })

// @TODO - In the future we may want to create a Provider for this
// if we need to support features that require re-rendering. Currently we do not.
export const pluginManager = new Set<Plugin>()

export async function registerPlugins() {
  pluginManager.clear()

  const activeGenerated: { getActivePlugins: () => Promise<RegistrablePlugin[]> } = await import(
    // Explicitly type-widening this parameter allows type-checking to succeed
    // even if the file hasn't been generated yet.
    './active_generated' as string
  )
  const activePlugins = await activeGenerated.getActivePlugins()
  for (const plugin of activePlugins) {
    try {
      pluginManager.add(plugin.register(getConfig(plugin.configValidators)))
      moduleLogger.trace({ fn: 'registerPlugins', pluginManager, plugin }, 'Registered Plugin')
    } catch (e) {
      moduleLogger.error(e, { fn: 'registerPlugins', pluginManager }, 'Register Plugins')
    }
  }

  moduleLogger.debug(
    { pluginManager, plugins: pluginManager.keys() },
    'Plugin Registration Completed',
  )
}

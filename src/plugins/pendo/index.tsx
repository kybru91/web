import { Plugins } from 'plugins'
import { logger } from 'lib/logger'

import { getConfig } from './config'
import { makePendoLauncher } from './launcher'
import { VisitorDataManager } from './visitorData'

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo'] })

export const pluginName = 'pendo'

async function launch() {
  /**
   * This is mostly recapitulation of settings already provided with the agent,
   * but these are the security-critical bits that need to be enforced.
   */
  const launcher = makePendoLauncher({
    blockAgentMetadata: false, // TODO: double-check
    blockLogRemoteAddress: true, // This doesn't do anything in the current agent version, but the server sets it anyway
    dataHost: 'data.pendo.io',
    allowedOriginServers: [
      `https://pendo-static-${getConfig().REACT_APP_PENDO_SUB_ID}.storage.googleapis.com`,
    ],
    allowCrossOriginFrames: false,
    disableCookies: false, // Safe b/c we're remapping to pendoEnv.cookieStorage
    disableGlobalCSS: true,
    disablePersistence: false, // Safe b/c we're remapping all storage accesses
    excludeAllText: true,
    guideValidation: true,
    localStorageOnly: false, // Safe b/c we're remapping to pendoEnv.localStorage
    preventCodeInjection: true,
    requireHTTPS: true,
    restrictP1Access: true,
    xhrTimings: false,
    xhrWhitelist: null,
    htmlAttributeBlacklist: null,
    htmlAttributes: /^(tabindex)$/,
    apiKey: getConfig().REACT_APP_PENDO_API_KEY,
  })
  //TODO: This is a very low-priority task; experiment with delays here if
  // any appreciable contention for execution time is observed
  setTimeout(() => {
    launcher.arm()
    //TODO: remove this hack once consent UI is available
    // eslint-disable-next-line no-restricted-globals
    if (confirm('pendo consent?')) {
      VisitorDataManager.recordConsent(getConfig().REACT_APP_PENDO_CONSENT_VERSION)
    }
  }, 0)
  await VisitorDataManager.consent(getConfig().REACT_APP_PENDO_CONSENT_VERSION)
  launcher.launch(getConfig().REACT_APP_PENDO_VISITOR_ID_PREFIX)
}

export function register(): Plugins {
  launch().catch(e => moduleLogger.error(e, { fn: 'register' }, 'launch error'))

  return [
    [
      'pendo',
      {
        name: 'pendo',
      },
    ],
  ]
}

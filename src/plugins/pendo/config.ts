import { type ValidatorResults, getConfig as baseGetConfig } from 'config'
import * as guarded from 'config/guarded'

export const validators = {
  REACT_APP_PENDO_API_KEY: guarded.str({ default: '67c2f326-a6c2-4aa2-4559-08a53b679e93' }),
  REACT_APP_PENDO_CONSENT_VERSION: guarded.str({ default: 'v1' }),
  REACT_APP_PENDO_SUB_ID: guarded.str({ default: '6047664892149760' }),
  REACT_APP_PENDO_UNSAFE_DESIGNER_MODE: guarded.bool({ default: false }),
  REACT_APP_PENDO_VISITOR_ID_PREFIX: guarded.str({ default: 'test_visitor' }),
}

export type Config = ValidatorResults<typeof validators>
export const getConfig = () => baseGetConfig(validators)

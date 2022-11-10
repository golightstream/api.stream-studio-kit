/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
type Config = {
  env: 'stage' | 'prod'
  logLevel: 'Debug' | 'Info' | 'Warn' | 'Error'
  recaptchaKey: string
  [prop: string]: any
}

const LOCAL_ENV: Config['env'] = 'stage'

export default {
  env: location.hostname === 'live.api.stream' ? 'prod' : LOCAL_ENV,
  logLevel: 'Debug',
  recaptchaKey: '6Lc0HIUfAAAAAIdsyq7vB_3c3skiVvltzdUTCUSx',
  liveblocksKey:
    'pk_dev_yf1qXf_yTDHhEcKr1sdtPnOHYGJeEhgL4x8LwaC1bPQeMC2cazP5RYFUJq7sRcTe',
} as Config

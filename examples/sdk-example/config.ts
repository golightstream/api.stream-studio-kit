/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
type Config = {
  env: 'stage' | 'prod'
  logLevel: 'Debug' | 'Info' | 'Warn' | 'Error'
}

const LOCAL_ENV: Config['env'] = 'stage'

export default {
  env: LOCAL_ENV,
  logLevel: 'Debug',
} as Config

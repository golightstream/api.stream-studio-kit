/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from './src'

export const cloudHostname = {
  dev: 'cloud.stream.horse',
  stage: 'cloud.stream.horse',
  prod: 'cloud.golightstream.com',
}

export default (env: 'dev' | 'stage' | 'prod') => ({
  defaults: {
    previewTokenDuration: 1000 * 60 * 60,
    guestTokenDuration: 1000 * 60 * 60 * 12,
    transforms: {
      RoomParticipant: 'LS-Room-Participant',
      Image: 'LS-Image',
      Text: 'LS-Text',
    } as Compositor.Transform.DefaultTransformMap,
  },
  compositorUrl: `https://${cloudHostname[env]}/studiosdk/v2/renderer/latest/compositor/`,
})

/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from './src'

export default (env: 'dev' | 'stage' | 'prod') => ({
  defaults: {
    previewTokenDuration: 1000 * 60 * 60,
    guestTokenDuration: 1000 * 60 * 60 * 12,
    transforms: {
      RoomParticipant: 'LS-Room-Participant',
      Image: 'LS-Image',
      Text: 'LS-Text',
    } as Compositor.Transform.DefaultTransformMap,
  }
})

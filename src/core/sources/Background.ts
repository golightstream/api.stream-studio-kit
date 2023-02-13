/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { deepEqual } from '../../logic'
import { CoreContext } from '../context'
import { getProject } from '../data'
import { Compositor, SDK } from '../namespaces'

type SourceDeclaration = Compositor.Source.SourceDeclaration

export type BackgroundProps = {
  src?: string
  type?: 'image' | 'video'
  // Opaque to the SDK
  [prop: string]: any
}

export type Background = {
  id: string
  props: BackgroundProps
}

export type BackgroundSource = {
  id: string
  value: BackgroundProps
  // TODO: This shouldn't be necessary
  props: BackgroundProps
}

export const Background = {
  type: 'Background',
  valueType: Object,
  props: {},
  init({ addSource, removeSource, updateSource, modifySourceValue }) {
    let previousBackgrounds: Background[]

    const update = (backgrounds: Background[] = []) => {
      // Get banners not contained in previousBanners
      const newBackgrounds = backgrounds.filter(
        (background) =>
          !previousBackgrounds.some((x) => x.id === background.id),
      )
      // Get previous banners not contained in current banners
      const removedBackgrounds = previousBackgrounds.filter(
        (background) => !backgrounds.some((x) => x.id === background.id),
      )
      // Get banners whose properties have changed
      const changedBackgrounds = backgrounds.filter((background) => {
        const existing = previousBackgrounds.find((x) => x.id === background.id)
        return !deepEqual(background, existing)
      })

      newBackgrounds.forEach((x) =>
        addSource({
          id: x.id,
          value: {
            ...x.props
          },
          // TODO: It feels odd to have "props" match "value" exactly.
          //  They probably shouldn't be necessary here.
          props: x.props,
        }),
      )
      removedBackgrounds.forEach((x) => removeSource(x.id))
      changedBackgrounds.forEach((x) => {
        updateSource(x.id, x.props)
        modifySourceValue(x.id, (value) => {
          value = { ...x.props }
        })
      })

      previousBackgrounds = JSON.parse(JSON.stringify(backgrounds))
    }

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      // Reset on project change
      previousBackgrounds = []
      if (!projectId) return

      const project = getProject(projectId)
      update(project.props.backgrounds)
    })

    CoreContext.on('ProjectChanged', ({ project }) => {
      update(project.props.backgrounds)
    })
  },
} as SourceDeclaration

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
  type?: 'image-background' | 'video-background'
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
  init({
    addSource,
    removeSource,
    updateSource,
    getSource,
    modifySourceValue,
  }) {
    let previousBackground: Background

    const update = (background: Background) => {
      if (!background) return
      // Get banners not contained in previousBanners
      const newBackground =
        previousBackground?.id !== background?.id ? background : null

      // Get banners whose properties have changed
      const changedBackground = !deepEqual(background, previousBackground)
        ? background
        : null

      if (newBackground) {
        addSource({
          id: newBackground?.id,
          value: {
            ...newBackground?.props,
          },
          // TODO: It feels odd to have "props" match "value" exactly.
          //  They probably shouldn't be necessary here.
          props: newBackground?.props,
        })
        removeSource(previousBackground?.id)
      }

      if (changedBackground) {
        updateSource(changedBackground?.id, changedBackground?.props)
        modifySourceValue(changedBackground?.id, (value) => {
          Object.keys(changedBackground?.props).forEach((key) => {
            value[key] = changedBackground?.props[key]
          })
        })
      }

      previousBackground = background
    }

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      // Reset on project change
      previousBackground = null
      if (!projectId) return

      const project = getProject(projectId)
      update(project.props.background)
    })

    CoreContext.on('ProjectChanged', ({ project }) => {
      update(project.props.background)
    })
  },
} as SourceDeclaration

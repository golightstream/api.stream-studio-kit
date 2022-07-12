/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { deepEqual } from '../../logic'
import { CoreContext } from '../context'
import { getProject } from '../data'
import { Compositor, SDK } from '../namespaces'

type SourceDeclaration = Compositor.Source.SourceDeclaration

export type OverlayProps = {
  src? :string
  type? : 'image-overlay' | 'video-overlay'
  // Opaque to the SDK
  [prop: string]: any
}

export type Overlay = {
  id: string
  props: OverlayProps
}

export type OverlaySource = {
  id: string
  value: OverlayProps
  // TODO: This shouldn't be necessary
  props: OverlayProps
}

export const Overlays = {
  type: 'Overlay',
  valueType: Object,
  props: {},
  init({
    addSource,
    removeSource,
    updateSource,
    getSource,
    modifySourceValue,
  }) {
    let previousOverlays = [] as Overlay[]

    const update = (overlays: Overlay[] = []) => {
      // Get banners not contained in previousBanners
      const newOverlays = overlays.filter(
        (overlay) => !previousOverlays.some((x) => x.id === overlay.id),
      )
      // Get previous banners not contained in current banners
      const removedOverlays = previousOverlays.filter(
        (overlay) => !overlays.some((x) => x.id === overlay.id),
      )
      // Get banners whose properties have changed
      const changedOverlays = overlays.filter((overlay) => {
        const existing = previousOverlays.find((x) => x.id === overlay.id)
        return !deepEqual(overlay, existing)
      })



      newOverlays.forEach((x) =>
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
      removedOverlays.forEach((x) => removeSource(x.id))
      changedOverlays.forEach((x) => {
        updateSource(x.id, x.props)
        modifySourceValue(x.id, (value) => {
          Object.keys(x.props).forEach((key) => {
            value[key] = x.props[key]
          })
        })
      })


      previousOverlays = JSON.parse(JSON.stringify(overlays))

    }

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      // Reset on project change
      previousOverlays = []
      if (!projectId) return

      const project = getProject(projectId)
      update(project.props.overlays)
    })

    CoreContext.on('ProjectChanged', ({ project }) => {
      update(project.props.overlays)
    })
  },
} as SourceDeclaration

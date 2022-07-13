/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { deepEqual } from '../../logic'
import { CoreContext } from '../context'
import { getProject } from '../data'
import { Compositor, SDK } from '../namespaces'

type SourceDeclaration = Compositor.Source.SourceDeclaration

export type LogoProps = {
  src?: string
  type?: 'logo'
  // Opaque to the SDK
  [prop: string]: any
}

export type Logo = {
  id: string
  props: LogoProps
}

export type LogoSource = {
  id: string
  value: LogoProps
  // TODO: This shouldn't be necessary
  props: LogoProps
}

export const Logo = {
  type: 'Logo',
  valueType: Object,
  props: {},
  init({
    addSource,
    removeSource,
    updateSource,
    getSource,
    modifySourceValue,
  }) {
    let previousLogo: Logo

    const update = (logo: Logo) => {
      if (!logo) {
        if (previousLogo) {
          removeSource(previousLogo?.id)
        }
        return
      }
      // Get banners not contained in previousBanners
      const newLogo = previousLogo?.id !== logo?.id ? logo : null

      // Get banners whose properties have changed
      const changedLogo = !deepEqual(logo, previousLogo) ? logo : null

      if (newLogo) {
        addSource({
          id: newLogo?.id,
          value: {
            ...newLogo?.props,
          },
          // TODO: It feels odd to have "props" match "value" exactly.
          //  They probably shouldn't be necessary here.
          props: newLogo?.props,
        })
        removeSource(previousLogo?.id)
      }

      if (changedLogo) {
        updateSource(changedLogo?.id, changedLogo?.props)
        modifySourceValue(changedLogo?.id, (value) => {
          Object.keys(changedLogo?.props).forEach((key) => {
            value[key] = changedLogo?.props[key]
          })
        })
      }
      previousLogo = JSON.parse(JSON.stringify(logo))
    }

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      // Reset on project change
      previousLogo = null
      if (!projectId) return

      const project = getProject(projectId)
      update(project.props.logo)
    })

    CoreContext.on('ProjectChanged', ({ project }) => {
      update(project.props.logo)
    })
  },
} as SourceDeclaration

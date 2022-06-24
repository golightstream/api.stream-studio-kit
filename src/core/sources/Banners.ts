/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { deepEqual } from '../../logic'
import { CoreContext } from '../context'
import { getProject } from '../data'
import { Compositor, SDK } from '../namespaces'

type SourceDeclaration = Compositor.Source.SourceDeclaration

export type BannerProps = {
  headerText?: string
  bodyText?: string
  // Opaque to the SDK
  [prop: string]: any
}

export type Banner = {
  id: string
  props: BannerProps
}

export type BannerSource = {
  id: string
  value: BannerProps
  // TODO: This shouldn't be necessary
  props: BannerProps
}

export const Banner = {
  type: 'Banner',
  valueType: Object,
  props: {},
  init({
    addSource,
    removeSource,
    updateSource,
    getSource,
    modifySourceValue,
  }) {
    let previousBanners = [] as Banner[]

    const update = (banners: Banner[] = []) => {
      // Get banners not contained in previousBanners
      const newBanners = banners.filter(
        (banner) => !previousBanners.some((x) => x.id === banner.id),
      )
      // Get previous banners not contained in current banners
      const removedBanners = previousBanners.filter(
        (banner) => !banners.some((x) => x.id === banner.id),
      )
      // Get banners whose properties have changed
      const changedBanners = banners.filter((banner) => {
        const existing = previousBanners.find((x) => x.id === banner.id)
        return !deepEqual(banner, existing)
      })

      newBanners.forEach((x) =>
        addSource({
          id: x.id,
          value: {
            headerText: x.props.headerText,
            bodyText: x.props.bodyText,
          },
          // TODO: It feels odd to have "props" match "value" exactly.
          //  They probably shouldn't be necessary here.
          props: x.props,
        }),
      )
      removedBanners.forEach((x) => removeSource(x.id))
      changedBanners.forEach((x) => {
        updateSource(x.id, x.props)
        modifySourceValue(x.id, (value) => {
          value.headerText = x.props.headerText
          value.bodyText = x.props.bodyText
        })
      })

      previousBanners = banners
    }

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      // Reset on project change
      previousBanners = []
      if (!projectId) return

      const project = getProject(projectId)
      update(project.props.banners)
    })

    CoreContext.on('ProjectChanged', ({ project }) => {
      update(project.props.banners)
    })
  },
} as SourceDeclaration

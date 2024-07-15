/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from '../core'

export const ForegroundLayers = [
  // {
  //   name: 'ImageIframeOverlayContainer',
  //   id: 'fg-image-iframe',
  //   layout: 'Free',
  // },
  // {
  //   name: 'BannerContainer',
  //   id: 'fg-banners',
  //   layout: 'Column',
  //   layoutProps: {
  //     cover: true,
  //   },
  // },
  {
    name: 'AlertContainer',
    id: 'alert',
    layout: 'Free',
    layoutProps: {
      type: 'alert',
      preset: "center"
    },
  },
  // {
  //   name: 'VideoOverlayContainer',
  //   id: 'fg-video',
  //   layout: 'Free',
  // },
  // {
  //   name: 'LogoContainer',
  //   layout: 'Free',
  //   id: 'logo',
  // },
]

export const defaultStyles = {
  custom: {
    display: 'block',
  },
  alert: {
    display: 'block',
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    margin: 'auto'
  },
  video: {
    height: '100%',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  logo: {
    objectFit: 'contain',
    position: 'unset',
  },
}

export const validateEachChildren = (
  children: Compositor.SceneNode[],
  allowedSourceTypes: string[],
) => {
  let isValid = true
  children.forEach((child) => {
    if (
      child.props?.sourceType &&
      !allowedSourceTypes.includes(child.props?.sourceType)
    ) {
      isValid = false
    } else {
      if (child.children.length > 0) {
        isValid =
          isValid && validateEachChildren(child.children, allowedSourceTypes)
      }
    }
  })
  return isValid
}

// TODO : Write migration for updating any conflicting node

// const allowedSourceTypes = [
//   'Background',
//   'Banner',
//   'ChatOverlay',
//   'Element',
//   'Overlay',
//   'Logo',
//   'Square',
// ]

// const checkIsBackgroundValid = (root: Compositor.SceneNode) => {
//   const background = root.children.find(
//     (node: any) => node.props.id === 'background',
//   )
//   if (!background) return false
//   if (background.children.length) {
//     return validateEachChildren(background.children)
//   }
//   return true
// }

// const checkIsForegroundValid = (root: Compositor.SceneNode) => {
//   const foreground = root.children.find(
//     (node: any) => node.props.id === 'foreground',
//   )
//   if (!foreground) return false
//   if (foreground.children.length) {
//     return validateEachChildren(foreground.children)
//   }
//   return true
// }

// export const migrateLayout = async (
//   project: string,
//   root: Compositor.SceneNode,
// ): Promise<{ project: SDK.Project; internalProject: InternalProject }> => {
//   if (root) {
//     if (!checkIsBackgroundValid(root) || !checkIsForegroundValid(root)) {
//       return await CoreContext.Command.recreateLayout({ projectId: project })
//     }
//   }
//   return {
//     project: null,
//     internalProject: null,
//   }
// }

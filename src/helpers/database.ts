import { Compositor, SDK } from '../core'
import CoreContext, { InternalProject } from '../core/context'
/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
export const ForegroundLayers = [
  {
    name: 'ImageIframeOverlayContainer',
    id: 'fg-image-iframe',
    layout: 'Free',
  },
  {
    name: 'BannerContainer',
    id: 'fg-banners',
    layout: 'Column',
    layoutProps: {
      cover: true,
    },
  },
  {
    name: 'VideoOverlayContainer',
    id: 'fg-video',
    layout: 'Free',
  },
  {
    name: 'LogoContainer',
    layout: 'Free',
    id: 'logo',
  },
]

export const defaultStyles = {
  custom: {
    display: 'block',
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
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    position: 'unset',
  },
}

const rootLayerSchema = [
  {
    id: 'background',
    name: 'BackgroundContainer',
    layout: 'Free',
  },
  {
    id: 'content',
    name: 'Content',
  },
  {
    id: 'foreground',
    name: 'ForegroundContainer',
    layout: 'Free',
  },
]

const backgroundLayerSchema = {
  preInitChildrens: false,
}

const newRootSchema = {
  id: '47361',
  props: {
    name: 'Root',
    type: 'sceneless-project',
    sourceType: 'Element',
    layout: 'Layered',
    size: { x: 1280, y: 720 },
    isRoot: true,
    tagName: 'div',
    version: 'beta',
    fields: { style: { background: 'black' } },
  },
  children: [
    {
      id: '47362',
      props: { id: 'background', name: 'BackgroundContainer', layout: 'Free' },
      children: [],
    },
    {
      id: '47363',
      props: {
        id: 'content',
        name: 'Content',
        layout: 'Grid',
        layoutProps: { cover: false },
      },
      children: [] as any,
    },
    {
      id: '47364',
      props: { id: 'foreground', name: 'ForegroundContainer', layout: 'Free' },
      children: [
        {
          id: '47366',
          props: {
            name: 'ImageIframeOverlayContainer',
            id: 'fg-image-iframe',
            layout: 'Free',
          },
          children: [] as any,
        },
        {
          id: '47365',
          props: {
            name: 'BannerContainer',
            id: 'fg-banners',
            layout: 'Column',
            layoutProps: { cover: true },
          },
          children: [] as any,
        },
        {
          id: '47367',
          props: {
            name: 'VideoOverlayContainer',
            id: 'fg-video',
            layout: 'Free',
          },
          children: [],
        },
        {
          id: '47368',
          props: {
            name: 'LogoContainer',
            layout: 'Free',
            id: 'logo',
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'unset',
            },
          },
          children: [] as any,
        },
      ],
    },
  ],
}

const oldRootSchema = {
  id: '38217',
  props: {
    type: 'sceneless-project',
    name: 'Root',
    sourceType: 'Element',
    layout: 'Layered',
    size: { x: 1280, y: 720 },
    isRoot: true,
    tagName: 'div',
    version: 'beta',
    fields: { style: { background: 'black' } },
  },
  children: [
    {
      id: '38219',
      props: { type: 'child', name: 'Background', id: 'bg', layout: 'Free' },
      children: [
        {
          id: '45923',
          props: {
            type: 'child',
            name: 'ImageBackground',
            id: 'bg-image',
            tagName: 'img',
            sourceType: 'Element',
            attributes: { src: '' },
            fields: { style: { opacity: 0 } },
          },
          children: [] as any,
        },
        {
          id: '38228',
          props: {
            type: 'child',
            name: 'ImageBackground2',
            sourceType: 'Image2',
            proxySource: 'Background',
            id: 'image-background',
            layout: 'Free',
            src: 'https://studio.golightstream.com/images/polygons.jpg',
            style: { width: '100%', height: '100%', objectFit: 'cover' },
          },
          children: [] as any,
        },
        {
          id: '38229',
          props: {
            type: 'child',
            name: 'VideoBackground',
            sourceType: 'Video2',
            proxySource: 'Background',
            id: 'video-background',
            layout: 'Free',
            style: { width: '100%', height: '100%', objectFit: 'cover' },
          },
          children: [] as any,
        },
      ],
    },
    {
      id: '38218',
      props: {
        type: 'child',
        id: 'content',
        name: 'Content',
        layout: 'Grid',
        layoutProps: { cover: false },
      },
      children: [] as any,
    },
    {
      id: '38220',
      props: {
        type: 'child',
        id: 'foreground',
        name: 'Overlays',
        layout: 'Free',
      },
      children: [
        {
          id: '38222',
          props: {
            type: 'child',
            name: 'BannerContainer',
            id: 'fg-banners',
            layout: 'Column',
            layoutProps: { cover: true },
          },
          children: [
            {
              id: '45540',
              props: { type: 'child', sourceType: 'Banner', bannerId: 12 },
              children: [] as any,
            },
          ],
        },
        {
          id: '47351',
          props: {
            type: 'child',
            name: 'ImageIframeOverlay',
            id: 'fg-image-iframe',
            layout: 'Free',
          },
          children: [] as any,
        },
        {
          id: '38224',
          props: {
            type: 'child',
            name: 'VideoOverlay',
            id: 'fg-video',
            layout: 'Free',
          },
          children: [],
        },
        {
          id: '38225',
          props: {
            type: 'child',
            name: 'Logo',
            layout: 'Free',
            sourceType: 'Logo',
            id: 'logo',
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'unset',
            },
          },
          children: [] as any,
        },
      ],
    },
  ],
}

const allowedSourceTypes = [
  'Background',
  'Banner',
  'ChatOverlay',
  'Element',
  'Overlay',
  'Logo',
  'Square',
]

function validateEachChildren(children: Compositor.SceneNode[]) {
  let isValid = true
  children.forEach((child) => {
    if (
      child.props?.sourceType &&
      !allowedSourceTypes.includes(child.props?.sourceType)
    ) {
      isValid = false
    } else {
      if (child.children.length > 0) {
        isValid = isValid && validateEachChildren(child.children)
      }
    }
  })
  return isValid
}

const checkIsBackgroundValid = (root: Compositor.SceneNode) => {
  const background = root.children.find(
    (node: any) => node.props.id === 'background',
  )
  if (!background) return false
  if (background.children.length) {
    return validateEachChildren(background.children)
  }
  return true
}

const checkIsForegroundValid = (root: Compositor.SceneNode) => {
  const foreground = root.children.find(
    (node: any) => node.props.id === 'foreground',
  )
  if (!foreground) return false
  if (foreground.children.length) {
    return validateEachChildren(foreground.children)
  }
  return true
}

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

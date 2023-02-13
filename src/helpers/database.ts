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
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      position: 'unset',
    },
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
  image : {
    height: '100%',
    width: '100%',
  }
}

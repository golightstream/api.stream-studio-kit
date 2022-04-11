/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import { init, Helpers } from '@golightstream/studio-sdk'

export const DEFAULT_LAYOUT = 'Grid'

export const layouts = [
  'Grid',
  'Grid-Cover',
  'Half',
  'Half-Cover',
  'Presentation-Right',
  'Presentation-Bottom',
  'Presentation-Cover',
  'Column',
  'Column-Cover',
  'Row',
  'Row-Cover',
]

// Custom layout configurations
//  Note: Management of layout props can be done in any way that makes
//  sense for your application (or not at all)
export const getLayout = (
  name: string,
): {
  layout: Helpers.ScenelessProject.LayoutName
  props: Helpers.ScenelessProject.LayoutProps
} => {
  switch (name) {
    case 'Grid': {
      return {
        layout: 'Grid',
        props: {
          cover: false,
        },
      }
    }
    case 'Grid-Cover': {
      return {
        layout: 'Grid',
        props: {
          cover: true,
        },
      }
    }
    case 'Half': {
      return {
        layout: 'Presentation',
        props: {
          cover: false,
          useGrid: true,
          barPosition: 'side',
          barWidth: 0.5,
        },
      }
    }
    case 'Half-Cover': {
      return {
        layout: 'Presentation',
        props: {
          cover: true,
          useGrid: true,
          barPosition: 'side',
          barWidth: 0.5,
        },
      }
    }
    case 'Presentation-Right': {
      return {
        layout: 'Presentation',
        props: {
          cover: false,
          justifyViewers: 'center',
          barPosition: 'side',
          barWidth: 0.2,
        },
      }
    }
    case 'Presentation-Bottom': {
      return {
        layout: 'Presentation',
        props: {
          cover: false,
          justifyViewers: 'center',
          barPosition: 'bottom',
          barWidth: 0.2,
        },
      }
    }
    case 'Presentation-Cover': {
      return {
        layout: 'Presentation',
        props: {
          cover: true,
          justifyViewers: 'flex-end',
          barPosition: 'bottom',
          barWidth: 0.2,
        },
      }
    }
    case 'Column': {
      return {
        layout: 'Column',
        props: {
          cover: false,
        },
      }
    }
    case 'Column-Cover': {
      return {
        layout: 'Column',
        props: {
          cover: true,
        },
      }
    }
    case 'Row': {
      return {
        layout: 'Row',
        props: {
          cover: false,
        },
      }
    }
    case 'Row-Cover': {
      return {
        layout: 'Row',
        props: {
          cover: true,
        },
      }
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React from 'react'
import { Compositor } from '../namespaces'
import { BannerSource } from '../sources/Banners'

export const Banner = {
  name: 'LS-Banner',
  sourceType: 'Banner',
  props: {
    bannerId: {
      type: String,
      required: true,
    },
  },
  useSource(sources, props) {
    // TODO: Filter source.isActive to ensure we're getting the best match
    return sources.find((x) => x.id === props.bannerId)
  },
  create({ onUpdate, onNewSource }, initialProps) {
    const root = document.createElement('div')
    let source: BannerSource

    const Banner = ({ source }: { source: BannerSource }) => {
      const { headerText, bodyText } = source?.value || {}

      return (
        <div
          className="BannerContainer"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
          }}
        >
          <div
            className="Banner"
            style={{
              padding: 10,
              background: 'orange',
              width: 'fit-content',
              height: 'fit-content',
              maxWidth: '84%',
              position: 'relative',
            }}
          >
            {headerText && (
              <div
                className="Banner-header"
                style={{ marginBottom: 6, fontSize: '60px' }}
              >
                {headerText}
              </div>
            )}
            {bodyText && (
              <div className="Banner-body" style={{ fontSize: '24px' }}>
                {bodyText}
              </div>
            )}
          </div>
        </div>
      )
    }

    const render = () => ReactDOM.render(<Banner source={source} />, root)

    onUpdate(() => {
      render()
    })

    onNewSource((_source) => {
      source = _source
      render()
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration

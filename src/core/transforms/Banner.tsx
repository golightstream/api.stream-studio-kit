/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React, { useEffect, useState } from 'react'
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
    let source: BannerSource | null
    let latestSource: BannerSource
    let previousSource: BannerSource

    const Banner = ({
      currentSource,
      latestSource,
    }: {
      currentSource: BannerSource
      latestSource: BannerSource
    }) => {
      const [rendered, setRendered] = useState(false)
      const { headerText, bodyText } = latestSource?.value || {}

      useEffect(() => {
        window.setTimeout(() => {
          setRendered(Boolean(currentSource))
        })
        if (!currentSource) setRendered(false)
      }, [currentSource])

      return (
        <div
          className="BannerContainer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            transition: '200ms ease all',
            ...(!rendered
              ? {
                  zIndex: 1,
                  opacity: 0,
                  transform: 'translateX(-200px)',
                }
              : {
                  zIndex: 2,
                  opacity: 1,
                  transform: 'translateX(0)',
                }),
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
                style={{ marginBottom: 6 }}
              >
                {headerText}
              </div>
            )}
            {bodyText && (
              <div className="Banner-body">
                {bodyText}
              </div>
            )}
          </div>
        </div>
      )
    }

    const render = () =>
      ReactDOM.render(
        <>
          {/* Preserve previous source for animation out */}
          {previousSource && previousSource.id !== latestSource.id && (
            <Banner
              key={previousSource?.id}
              currentSource={null}
              latestSource={previousSource}
            />
          )}
          <Banner
            key={latestSource?.id}
            currentSource={source}
            latestSource={latestSource}
          />
        </>,
        root,
      )

    onUpdate(() => {
      render()
    })

    onNewSource((_source) => {
      previousSource = source
      source = _source
      if (source) {
        latestSource = source
      }
      render()
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration

export const Declaration = Banner

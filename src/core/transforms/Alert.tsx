/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { APIKitAnimationTypes } from '../../animation/core/types'
import APIKitAnimation from '../../compositor/html/html-animation'
import CoreContext from '../context'
import { getProject } from '../data'
import { Compositor } from '../namespaces'
import { Role } from '../types'
import Iframe from './components/Iframe'
export type AlertOverlayProps = {
    src?: string
    settings?: {
        follow?: boolean
        tip?: boolean
    }
    // Opaque to the SDK
    [prop: string]: any
}

export type AlertOverlaySource = {
    id: string
    sourceProps: AlertOverlayProps
    sourceType: string
}

export const Alert = {
    name: 'LS-Alert',
    sourceType: 'Alert',
    create(
        { onUpdate }
    ) {

        const root = document.createElement('div')
        const role = getProject(CoreContext.state.activeProjectId).role

        const Alert = ({ source }: { source: AlertOverlaySource }) => {
            const { id } = source || {}
            const [startAnimation, setStartAnimation] = React.useState(false)
            useEffect(() => {
                setStartAnimation(false)
            }, [id])
            const { src, meta, height, width, settings } = source?.sourceProps || {}
            const iframeRef = React.useRef<HTMLIFrameElement>(null)
            const queryParams = React.useMemo(() => {
                return Object.entries(settings)
                    .map((e) => e.join('='))
                    .concat(
                        role === Role.ROLE_RENDERER
                            ? [`mode=engine`]
                            : [`mode=lightstream`],
                    )
                    .join('&')
            }, [settings, role])

            const resizeIframe = React.useCallback(() => {
                if (iframeRef.current) {
                    setStartAnimation(true)
                }
            }, [])
            return (
                <APIKitAnimation
                    id={id}
                    type="alert"
                    enter={APIKitAnimationTypes.FADE_IN}
                    exit={APIKitAnimationTypes.FADE_OUT}
                    duration={400}
                >
                    <div className="alert-iframe-container" style={{ opacity: startAnimation ? 1 : 0 }}>
                        <Iframe
                            key={source.id}
                            url={`${src}?${queryParams}`}
                            frameBorder={0}
                            iframeRef={iframeRef}
                            height={height}
                            width={width}
                            onLoad={resizeIframe}
                            styles={{ ...meta?.style }}
                        />
                    </div>
                </APIKitAnimation>
            )
        }

        const _root = createRoot(root)
        const render = (source: AlertOverlaySource) =>
            _root.render(
                <>
                    <Alert source={source} />
                </>,
            )

        onUpdate((props) => {
            render({ ...props })
        })

        return {
            root,
        }
    },
} as Compositor.Transform.TransformDeclaration

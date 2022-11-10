/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Sources, Components, Compositor, Elements } from '@api.stream/studio-kit'
import { ScenelessInterface } from '../components/Sceneless'
import { Column, Flex, Row } from '../ui/Box'
import { AppContext } from './context'
import { useSources } from './hooks'

type Participant = Sources.WebRTC.RoomParticipantSource
type Image = Sources.Image.ImageSource
type Video = Sources.Video.VideoSource
type Banner = Sources.Banner.BannerSource

type NodeInterface = Compositor.Component.NodeInterface
type ParticipantElementProps = Elements.WebRTC.Props
type Source = Compositor.Source.Source

type ParticipantNode =
  Compositor.Component.NodeInterface<ParticipantElementProps>
type Project = Components.Project.Interface

export function SourceList<SourceProps>({
  component,
  sourceType,
}: // childTarget,
{
  component: NodeInterface
  sourceType: keyof typeof items
  // childTarget: string
}) {
  const sources = useSources<Participant>(component, sourceType)
  const Component = items[sourceType]
  return (
    <>
      {sources
        .filter((x) => x.isActive)
        .map((x) => (
          <Component participant={x} component={component as any} />
        ))}
    </>
  )
}

export const BackgroundSelect = ({ component }: { component: Project }) => {
  const images = useSources<Image>(component, 'Image')
  const videos = useSources<Video>(component, 'Video')

  return (
    <Column>
      <Column>
        <label>Images</label>
        <Row gap={6}>
          {images.map((x) => {
            const isActive = component.props.backgroundId === x.id
            return (
              <img
                key={x.id}
                src={x.props.src}
                width={70}
                height={40}
                style={{
                  cursor: 'pointer',
                  outline: isActive ? '1px solid white' : 'none',
                }}
                onClick={() =>
                  component.update({
                    backgroundId: isActive ? null : x.id,
                  })
                }
              />
            )
          })}
        </Row>
      </Column>
      <Column>
        <label>Videos</label>
        <Row gap={6}>
          {videos.map((x) => {
            const isActive = component.props.backgroundId === x.id
            return (
              <video
                key={x.id}
                src={x.props.src}
                width={70}
                height={40}
                style={{
                  cursor: 'pointer',
                  outline: isActive ? '1px solid white' : 'none',
                }}
                onClick={() =>
                  component.update({
                    backgroundId: isActive ? null : x.id,
                  })
                }
              />
            )
          })}
        </Row>
      </Column>
    </Column>
  )
}

export const BannerSelect = ({ component }: { component: Project }) => {
  const banners = useSources<Banner>(component, 'Banner')

  return (
    <Row gap={6}>
      {banners.map((x) => {
        const isActive = component.props.bannerId === x.id
        return (
          <Flex
            key={x.id}
            align="center"
            justify="center"
            width={70}
            height={40}
            style={{
              cursor: 'pointer',
              outline: isActive ? '1px solid white' : '1px solid #555',
              fontSize: 18,
            }}
            onClick={() =>
              component.update({
                bannerId: isActive ? null : x.id,
              })
            }
          >
            {x.props.meta.title}
          </Flex>
        )
      })}
    </Row>
  )
}

const RoomParticipant = ({
  participant,
  component,
}: // childTarget,
{
  participant: Participant
  component: ScenelessInterface // TODO: Abstract as NodeInterface
  // childTarget: string
}) => {
  const { isHost } = useContext(AppContext)
  const ref = useRef<HTMLVideoElement>()
  const isEnabled = participant.props.videoEnabled

  // TODO: Find a way to abstract this by child type/list
  const child = component.children.find(
    (x) => x.props.sourceId === participant.id,
  ) as ParticipantNode
  const [onStream, setOnStream] = useState(Boolean(child))

  // Element props
  const [isShowcase, setIsShowcase] = useState(false)
  const [childProps, setChildProps] = useState<ParticipantElementProps>({
    isHidden: child?.props.isHidden ?? false,
    isMuted: child?.props.isMuted ?? false,
    volume: child?.props.volume ?? 1,
  })

  const updateChildProps = useCallback(
    (props: Partial<ParticipantElementProps>) => {
      if (child) {
        component.updateChild(child.id, props)
      } else {
        setChildProps({ ...childProps, ...props })
      }
    },
    [child, childProps, setChildProps],
  )

  useEffect(() => {
    setOnStream(Boolean(child))
    if (child) {
      setChildProps(child.props)
    }
  }, [child])

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = participant.value
    }
  }, [ref?.current, participant.value])

  return (
    <Column
      style={{
        padding: 6,
        borderRadius: 3,
        background: '#000000cc',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div>{participant.props.displayName}</div>
      <div
        style={{
          height: 160,
          width: (160 * 16) / 9,
          position: 'relative',
        }}
      >
        <div
          // Background to show when webcam is not enabled
          style={{
            background: '#222',
            height: '100%',
            width: '100%',
            position: 'absolute',
            zIndex: -1,
          }}
        />
        <video
          // Mute because audio is only communicated through the compositor
          muted={true}
          autoPlay={true}
          ref={ref}
          style={{
            background: 'transparent',
            objectFit: 'cover',
            height: '100%',
            width: '100%',
            display: isEnabled ? 'block' : 'none',
          }}
        />
      </div>
      {isHost && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginTop: 4,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={onStream}
                style={{ marginTop: 0, marginBottom: 0 }}
                onChange={(e) => {
                  const checked = e.target.checked
                  if (!onStream) {
                    // TODO: Abstract this to "add()"
                    component.addChildElement(
                      'RoomParticipant',
                      childProps,
                      participant.id,
                    )
                  } else {
                    // TODO: Abstract this to "remove()"
                    component.removeChild(child.id)
                  }
                  setOnStream(checked)
                }}
              />
              On stream
            </label>

            <label style={{ opacity: onStream ? 1 : 0.5 }}>
              <input
                type="checkbox"
                style={{ marginTop: 0, marginBottom: 0 }}
                disabled={!onStream}
                checked={isShowcase}
                onChange={() => {
                  if (isShowcase) {
                    // projectCommands.setShowcase(null)
                  } else {
                    // projectCommands.setShowcase(id, type)
                  }
                }}
              />
              Showcase
            </label>
          </div>
          <span>
            {participant.props.type === 'camera' && (
              <>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={childProps.volume}
                  style={{ opacity: childProps.isMuted ? 0.4 : 1 }}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    updateChildProps({
                      volume: value,
                      isMuted: false,
                    })
                  }}
                />
                <input
                  type="checkbox"
                  // Invert because "checked" means "enabled" (not muted) in this case
                  checked={!childProps.isMuted}
                  onChange={(e) => {
                    const checked = e.target.checked
                    updateChildProps({
                      isMuted: !checked,
                    })
                  }}
                />
              </>
            )}
          </span>
        </div>
      )}
    </Column>
  )
}

const items = {
  RoomParticipant,
}

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Sources,
  Components,
  Compositor,
  Elements,
} from '../../../../types/src'
import { ScenelessInterface } from '../components/Sceneless'
import { Column, Flex } from '../ui/layout/Box'
import { AppContext } from './context'
import { useSources } from './hooks'

type Participant = Sources.WebRTC.RoomParticipantSource
type NodeInterface = Compositor.Component.NodeInterface
type ParticipantElementProps = Elements.WebRTC.Props
type Source = Compositor.Source.Source

type ParticipantNode =
  Compositor.Component.NodeInterface<ParticipantElementProps>

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

const Layout = ({
  component,
}: {
  component: ScenelessInterface // TODO: Abstract as NodeInterface
}) => {
  const layout = component.props.layout

  const updateChildProps = useCallback(
    (props: Partial<ParticipantElementProps>) => {
      component.
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
    <select
      defaultValue={layout}
      onChange={(e) => {
        const { layout, props } = getLayout(e.target.value)
        execute.setLayout(layout, props)
      }}
    >
      {layouts.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  )
}

const props = {
  Sceneless: {
    Layout,
  },
}

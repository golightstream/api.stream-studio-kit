/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import { useEffect, useRef, useState } from 'react'
import { Helpers, SDK } from '@golightstream/studio-sdk'
import Style from './chat.module.css'

const { useStudio } = Helpers.React

const displayTimeComponent = (component: number) =>
  component < 10 ? `0${component}` : String(component)

const displayTime = (time: Date) =>
  `${time.getHours()}:${displayTimeComponent(
    time.getMinutes(),
  )}:${displayTimeComponent(time.getSeconds())}`

const ChatMessage = ({ message }: { message: SDK.ChatObject }) => {
  const sent = new Date(message.timestamp)
  return (
    <div className={Style.chatItem}>
      <div className={Style.chatTop}>
        <span className={Style.chatUsernameCell}>{message.displayName}</span>
        <span className={Style.chatTimeCell}>{displayTime(sent)}</span>
      </div>
      <div className={Style.chatMessageContent}>{message.content}</div>
    </div>
  )
}

export const Chat = () => {
  const { room } = useStudio()
  const [chatHistory, setChatHistory] = useState<SDK.ChatObject[]>([])
  const [draft, setDraft] = useState('')

  const scrollbox = useRef<HTMLDivElement>(null)

  const onSendMessage = () => {
    if (!draft.trim()) {
      return
    }
    room.sendChatMessage({
      message: draft.trim(),
    })
    setDraft('')
  }

  useEffect(() => {
    if (!room) return
    return room.useChatHistory((history) => {
      const scrollY =
        scrollbox.current.scrollHeight - scrollbox.current.clientHeight
      setChatHistory(history)
      if (scrollbox.current.scrollTop === scrollY) {
        scrollbox.current.scrollTo({
          top: scrollbox.current.scrollHeight - scrollbox.current.clientHeight,
        })
      }
    })
  }, [room])

  return (
    <div className={Style.chatbox}>
      <div ref={scrollbox} className={Style.scrollbox}>
        {chatHistory.length === 0 && (
          <div className={Style.emptyMessage}>
            Private chat between host and guests.
          </div>
        )}
        {chatHistory.map((chat, i) => {
          return <ChatMessage key={i} message={chat} />
        })}
      </div>
      <textarea
        placeholder="Write a message..."
        className={Style.textarea}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
        }}
      />
      <button onClick={onSendMessage}>Send Message</button>
    </div>
  )
}

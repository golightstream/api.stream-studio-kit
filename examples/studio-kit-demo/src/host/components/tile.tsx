/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import { cssRaw, style } from 'typestyle'

interface MediaHeaderProps {
  title: string
}

export const MediaHeader = (props: MediaHeaderProps) => {
  cssRaw(`.media---subhead {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px 0px 0px;
}
.text-1 {
  text-align: left;
  vertical-align: middle;
  font-size: 12px;
  font-family: Kievit Pro;
  letter-spacing: 8%;
  line-height: 120.00000476837158%;
  color: #bababa;
}
.icon-toggle {
  height: 24px;
  width: 24px;
  background-color: #ffffff;
}
..base-----icon-toggle {
  height: 24px;
  width: 24px;
  background-color: #ffffff;
}
.img-2 {
  height: 24px;
  width: 24px;
  background-color: #ffffff;
}`)
  return (
    <div className="media---subhead">
      <p className="text-1">{props.title}</p>
    </div>
  )
}

export interface MediadataProps {
  id: string
  url: string
  thumbnail: string
}

interface MediaRowProps {
  data: MediadataProps[]
  type?: string
  handleClick: (item: MediadataProps, type: string) => void
  selected: boolean
}
function isValidImageURL(str:string) {
  if (typeof str !== 'string') return false
  return !!str.match(/\w+\.(jpg|jpeg|gif|png|tiff|bmp)$/gi)
}
export const MediaRow = (props: MediaRowProps) => {
  const mediaRow = style({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '4px',
  })
  const mediaThumbnail = style({
    height: '68px',
    width: '120px',
    backgroundColor: '#ffffff',
  })
  const baseMediaThumbnail = style({
    borderRadius: '8px',
    height: '68px',
    width: '120px',
  })

  const frame = style({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  })

  return (
    <div className={mediaRow}>
      {props.data.map((item) => (
        <img
          aria-disabled={!props.selected}
          key={item.id}
          className={mediaThumbnail}
          src={item.thumbnail}
          onClick={() => props.handleClick(item, props.type ? props.type :  isValidImageURL(item.url) ? 'image' : 'video' )}
        />
      ))}
    </div>
  )
}

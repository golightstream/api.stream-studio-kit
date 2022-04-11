/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import ReactDOM from 'react-dom'
import { HostView } from './host/host'
import { AppProvider } from './shared/context'
import { Helpers } from '@api.stream/studio-kit'
import url from '../logo.png'
import './index.css'
import '../Font.ttf'

const StudioProvider = Helpers.React.StudioProvider

const Content = () => {
  return (
    <div>
      <div id="header">
        <a href="https://api.stream/" target="_blank">
          <img src={url} height={20} />
        </a>
        <h1>
          Studio Kit
          <span>Demo</span>
        </h1>
      </div>
      <AppProvider isHost={true}>
        <StudioProvider>
          <HostView />
        </StudioProvider>
      </AppProvider>
    </div>
  )
}

ReactDOM.render(<Content />, document.getElementById('root'))

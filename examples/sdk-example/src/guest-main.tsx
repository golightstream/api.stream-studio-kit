/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import ReactDOM from 'react-dom'
import { GuestView } from './guest/guest'
import { AppProvider } from './shared/context'
import { Helpers } from '@golightstream/studio-sdk'
import url from '../logo.png'
import './index.css'

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
        <h3>Guest View</h3>
      </div>
      <AppProvider isHost={false}>
        <StudioProvider>
          <GuestView />
        </StudioProvider>
      </AppProvider>
    </div>
  )
}

ReactDOM.render(<Content />, document.getElementById('root'))

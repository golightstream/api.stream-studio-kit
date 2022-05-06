/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import './renderer.css'
import { init } from '../src/core/index'

const hostname = window.location.hostname
const prodHosts = ['cloud.golightstream.com', 'api.stream']

const getEnv = () => {
  const isProdHost = prodHosts.some((x) => hostname.includes(x))
  if (isProdHost) {
    return 'prod'
  } else {
    return 'stage'
  }
}

const run = async () => {
  const sdk = await init({
    env: getEnv(),
    logLevel: 'Debug',
  })
  const project = sdk?.initialProject

  if (!project) {
    return console.warn('Project not available')
  }
  await project.joinRoom()

  sdk.render({
    containerEl: document.getElementById('root'),
    projectId: project.id,
    dragAndDrop: false,
  })
}

run()

/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
/**
 * Utility functions for dealing with WebRTC, Devices, and {@link Room}-related concepts.
 * 
 * @module Room
 */
import { log } from '../core/context'
import { SDK } from '../core/namespaces'

/**
 * Begin device helpers
 */

type DeviceCallback = (devices: SDK.Devices) => void
const deviceWatchers: Set<DeviceCallback> = new Set()

/** Replace tracks on an existing MediaStream. */
export const updateMediaStreamTracks = (
  srcObject: MediaStream,
  tracks: { audio?: MediaStreamTrack; video?: MediaStreamTrack },
) => {
  // Get existing tracks
  const existing = {
    audio: srcObject.getAudioTracks()[0],
    video: srcObject.getVideoTracks()[0],
  }

  // Replace with new tracks if available
  if (existing.audio !== tracks.audio) {
    if (existing.audio) {
      srcObject.removeTrack(existing.audio)
    }
    if (tracks.audio) {
      srcObject.addTrack(tracks.audio)
    }
  }
  if (existing.video !== tracks.video) {
    if (existing.video) {
      srcObject.removeTrack(existing.video)
    }
    if (tracks.video) {
      srcObject.addTrack(tracks.video)
    }
  }
}

/**
 * Determine which permissions a user has already agreed to in their browser.
 */
export const getDevicePermissions = async () => {
  // Get the available device information
  const devices = await navigator.mediaDevices.enumerateDevices()
  // Check each kind for a device ID to determine whether permission has been granted
  const firstWebcam = devices.find((x) => x.kind === 'videoinput')
  const firstMicrophone = devices.find((x) => x.kind === 'audioinput')
  return {
    /** User has enabled webcam access */
    video: Boolean(firstWebcam) && Boolean(firstWebcam.deviceId),
    /** User has enabled microphone access */
    audio: Boolean(firstMicrophone) && Boolean(firstMicrophone.deviceId),
  }
}

/**
 * Request device permissions, or resolve immediately if they are already available.
 */
export const ensureDevicePermissions = async () => {
  const currentPermissions = await getDevicePermissions()
  if (currentPermissions.audio && currentPermissions.video)
    return currentPermissions

  try {
    const stream = await getUserMedia({
      video: !currentPermissions.video,
      audio: !currentPermissions.audio,
    })
    stream.getTracks().forEach((track) => {
      track.stop()
    })
    return getDevicePermissions()
  } catch (e) {
    log.warn(e)
    return currentPermissions
  }
}

/**
  Accepts a callback which receives a formatted list of devices anytime
   device availability changes.
 */
export const watchDevices = (cb: DeviceCallback) => {
  if (deviceWatchers.size === 0) {
    navigator.mediaDevices.addEventListener('devicechange', reportDevices)
  }
  deviceWatchers.add(cb)
  reportDevices().catch(() => {})

  return () => {
    deviceWatchers.delete(cb)
    if (deviceWatchers.size === 0) {
      navigator.mediaDevices.removeEventListener('devicechange', reportDevices)
    }
  }
}

/**
 * Invoke `navigator.mediaDevices.getUserMedia()` with the args provided.
 * Devices are be reported to existing device watchers to ensure equality.
 */
export const getUserMedia: MediaDevices['getUserMedia'] = async (...args) => {
  const media = await navigator.mediaDevices.getUserMedia(...args)
  reportDevices()
  return media
}

const deviceWithDefaultLabel = <T extends MediaDeviceInfo>(
  x: T,
  label: string,
) =>
  ({
    deviceId: x.deviceId,
    groupId: x.groupId,
    kind: x.kind,
    label: x.label || label,
  } as T)

const reportDevices = async () => {
  const permissions = await ensureDevicePermissions()
  const devices = await navigator.mediaDevices.enumerateDevices()

  // TODO: Format device names (strip identifiers)
  const webcams = permissions.video
    ? (devices.filter((x) => x.kind === 'videoinput') as SDK.Webcam[]).map(
        (x, i) => deviceWithDefaultLabel(x, 'Camera ' + (i + 1)),
      )
    : []
  const microphones = permissions.audio
    ? (devices.filter((x) => x.kind === 'audioinput') as SDK.Microphone[]).map(
        (x, i) => deviceWithDefaultLabel(x, 'Microphone ' + (i + 1)),
      )
    : []
  const speakers = permissions.audio
    ? (devices.filter((x) => x.kind === 'audiooutput') as SDK.Speakers[]).map(
        (x, i) => deviceWithDefaultLabel(x, 'Speaker ' + (i + 1)),
      )
    : []
  deviceWatchers.forEach((cb) =>
    cb({
      webcams,
      microphones,
      speakers,
    }),
  )
}

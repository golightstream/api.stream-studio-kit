<img src="https://github.com/golightstream/api.stream-sdk/blob/main/build/logo-light.png?raw=true#gh-dark-mode-only" alt="API.stream" width="250" style="margin-bottom: 25px"/>
<img src="https://github.com/golightstream/api.stream-sdk/blob/main/build/logo-dark.png?raw=true#gh-light-mode-only" alt="API.stream" width="250" style="margin-bottom: 25px"/>

# Studio Kit

A browser-based JavaScript SDK for <a target="_blank" href="https://api.stream/">API.stream</a>.

The Studio Kit provides your users with everything they need to produce professional-looking live streams to any popular platform (Youtube, Facebook, Twitch, etc.) or custom destination.

<sub>This is a simple and opinionated interface for API.stream services. It implements the [API.stream SDK](https://github.com/golightstream/api.stream-sdk).</sub>

📖 [Read the documentation](https://www.api.stream/docs/sdk/studio/docs/)  
🔍 [View the live demo](https://live.api.stream/studiokit/example/)

<sub>[View demo code](/examples/studio-kit-demo)</sub>

----
#### Installation

```text
npm install @api.stream/studio-kit
```

#### Features

<sub>**Developers** using the Studio Kit will have access to:</sub>

- Drop-in stream canvas
  - Configurable drag-and-drop controls
  - Built-in animations and transitions
- Support for custom stream layouts
- Support for custom themes and presets
- Support for webcam + screenshare for a host and any number of guests
- Simple state hooks designed for interplay with popular frontend frameworks

<sub>**Users** of a website implementing the Studio Kit will be able to:</sub>

- Create and manage multiple projects
- Invite guests to appear on stream
- Select from custom themes and layouts
- Set up a professional-looking stream in minutes
- Go live to multiple destinations at the same time
- Add cameras and screenshares and switch between layouts in real time
----

#### Quick start

###### Initialize the SDK

```typescript
import * as StudioKit from '@api.stream/studio-kit'

// Initialize the SDK to receive a Studio object
const studio = await StudioKit.init()

// Authenticate the user and fetch their projects
const user = await studio.load(ACCESS_TOKEN)
```

_Note: ACCESS_TOKEN should be granted as part of your user login flow.  
Receive this token on the backend by using the [API.stream SDK](https://github.com/golightstream/api.stream-sdk)._

[Example - Retrieve an access token](https://github.com/golightstream/api.stream-sdk/tree/main/examples/js/backend-auth-grpcweb)

###### Monitor events and updates

```typescript
// Listen for events to update state and re-render the UI

studio.subscribe((event, payload) => {
  handleEvent(event, payload) // Update some state
  render(state) // Render some UI (e.g. projects list)
})

const handleEvent = (event, payload) => {
  if (event === 'BroadcastStarted') {
    setIsLive(true)
  } else if (event === 'BroadcastStopped') {
    setIsLive(false)
  }
}
```

###### Create a project

A project represents a single broadcast setup.

```typescript
// ScenelessProject includes utilities to assist with simple stream setup
const { ScenelessProject } = SDK.Helpers

// Create a project with participant and overlay compatibility
const project = await ScenelessProject.create()

// Activate our desired project, initializing event listeners
await studio.Command.setActiveProject({ projectId: project.id })

// Wrap the project in an interface used to manage layout, 
//  add participant video feeds, and change overlays
const projectCommands = ScenelessProject.commands(project)

// Join the WebRTC room to begin sending and receiving video with guests
const room = await activeProject.joinRoom({ displayName })
```

###### Add Guests

Now that we have a WebRTC room, let's invite some guests to join our broadcast.
The first step is to create a link for each guest to join with.

```typescript
const baseUrl = 'https://yourwebsite.com/guest'
const guestLink = await studio.createGuestLink(baseUrl, {
  projectId: project.id,
})
```

_Note: We can also use the Studio.createGuestToken method_

On the guest page, we can have the guest join the WebRTC room. Let's demonstrate how to accomplish this in the context of a React component.

###### Guest Page (React)

```jsx
import { init, Helpers, SDK } from '@api.stream/studio-kit'
const { useStudio, StudioProvider, useDevices } = Helpers.React

// In order to make use of the helpful useStudio hook, our component must be a child of StudioProvider
const GuestApp = ({ children }) => (
  <StudioProvider>
    {children}
  </StudioProvider>
)

const GuestCompoent = () => {
  const { studio, project, room, setStudio, setProject, setRoom, webcamId, microphoneId, setWebcamId, setMicrophoneId } = useStudio()

  // Initialize studio
  // Pass an empty array as deps to ensure that this effect runs only once.
  // There are other, better ways to accomplish this, 
  //  but for brevity in this example, we choose this way.
  useEffect(() => {
    init().then(setStudio)
  }, [])

  // Initialize project
  useEffect(() => {
    if (!studio) return

    if (studio.initialProject) {
      // If the SDK detects a token in the URL, it will return the project
      //  associated with it (e.g. guest view)
      setProject(studio.initialProject)
    } else {
      setError('Invalid token')
    }
  }, [studio])


  // Initialize room
  useEffect(() => {
    if (!project) return
    project
      .joinRoom({
        displayName,
      })
      .then((room) => {
        setJoining(false)
        setRoom(room)
      })
      .catch((e) => {
        setError(e.message)
      })
  }, [project])

  // Gets all webcams and microphones for the guest, listens for changes to available devices
  const devices = useDevices(()

  // As soon as we have our devices, the first available webcam and microphone will be shared across the WebRTC Room.
  useEffect(() => {
    if (!webcamId) setWebcamId(devices.webcams[0]?.deviceId)
  }, [webcamId, devices])
  useEffect(() => {
    if (!microphoneId) setMicrophoneId(devices.microphones[0]?.deviceId)
  }, [microphoneId, devices])

  return (
    <div>
      {/* some react component here*/}
    </div>
  )
}
```

Now that the Guest has joined the room, let's return to the Host's page, and add the guest to our broadcast.

###### Adding Guest To The Broadcast (React)

```jsx

const Participants = () => {
  const { room, projectCommands } = useStudio()
  const [participants, setParticipants] = useState<SDK.Participant[]>([])

  // Listen for room participants
  useEffect(() => {
    return room.useParticipants((participants) => {
      setParticipants(participants)
      // Prune non-existent guests from the project
      // Only the host can do this
      projectCommands.pruneParticipants()
    })
  }, [])

  return (
    <div>
      {participants.map((p) => (
        <div>
          {/* Include some other components to, say, display the participant's camera feed */}
          <WebcamToggle participant={p} />
        </div>
      ))}
    </div>
  )
}

const WebcamToggle = ({ participant }) => {
  const { id } = participant
  const { projectCommands } = useStudio()

  // Get the initial props in case the participant is on stream
  const projectParticipant = useMemo(
    () => projectCommands.getParticipantState(id, 'camera'),
    [],
  )
  const [onStream, setOnStream] = useState(Boolean(projectParticipant))
  const [isMuted, setIsMuted] = useState(projectParticipant?.isMuted ?? false)
  const [volume, setVolume] = useState(projectParticipant?.volume ?? 1)
  const [isShowcase, setIsShowcase] = useState(false)

  // Monitor whether the participant has been removed from the stream
  //  from some other means (e.g. dragged off canvas by host)
  useEffect(() => {
    return projectCommands.useParticipantState(
      id,
      (x) => {
        setOnStream(Boolean(x))
      },
      'camera',
    )
  }, [])

  // Monitor the project's showcase to determine whether this
  // participant/camera is active
  useEffect(
    () =>
      projectCommands.useShowcase((showcase) => {
        setIsShowcase(showcase.participantId === id && showcase.type === 'camera')
      }),
    [],
  )
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={onStream}
          onChange={(e) => {
            const checked = e.target.checked
            if (checked) {
              // Adds the participant's webcam and microphone to the broadcast
              projectCommands.addParticipant(id, { isMuted, volume }, 'camera')
            } else {
              projectCommands.removeParticipant(id, 'camera')
            }
            setOnStream(checked)
          }}
        />
        On stream
      </label>
      <label style={{ opacity: onStream ? 1 : 0.7 }}>
        <input
          type="checkbox"
          disabled={!onStream}
          checked={isShowcase}
          onChange={() => {
            if (isShowcase) {
              projectCommands.setShowcase(null)
            } else {
              projectCommands.setShowcase(id, 'camera')
            }
          }}
        />
        Showcase
      </label>
    </div>
  )
}
```

###### Configure a broadcast

With a project, we are ready to start configuring a broadcast.

```typescript
// Render the drop-in stream canvas into a DOM element of your choosing
const containerEl = document.querySelector('#some-container')
studio.render({
  projectId: project.id, // The project to render
  containerEl, // The element to render the preview into
  dragAndDrop: true, // Include drag 'n' drop functionality
})

// Configure a destination for the active project
studio.Command.setDestination({
  projectId: project.id,
  rtmpUrl: 'rtmp://some-rtmp-url.com/',
  rtmpKey: 'some_stream_key_123',
})
```

###### Start a broadcast

Once a destination is set, the project is ready to go live.

```typescript
studio.Command.startBroadcast({
  projectId: project.id,
})
```

#### Authentication & Authorization

API.stream relies heavily on modern JWT-based authentication flows. The backend authentication service issues JWTs which clients assert on subsequent API calls. Those JWTs include grants allowing clients to safely share projects with collaborators and guests.

[Learn more about authentication with API.stream](https://www.api.stream/docs/api/auth/)

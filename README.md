# Studio Kit

Empower users to create personalized live broadcasts.

A browser-based JavaScript client for <a href="https://api.stream/">api.stream</a>.

#### Installation

``` text
npm install @api.stream/studio-kit
```

#### Demo

###### Live
https://cloud.golightstream.com/studiosdk/v2/example/latest/

###### Code
https://github.com/golightstream/studio-sdk/tree/main/examples/sdk-example

#### Quick start

###### Initialize the SDK
```typescript
import * as SDK from '@api.stream/studio-kit'

const studio = await SDK.init()

/** 
 * Create a temporary access token that can be used by a front-end 
 * client for demonstration purposes.
 *
 * In a production system, this token must be granted as part of the user 
 * login flow (wherein a partner front-end logs into a partner backend, 
 * which in turn connects to the api.stream backend to obtain an appropriate 
 * access token, which is then returned by the partner backend to the partner 
 * front-end for SDK use).
 */
const accessToken = await studio.createDemoToken({
  // Replace with an arbitrary identifier for your service
  serviceName: 'demo-service',
  // Replace with a unique, opaque identifier for a given user of your service
  userId: 'demo-id',
  // Replace with a friendly name for this user
  userName: 'demo-user',
})

// Authenticate the user and fetch their projects
const { projects } = await studio.load(accessToken)
```

*Note: `createDemoToken` should not be used in a production environment. For an example of how to obtain access tokens in production, see the [Access Token Example](#access-token-example) section below.*

###### Monitor events and updates
```typescript
// Listen for events to update state and re-render the UI
//  Note: There are many ways to do this! (e.g. reducer pattern)

studio.subscribe((event, payload) => {
  handleEvent(event, payload)  // Update some state
  render(state)                // Render some UI (e.g. projects list)
})

const handleEvent = (event, payload) => {
  switch (event) {
    case 'ProjectAdded': {
      return state.projects = [...state.projects, payload.project]
    }
    case 'ActiveProjectChanged': {
      return state.activeProject = payload.project
    }
  }
}
```
###### Create a project

A project represents a single broadcast setup.  
```typescript
// ScenelessProject includes utilities to assist with stream setup
const { ScenelessProject } = SDK.Helpers

// Create a project with participant and overlay compatibility
const project = await ScenelessProject.create()

// Activate our desired project, initializing event listeners
await studio.Command.setActiveProject({ projectId: project.id })

// Join the WebRTC room to begin sending and receiving video with guests
const room = await activeProject.joinRoom({ displayName })

// Wrap the project in an interface to manage layout, participant video feeds, and overlays
const projectCommands = ScenelessProject.commands(project)

// ...(Use `projectCommands` to configure the elements on the stream canvas)
```
###### Add Guests

Now that we have a WebRTC room, let's invite some guests to join our broadcast.
The first step is to create a link for each guest to join with.
```typescript
const baseUrl = 'https://yourwebsite.com/guest'
const guestLink = await studio.createGuestLink(
  baseUrl, {
    projectId: project.id,
  },
)
```
*Note: We can also use the Studio.createGuestToken method*

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
  // There are other, better ways to accomplish this, but for brevity in this example, we choose this way.
  useEffect(() => {
    init()
      .then(setStudio)
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

Now that the Guest has joined the {@link Room}, let's return to the Host's page, and add the guest to our broadcast.

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

Once we have a project, we are ready to start configuring a broadcast.
```typescript
// Render the stream preview to the page
const containerEl = document.querySelector('#some-container')
studio.render({
  projectId: project.id,   // The project to render
  containerEl,             // The element to render the preview into
  dragAndDrop: true,       // Include drag 'n' drop functionality
})

// Configure a destination for the active project
studio.Command.setDestination({
  projectId: project.id,
  rtmpUrl: 'rtmp://some-rtmp-url.com/',
  rtmpKey: 'some_stream_key_123',
})
```
###### Start a broadcast

Once a destination has been set, the project is ready to go live
```typescript
studio.Command.startBroadcast({
  projectId: project.id,
})
```

#### Authentication & Authorization

API.stream relies heavily on modern JWT-based authentication flows. The backend authentication service issues JWTs which clients assert on subsequent API calls. Those JWTs include grants allowing clients to safely share projects with collaborators and guests.

API.stream, by design, does not provide an authentication system for end users of a partner's system. It is assumed our partners will implement an authentication service appropriate for their particular application and users. While the API.stream services can and must uniquely distinguish users from one another (for document ownership and authorization purposes), they do not acquire, store, or have access to any personal information about the users of a partner's system. The user identifier associated with documents in the API.stream backend is an opaque string provided by a partner system; our only requirement is that it be unique for each user on a partner's system.

In a production workflow, users of a partner's system first connect to the partner's own backend for authentication. This flow may be inclusive of other third-party services (e.g., Google Firebase) on which the partner relies. 

Once a partner's backend has authenticated a user of their system, the partner's backend system makes an API call to the backend authentication service to obtain a JWT access token on behalf of the user. That singular API call, used to obtain a JWT, is the only `api.stream` API secured with a shared secret key. As such, that API call must only be called from a backend system where the shared secret key can be kept secret.

The newly minted JWT is returned by the API.stream backend to the partner's backend, which in turn relays it to the partner's end-user client to complete the authentication flow. The client then initializes the API SDK library with the JWT, or asserts it directly if using the APIs without an accompanying library.

##### Access Token Example

*Note: this example uses Node.js. For more information on how to create an access token for the host of your stream, please see [our API docs](https://api.stream/docs/api/video/rest/#operation/BackendAuthenticationService_CreateOwnerAccessToken).*

###### Server-side (Node.js)
```typescript
const HTTP = require('request-promise')

const url = 'https://cloud.golightstream.com/vapi/v2/authentication/token/owner'
const userId = YOUR_INTERNAL_USER_ID

const getToken = async () => {
  const { accessToken } = await HTTP.post(url, {
    json: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Credentials': true,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Api-Key': YOUR_API_KEY,
    },
    body: {
      serviceUserId: userId,
    },
  })
  return accessToken
}
```
Once have an access token for our host, we send it to the client, where we can initialize Studio and load the User the with the {@link Studio.load} method.

###### Client-side

```typescript
import { init } from '@api.stream/studio-kit'

const studio = await init()
const user = await studio.load(accessToken)
```


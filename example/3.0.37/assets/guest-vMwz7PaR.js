import { i as index$1, a as reactExports, b as init, d as config, j as jsx, c as jsxs, S as Style, D as DeviceSelection, f as Participant, e as Chat, C as ControlPanel, h as ReactDOM, u as url, A as AppProvider } from "./index-M80h-wYg.js";
const {
  Room
} = index$1;
const {
  useStudio
} = index$1.React;
const DEFAULT_GUEST_NAME = "Guest-" + Math.floor(Math.random() * 1e4);
const Project = () => {
  const {
    studio,
    project,
    room,
    projectCommands
  } = useStudio();
  const renderContainer = reactExports.useRef();
  const [isLive, setIsLive] = reactExports.useState(false);
  reactExports.useEffect(() => {
    Room.ensureDevicePermissions();
  });
  reactExports.useEffect(() => {
    return project.subscribe((event, payload) => {
      if (event === "BroadcastStarted") {
        setIsLive(true);
      } else if (event === "BroadcastStopped") {
        setIsLive(false);
      }
    });
  }, []);
  reactExports.useEffect(() => {
    if (room) {
      room.sendData({
        type: "UserJoined"
      });
    }
  }, [room]);
  reactExports.useEffect(() => {
    studio.render({
      containerEl: renderContainer.current,
      projectId: project.id,
      dragAndDrop: false
      // Disable controls for guests
    });
  }, [renderContainer.current]);
  if (!room)
    return null;
  return /* @__PURE__ */ jsxs("div", {
    className: Style.column,
    style: {
      marginLeft: 10
    },
    children: [/* @__PURE__ */ jsx("div", {
      ref: renderContainer
    }), isLive && /* @__PURE__ */ jsx("div", {
      style: {
        fontWeight: "bold"
      },
      children: "You're live!"
    }), /* @__PURE__ */ jsxs("div", {
      className: Style.row,
      children: [/* @__PURE__ */ jsx(DeviceSelection, {}), /* @__PURE__ */ jsx("div", {
        style: {
          marginLeft: 20,
          marginTop: 12
        },
        children: /* @__PURE__ */ jsx(ControlPanel, {
          room,
          projectCommands
        })
      })]
    })]
  });
};
const GuestView = () => {
  const {
    studio,
    project,
    room,
    setStudio,
    setProject,
    setRoom
  } = useStudio();
  const [joining, setJoining] = reactExports.useState(false);
  const [displayName, setDisplayName] = reactExports.useState(DEFAULT_GUEST_NAME);
  const [participant, setParticipant] = reactExports.useState();
  const [error, setError] = reactExports.useState();
  const [inRoom, setInRoom] = reactExports.useState(false);
  window.SDK = useStudio();
  reactExports.useEffect(() => {
    if (!room)
      return;
    return room.useParticipant(room.participantId, setParticipant);
  }, [room]);
  reactExports.useEffect(() => {
    if (!joining)
      return;
    if (!studio) {
      init({
        env: config.env,
        logLevel: config.logLevel
      }).then(setStudio).catch((e) => {
        console.warn(e);
        setError(e.message);
      });
    }
  }, [joining]);
  reactExports.useEffect(() => {
    if (!studio)
      return;
    if (studio.initialProject) {
      setProject(studio.initialProject);
    } else {
      setError("Invalid token");
    }
  }, [studio]);
  reactExports.useEffect(() => {
    if (!project || inRoom)
      return;
    setInRoom(true);
    project.joinRoom({
      displayName
    }).then((room2) => {
      setJoining(false);
      setRoom(room2);
    }).catch((e) => {
      setError(e.message);
      setInRoom(false);
    });
  }, [project, room]);
  if (error) {
    return /* @__PURE__ */ jsx("div", {
      children: error
    });
  }
  if (joining) {
    return /* @__PURE__ */ jsxs("div", {
      children: ["Joining as ", displayName, "..."]
    });
  }
  if (!room) {
    return /* @__PURE__ */ jsxs("form", {
      className: Style.column,
      style: {
        width: 316,
        alignItems: "flex-end"
      },
      onSubmit: (e) => {
        e.preventDefault();
        setJoining(true);
      },
      children: [/* @__PURE__ */ jsxs("div", {
        className: Style.column,
        children: [/* @__PURE__ */ jsx("label", {
          children: "Display Name"
        }), /* @__PURE__ */ jsx("input", {
          type: "text",
          autoFocus: true,
          defaultValue: displayName,
          onChange: (e) => {
            setDisplayName(e.target.value);
          }
        })]
      }), /* @__PURE__ */ jsx(DeviceSelection, {}), /* @__PURE__ */ jsx("button", {
        style: {
          marginTop: 8,
          width: 70
        },
        onClick: () => {
          setJoining(true);
        },
        children: "Join"
      })]
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: Style.row,
    style: {
      marginTop: 14,
      background: "#242533",
      padding: 10
    },
    children: [/* @__PURE__ */ jsx("div", {
      className: Style.column,
      children: participant && /* @__PURE__ */ jsx(Participant, {
        participant
      })
    }), /* @__PURE__ */ jsx(Project, {}), /* @__PURE__ */ jsx("div", {
      style: {
        marginLeft: 10
      },
      children: /* @__PURE__ */ jsx(Chat, {})
    })]
  });
};
const StudioProvider = index$1.React.StudioProvider;
const Content = () => {
  return /* @__PURE__ */ jsxs("div", {
    children: [/* @__PURE__ */ jsxs("div", {
      id: "header",
      children: [/* @__PURE__ */ jsx("a", {
        href: "https://api.stream/",
        target: "_blank",
        children: /* @__PURE__ */ jsx("img", {
          src: url,
          height: 20
        })
      }), /* @__PURE__ */ jsxs("h1", {
        children: ["Studio Kit", /* @__PURE__ */ jsx("span", {
          children: "Demo"
        })]
      }), /* @__PURE__ */ jsx("h3", {
        children: "Guest View"
      })]
    }), /* @__PURE__ */ jsx(AppProvider, {
      isHost: false,
      children: /* @__PURE__ */ jsx(StudioProvider, {
        children: /* @__PURE__ */ jsx(GuestView, {})
      })
    })]
  });
};
ReactDOM.render(/* @__PURE__ */ jsx(Content, {}), document.getElementById("root"));
//# sourceMappingURL=guest-vMwz7PaR.js.map

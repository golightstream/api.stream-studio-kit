import { i as index$1, r as react, a as init, j as jsx, b as jsxs, S as Style, D as DeviceSelection, f as Participant, d as Chat, C as ControlPanel, c as config, e as ReactDOM, u as url, A as AppProvider } from "./index.eb20a625.js";
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
    room
  } = useStudio();
  const renderContainer = react.exports.useRef();
  const [isLive, setIsLive] = react.exports.useState(false);
  react.exports.useEffect(() => {
    Room.ensureDevicePermissions();
  });
  react.exports.useEffect(() => {
    return project.subscribe((event, payload) => {
      if (event === "BroadcastStarted") {
        setIsLive(true);
      } else if (event === "BroadcastStopped") {
        setIsLive(false);
      }
    });
  }, []);
  react.exports.useEffect(() => {
    if (room) {
      room.sendData({
        type: "UserJoined"
      });
    }
  }, [room]);
  react.exports.useEffect(() => {
    studio.render({
      containerEl: renderContainer.current,
      projectId: project.id,
      dragAndDrop: false
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
        children: /* @__PURE__ */ jsx(ControlPanel, {})
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
  const [joining, setJoining] = react.exports.useState(false);
  const [displayName, setDisplayName] = react.exports.useState(DEFAULT_GUEST_NAME);
  const [participant, setParticipant] = react.exports.useState();
  const [error, setError] = react.exports.useState();
  const [inRoom, setInRoom] = react.exports.useState(false);
  window.SDK = useStudio();
  react.exports.useEffect(() => {
    if (!room)
      return;
    return room.useParticipant(room.participantId, setParticipant);
  }, [room]);
  react.exports.useEffect(() => {
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
  react.exports.useEffect(() => {
    if (!studio)
      return;
    if (studio.initialProject) {
      setProject(studio.initialProject);
    } else {
      setError("Invalid token");
    }
  }, [studio]);
  react.exports.useEffect(() => {
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
//# sourceMappingURL=guest.9baae944.js.map

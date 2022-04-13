import { i as index, r as react, a as init, j as jsx, b as jsxs, S as Style, P as Participants, D as DeviceSelection, C as ControlPanel, c as Chat, d as config, R as ReactDOM, u as url, A as AppProvider } from "./index.0d48341b.js";
const DEFAULT_LAYOUT = "Grid";
const layouts = ["Grid", "Grid-Cover", "Half", "Half-Cover", "Presentation-Right", "Presentation-Bottom", "Presentation-Cover", "Column", "Column-Cover", "Row", "Row-Cover"];
const getLayout = (name) => {
  switch (name) {
    case "Grid": {
      return {
        layout: "Grid",
        props: {
          cover: false
        }
      };
    }
    case "Grid-Cover": {
      return {
        layout: "Grid",
        props: {
          cover: true
        }
      };
    }
    case "Half": {
      return {
        layout: "Presentation",
        props: {
          cover: false,
          useGrid: true,
          barPosition: "side",
          barWidth: 0.5
        }
      };
    }
    case "Half-Cover": {
      return {
        layout: "Presentation",
        props: {
          cover: true,
          useGrid: true,
          barPosition: "side",
          barWidth: 0.5
        }
      };
    }
    case "Presentation-Right": {
      return {
        layout: "Presentation",
        props: {
          cover: false,
          justifyViewers: "center",
          barPosition: "side",
          barWidth: 0.2
        }
      };
    }
    case "Presentation-Bottom": {
      return {
        layout: "Presentation",
        props: {
          cover: false,
          justifyViewers: "center",
          barPosition: "bottom",
          barWidth: 0.2
        }
      };
    }
    case "Presentation-Cover": {
      return {
        layout: "Presentation",
        props: {
          cover: true,
          justifyViewers: "flex-end",
          barPosition: "bottom",
          barWidth: 0.2
        }
      };
    }
    case "Column": {
      return {
        layout: "Column",
        props: {
          cover: false
        }
      };
    }
    case "Column-Cover": {
      return {
        layout: "Column",
        props: {
          cover: true
        }
      };
    }
    case "Row": {
      return {
        layout: "Row",
        props: {
          cover: false
        }
      };
    }
    case "Row-Cover": {
      return {
        layout: "Row",
        props: {
          cover: true
        }
      };
    }
  }
};
const {
  ScenelessProject
} = index;
const {
  useStudio
} = index.React;
const getUrl = () => window.location.protocol + "//" + window.location.host + window.location.pathname;
const storage = {
  userName: localStorage.getItem("userName") || "",
  serviceName: localStorage.getItem("serviceName") || "Example-" + Math.floor(Math.random() * 1e6)
};
const Login = (props) => {
  const {
    studio
  } = useStudio();
  const {
    onLogin
  } = props;
  const [userName, setUserName] = react.exports.useState(storage.userName);
  const [serviceName, setServiceName] = react.exports.useState(storage.serviceName);
  const login = async (e) => {
    e.preventDefault();
    const token = await studio.createDemoToken({
      serviceName,
      userId: userName,
      name: userName
    });
    onLogin({
      token,
      userName,
      serviceName
    });
  };
  return /* @__PURE__ */ jsxs("form", {
    className: Style.column,
    onSubmit: login,
    style: {
      width: 316,
      alignItems: "flex-end"
    },
    children: [/* @__PURE__ */ jsxs("div", {
      className: Style.column,
      children: [/* @__PURE__ */ jsx("label", {
        children: "Service identifier"
      }), /* @__PURE__ */ jsx("input", {
        type: "text",
        autoFocus: true,
        defaultValue: serviceName,
        onChange: (e) => {
          setServiceName(e.target.value);
        }
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: Style.column,
      children: [/* @__PURE__ */ jsx("label", {
        children: "Username"
      }), /* @__PURE__ */ jsx("input", {
        type: "text",
        autoFocus: true,
        defaultValue: userName,
        onChange: (e) => {
          setUserName(e.target.value);
        }
      })]
    }), /* @__PURE__ */ jsx("button", {
      onClick: login,
      style: {
        marginTop: 8,
        width: 70
      },
      children: "Login"
    })]
  });
};
const Project = () => {
  const {
    studio,
    project,
    room,
    projectCommands
  } = useStudio();
  const renderContainer = react.exports.useRef();
  const destination = project.destinations[0];
  const destinationAddress = destination == null ? void 0 : destination.address.rtmpPush;
  const {
    Command
  } = studio;
  const [rtmpUrl, setRtmpUrl] = react.exports.useState(destinationAddress == null ? void 0 : destinationAddress.url);
  const [streamKey, setStreamKey] = react.exports.useState(destinationAddress == null ? void 0 : destinationAddress.key);
  const [previewUrl, setPreviewUrl] = react.exports.useState("");
  const [guestUrl, setGuestUrl] = react.exports.useState("");
  const [isLive, setIsLive] = react.exports.useState(false);
  const layout = project.props.layout;
  const background = projectCommands.getBackgroundImage();
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
    studio.createPreviewLink().then(setPreviewUrl);
    studio.createGuestLink(getUrl() + "guest/").then(setGuestUrl);
  }, []);
  react.exports.useEffect(() => {
    studio.render({
      containerEl: renderContainer.current,
      projectId: project.id,
      dragAndDrop: true
    });
  }, [renderContainer.current]);
  return /* @__PURE__ */ jsxs("div", {
    className: Style.column,
    children: [/* @__PURE__ */ jsxs("div", {
      style: {
        fontSize: 11,
        marginBottom: 14
      },
      children: ["Logged in as ", localStorage.userName, /* @__PURE__ */ jsx("div", {
        children: /* @__PURE__ */ jsx("a", {
          onClick: () => {
            localStorage.removeItem("token");
            window.location.reload();
          },
          children: "Log out"
        })
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: Style.column,
      style: {
        width: 316
      },
      children: [/* @__PURE__ */ jsx("label", {
        children: "RTMP Url"
      }), /* @__PURE__ */ jsx("input", {
        type: "text",
        defaultValue: rtmpUrl,
        onChange: (e) => {
          setRtmpUrl(e.target.value);
        }
      }), /* @__PURE__ */ jsx("label", {
        children: "Stream Key"
      }), /* @__PURE__ */ jsx("input", {
        type: "text",
        defaultValue: streamKey,
        onChange: (e) => {
          setStreamKey(e.target.value);
        }
      }), /* @__PURE__ */ jsx("div", {
        className: Style.row,
        style: {
          width: "100%",
          justifyContent: "flex-end",
          marginTop: 5
        },
        children: !isLive ? /* @__PURE__ */ jsx("button", {
          onClick: async () => {
            await Command.setDestination({
              projectId: project.id,
              rtmpKey: streamKey,
              rtmpUrl
            });
            Command.startBroadcast({
              projectId: project.id
            });
          },
          children: "Go Live"
        }) : /* @__PURE__ */ jsx("button", {
          onClick: () => {
            Command.stopBroadcast({
              projectId: project.id
            });
          },
          children: "End broadcast"
        })
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: Style.row,
      style: {
        marginTop: 14,
        marginBottom: 8,
        background: "#242533",
        padding: 10
      },
      children: [/* @__PURE__ */ jsx(Participants, {}), /* @__PURE__ */ jsxs("div", {
        className: Style.column,
        style: {
          marginLeft: 14,
          marginBottom: 14
        },
        children: [/* @__PURE__ */ jsxs("div", {
          className: Style.column,
          children: [/* @__PURE__ */ jsx("label", {
            children: "Background URL"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            defaultValue: background,
            onChange: (e) => {
              projectCommands.setBackgroundImage(e.target.value);
            }
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: Style.column,
          children: [/* @__PURE__ */ jsx("label", {
            children: "Layout"
          }), /* @__PURE__ */ jsx("select", {
            defaultValue: layout,
            onChange: (e) => {
              const {
                layout: layout2,
                props
              } = getLayout(e.target.value);
              projectCommands.setLayout(layout2, props);
              studio.Command.updateProjectMeta({
                projectId: project.id,
                meta: {
                  layout: e.target.value
                }
              });
            },
            children: layouts.map((x) => /* @__PURE__ */ jsx("option", {
              value: x,
              children: x
            }, x))
          })]
        }), /* @__PURE__ */ jsx("div", {
          ref: renderContainer,
          style: {
            width: 840,
            height: 500
          }
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
      }), /* @__PURE__ */ jsx("div", {
        style: {
          marginLeft: 14
        },
        children: /* @__PURE__ */ jsx(Chat, {})
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: Style.column,
      children: [/* @__PURE__ */ jsx("label", {
        children: "Preview URL"
      }), /* @__PURE__ */ jsx("input", {
        onClick: (e) => e.target.select(),
        value: previewUrl,
        readOnly: true,
        style: {
          width: 630
        }
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: Style.column,
      children: [/* @__PURE__ */ jsx("label", {
        children: "Guest URL"
      }), /* @__PURE__ */ jsx("input", {
        onClick: (e) => e.target.select(),
        value: guestUrl,
        readOnly: true,
        style: {
          width: 630
        }
      })]
    })]
  });
};
const HostView = () => {
  const {
    studio,
    project,
    projectCommands,
    room,
    setProject,
    setRoom,
    setStudio
  } = useStudio();
  const [token, setToken] = react.exports.useState(localStorage["token"]);
  const [failure, setFailure] = react.exports.useState(null);
  window.SDK = useStudio();
  react.exports.useEffect(() => {
    init({
      env: config.env,
      logLevel: config.logLevel
    }).then(setStudio).catch((e) => {
      console.warn("Failed to initialize", e);
      setFailure(e.message);
    });
  }, []);
  react.exports.useEffect(() => {
    if (!studio)
      return;
    setProject(studio.initialProject);
  }, [studio]);
  react.exports.useEffect(() => {
    if (!token || !studio || project)
      return;
    studio.load(token).then(async (user) => {
      let project2 = user.projects[0];
      if (!project2) {
        const {
          layout,
          props
        } = getLayout(DEFAULT_LAYOUT);
        project2 = await ScenelessProject.create({
          backgroundImage: getUrl() + "bg.png",
          layout,
          layoutProps: props
        }, {
          layout: DEFAULT_LAYOUT
        });
      }
      const activeProject = await studio.Command.setActiveProject({
        projectId: project2.id
      });
      const room2 = await activeProject.joinRoom({
        displayName: localStorage.userName
      });
      setRoom(room2);
      setProject(activeProject);
    }).catch((e) => {
      console.warn(e);
      setToken(null);
      localStorage.removeItem("token");
    });
  }, [studio, token, project]);
  react.exports.useEffect(() => {
    if (!projectCommands || !room)
      return;
    projectCommands.pruneParticipants();
  }, [projectCommands, room]);
  if (project && room) {
    return /* @__PURE__ */ jsx(Project, {});
  }
  if (studio && !token) {
    return /* @__PURE__ */ jsx(Login, {
      onLogin: ({
        userName,
        serviceName,
        token: token2
      }) => {
        setToken(token2);
        localStorage.setItem("serviceName", serviceName);
        localStorage.setItem("userName", userName);
        localStorage.setItem("token", token2);
      }
    });
  }
  if (failure) {
    return /* @__PURE__ */ jsxs("div", {
      children: ["Failed to initialize: `", failure, "`"]
    });
  }
  return /* @__PURE__ */ jsx("div", {
    children: "Loading..."
  });
};
const StudioProvider = index.React.StudioProvider;
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
      })]
    }), /* @__PURE__ */ jsx(AppProvider, {
      isHost: true,
      children: /* @__PURE__ */ jsx(StudioProvider, {
        children: /* @__PURE__ */ jsx(HostView, {})
      })
    })]
  });
};
ReactDOM.render(/* @__PURE__ */ jsx(Content, {}), document.getElementById("root"));
//# sourceMappingURL=main.018c1054.js.map

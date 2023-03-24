import { R as React, r as react, j as jsx, i as index$1, a as init, b as jsxs, S as Style$1, c as config, P as Participants, D as DeviceSelection, C as ControlPanel, d as Chat, e as ReactDOM, u as url, A as AppProvider } from "./index.c3383ff4.js";
const DEFAULT_LAYOUT = "Grid";
const layouts = ["Grid", "Grid-Cover", "Half", "Half-Cover", "Presentation-Right", "Presentation-Left", "Presentation-Bottom", "Presentation-Cover", "Column", "Column-Cover", "Row", "Row-Cover"];
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
    case "Presentation-Left": {
      return {
        layout: "Presentation",
        props: {
          cover: false,
          justifyViewers: "center",
          barPosition: "side",
          barWidth: 0.2,
          reverse: true
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
var propTypes = { exports: {} };
var ReactPropTypesSecret$1 = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
var ReactPropTypesSecret_1 = ReactPropTypesSecret$1;
var ReactPropTypesSecret = ReactPropTypesSecret_1;
function emptyFunction() {
}
function emptyFunctionWithReset() {
}
emptyFunctionWithReset.resetWarningCache = emptyFunction;
var factoryWithThrowingShims = function() {
  function shim(props, propName, componentName, location2, propFullName, secret) {
    if (secret === ReactPropTypesSecret) {
      return;
    }
    var err = new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");
    err.name = "Invariant Violation";
    throw err;
  }
  shim.isRequired = shim;
  function getShim() {
    return shim;
  }
  var ReactPropTypes = {
    array: shim,
    bigint: shim,
    bool: shim,
    func: shim,
    number: shim,
    object: shim,
    string: shim,
    symbol: shim,
    any: shim,
    arrayOf: getShim,
    element: shim,
    elementType: shim,
    instanceOf: getShim,
    node: shim,
    objectOf: getShim,
    oneOf: getShim,
    oneOfType: getShim,
    shape: getShim,
    exact: getShim,
    checkPropTypes: emptyFunctionWithReset,
    resetWarningCache: emptyFunction
  };
  ReactPropTypes.PropTypes = ReactPropTypes;
  return ReactPropTypes;
};
{
  propTypes.exports = factoryWithThrowingShims();
}
var PropTypes = propTypes.exports;
function _extends$1() {
  _extends$1 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source2 = arguments[i];
      for (var key2 in source2) {
        if (Object.prototype.hasOwnProperty.call(source2, key2)) {
          target[key2] = source2[key2];
        }
      }
    }
    return target;
  };
  return _extends$1.apply(this, arguments);
}
function _objectWithoutPropertiesLoose$1(source2, excluded) {
  if (source2 == null)
    return {};
  var target = {};
  var sourceKeys = Object.keys(source2);
  var key2, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key2 = sourceKeys[i];
    if (excluded.indexOf(key2) >= 0)
      continue;
    target[key2] = source2[key2];
  }
  return target;
}
function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return self;
}
function _inheritsLoose$1(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}
var ReCAPTCHA = /* @__PURE__ */ function(_React$Component) {
  _inheritsLoose$1(ReCAPTCHA2, _React$Component);
  function ReCAPTCHA2() {
    var _this;
    _this = _React$Component.call(this) || this;
    _this.handleExpired = _this.handleExpired.bind(_assertThisInitialized(_this));
    _this.handleErrored = _this.handleErrored.bind(_assertThisInitialized(_this));
    _this.handleChange = _this.handleChange.bind(_assertThisInitialized(_this));
    _this.handleRecaptchaRef = _this.handleRecaptchaRef.bind(_assertThisInitialized(_this));
    return _this;
  }
  var _proto = ReCAPTCHA2.prototype;
  _proto.getValue = function getValue() {
    if (this.props.grecaptcha && this._widgetId !== void 0) {
      return this.props.grecaptcha.getResponse(this._widgetId);
    }
    return null;
  };
  _proto.getWidgetId = function getWidgetId() {
    if (this.props.grecaptcha && this._widgetId !== void 0) {
      return this._widgetId;
    }
    return null;
  };
  _proto.execute = function execute() {
    var grecaptcha = this.props.grecaptcha;
    if (grecaptcha && this._widgetId !== void 0) {
      return grecaptcha.execute(this._widgetId);
    } else {
      this._executeRequested = true;
    }
  };
  _proto.executeAsync = function executeAsync() {
    var _this2 = this;
    return new Promise(function(resolve, reject) {
      _this2.executionResolve = resolve;
      _this2.executionReject = reject;
      _this2.execute();
    });
  };
  _proto.reset = function reset() {
    if (this.props.grecaptcha && this._widgetId !== void 0) {
      this.props.grecaptcha.reset(this._widgetId);
    }
  };
  _proto.handleExpired = function handleExpired() {
    if (this.props.onExpired) {
      this.props.onExpired();
    } else {
      this.handleChange(null);
    }
  };
  _proto.handleErrored = function handleErrored() {
    if (this.props.onErrored) {
      this.props.onErrored();
    }
    if (this.executionReject) {
      this.executionReject();
      delete this.executionResolve;
      delete this.executionReject;
    }
  };
  _proto.handleChange = function handleChange(token) {
    if (this.props.onChange) {
      this.props.onChange(token);
    }
    if (this.executionResolve) {
      this.executionResolve(token);
      delete this.executionReject;
      delete this.executionResolve;
    }
  };
  _proto.explicitRender = function explicitRender() {
    if (this.props.grecaptcha && this.props.grecaptcha.render && this._widgetId === void 0) {
      var wrapper = document.createElement("div");
      this._widgetId = this.props.grecaptcha.render(wrapper, {
        sitekey: this.props.sitekey,
        callback: this.handleChange,
        theme: this.props.theme,
        type: this.props.type,
        tabindex: this.props.tabindex,
        "expired-callback": this.handleExpired,
        "error-callback": this.handleErrored,
        size: this.props.size,
        stoken: this.props.stoken,
        hl: this.props.hl,
        badge: this.props.badge
      });
      this.captcha.appendChild(wrapper);
    }
    if (this._executeRequested && this.props.grecaptcha && this._widgetId !== void 0) {
      this._executeRequested = false;
      this.execute();
    }
  };
  _proto.componentDidMount = function componentDidMount() {
    this.explicitRender();
  };
  _proto.componentDidUpdate = function componentDidUpdate() {
    this.explicitRender();
  };
  _proto.componentWillUnmount = function componentWillUnmount() {
    if (this._widgetId !== void 0) {
      this.delayOfCaptchaIframeRemoving();
      this.reset();
    }
  };
  _proto.delayOfCaptchaIframeRemoving = function delayOfCaptchaIframeRemoving() {
    var temporaryNode = document.createElement("div");
    document.body.appendChild(temporaryNode);
    temporaryNode.style.display = "none";
    while (this.captcha.firstChild) {
      temporaryNode.appendChild(this.captcha.firstChild);
    }
    setTimeout(function() {
      document.body.removeChild(temporaryNode);
    }, 5e3);
  };
  _proto.handleRecaptchaRef = function handleRecaptchaRef(elem) {
    this.captcha = elem;
  };
  _proto.render = function render() {
    var _this$props = this.props;
    _this$props.sitekey;
    _this$props.onChange;
    _this$props.theme;
    _this$props.type;
    _this$props.tabindex;
    _this$props.onExpired;
    _this$props.onErrored;
    _this$props.size;
    _this$props.stoken;
    _this$props.grecaptcha;
    _this$props.badge;
    _this$props.hl;
    var childProps = _objectWithoutPropertiesLoose$1(_this$props, ["sitekey", "onChange", "theme", "type", "tabindex", "onExpired", "onErrored", "size", "stoken", "grecaptcha", "badge", "hl"]);
    return React.createElement("div", _extends$1({}, childProps, {
      ref: this.handleRecaptchaRef
    }));
  };
  return ReCAPTCHA2;
}(React.Component);
ReCAPTCHA.displayName = "ReCAPTCHA";
ReCAPTCHA.propTypes = {
  sitekey: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  grecaptcha: PropTypes.object,
  theme: PropTypes.oneOf(["dark", "light"]),
  type: PropTypes.oneOf(["image", "audio"]),
  tabindex: PropTypes.number,
  onExpired: PropTypes.func,
  onErrored: PropTypes.func,
  size: PropTypes.oneOf(["compact", "normal", "invisible"]),
  stoken: PropTypes.string,
  hl: PropTypes.string,
  badge: PropTypes.oneOf(["bottomright", "bottomleft", "inline"])
};
ReCAPTCHA.defaultProps = {
  onChange: function onChange() {
  },
  theme: "light",
  type: "image",
  tabindex: 0,
  size: "normal",
  badge: "bottomright"
};
var reactIs$1 = { exports: {} };
var reactIs_production_min = {};
/** @license React v16.13.1
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var b = "function" === typeof Symbol && Symbol.for, c = b ? Symbol.for("react.element") : 60103, d = b ? Symbol.for("react.portal") : 60106, e = b ? Symbol.for("react.fragment") : 60107, f = b ? Symbol.for("react.strict_mode") : 60108, g = b ? Symbol.for("react.profiler") : 60114, h = b ? Symbol.for("react.provider") : 60109, k = b ? Symbol.for("react.context") : 60110, l = b ? Symbol.for("react.async_mode") : 60111, m = b ? Symbol.for("react.concurrent_mode") : 60111, n = b ? Symbol.for("react.forward_ref") : 60112, p = b ? Symbol.for("react.suspense") : 60113, q = b ? Symbol.for("react.suspense_list") : 60120, r = b ? Symbol.for("react.memo") : 60115, t = b ? Symbol.for("react.lazy") : 60116, v = b ? Symbol.for("react.block") : 60121, w = b ? Symbol.for("react.fundamental") : 60117, x = b ? Symbol.for("react.responder") : 60118, y = b ? Symbol.for("react.scope") : 60119;
function z(a) {
  if ("object" === typeof a && null !== a) {
    var u = a.$$typeof;
    switch (u) {
      case c:
        switch (a = a.type, a) {
          case l:
          case m:
          case e:
          case g:
          case f:
          case p:
            return a;
          default:
            switch (a = a && a.$$typeof, a) {
              case k:
              case n:
              case t:
              case r:
              case h:
                return a;
              default:
                return u;
            }
        }
      case d:
        return u;
    }
  }
}
function A(a) {
  return z(a) === m;
}
reactIs_production_min.AsyncMode = l;
reactIs_production_min.ConcurrentMode = m;
reactIs_production_min.ContextConsumer = k;
reactIs_production_min.ContextProvider = h;
reactIs_production_min.Element = c;
reactIs_production_min.ForwardRef = n;
reactIs_production_min.Fragment = e;
reactIs_production_min.Lazy = t;
reactIs_production_min.Memo = r;
reactIs_production_min.Portal = d;
reactIs_production_min.Profiler = g;
reactIs_production_min.StrictMode = f;
reactIs_production_min.Suspense = p;
reactIs_production_min.isAsyncMode = function(a) {
  return A(a) || z(a) === l;
};
reactIs_production_min.isConcurrentMode = A;
reactIs_production_min.isContextConsumer = function(a) {
  return z(a) === k;
};
reactIs_production_min.isContextProvider = function(a) {
  return z(a) === h;
};
reactIs_production_min.isElement = function(a) {
  return "object" === typeof a && null !== a && a.$$typeof === c;
};
reactIs_production_min.isForwardRef = function(a) {
  return z(a) === n;
};
reactIs_production_min.isFragment = function(a) {
  return z(a) === e;
};
reactIs_production_min.isLazy = function(a) {
  return z(a) === t;
};
reactIs_production_min.isMemo = function(a) {
  return z(a) === r;
};
reactIs_production_min.isPortal = function(a) {
  return z(a) === d;
};
reactIs_production_min.isProfiler = function(a) {
  return z(a) === g;
};
reactIs_production_min.isStrictMode = function(a) {
  return z(a) === f;
};
reactIs_production_min.isSuspense = function(a) {
  return z(a) === p;
};
reactIs_production_min.isValidElementType = function(a) {
  return "string" === typeof a || "function" === typeof a || a === e || a === m || a === g || a === f || a === p || a === q || "object" === typeof a && null !== a && (a.$$typeof === t || a.$$typeof === r || a.$$typeof === h || a.$$typeof === k || a.$$typeof === n || a.$$typeof === w || a.$$typeof === x || a.$$typeof === y || a.$$typeof === v);
};
reactIs_production_min.typeOf = z;
{
  reactIs$1.exports = reactIs_production_min;
}
var reactIs = reactIs$1.exports;
var REACT_STATICS = {
  childContextTypes: true,
  contextType: true,
  contextTypes: true,
  defaultProps: true,
  displayName: true,
  getDefaultProps: true,
  getDerivedStateFromError: true,
  getDerivedStateFromProps: true,
  mixins: true,
  propTypes: true,
  type: true
};
var KNOWN_STATICS = {
  name: true,
  length: true,
  prototype: true,
  caller: true,
  callee: true,
  arguments: true,
  arity: true
};
var FORWARD_REF_STATICS = {
  "$$typeof": true,
  render: true,
  defaultProps: true,
  displayName: true,
  propTypes: true
};
var MEMO_STATICS = {
  "$$typeof": true,
  compare: true,
  defaultProps: true,
  displayName: true,
  propTypes: true,
  type: true
};
var TYPE_STATICS = {};
TYPE_STATICS[reactIs.ForwardRef] = FORWARD_REF_STATICS;
TYPE_STATICS[reactIs.Memo] = MEMO_STATICS;
function getStatics(component) {
  if (reactIs.isMemo(component)) {
    return MEMO_STATICS;
  }
  return TYPE_STATICS[component["$$typeof"]] || REACT_STATICS;
}
var defineProperty = Object.defineProperty;
var getOwnPropertyNames = Object.getOwnPropertyNames;
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var getPrototypeOf = Object.getPrototypeOf;
var objectPrototype = Object.prototype;
function hoistNonReactStatics(targetComponent, sourceComponent, blacklist) {
  if (typeof sourceComponent !== "string") {
    if (objectPrototype) {
      var inheritedComponent = getPrototypeOf(sourceComponent);
      if (inheritedComponent && inheritedComponent !== objectPrototype) {
        hoistNonReactStatics(targetComponent, inheritedComponent, blacklist);
      }
    }
    var keys = getOwnPropertyNames(sourceComponent);
    if (getOwnPropertySymbols) {
      keys = keys.concat(getOwnPropertySymbols(sourceComponent));
    }
    var targetStatics = getStatics(targetComponent);
    var sourceStatics = getStatics(sourceComponent);
    for (var i = 0; i < keys.length; ++i) {
      var key2 = keys[i];
      if (!KNOWN_STATICS[key2] && !(blacklist && blacklist[key2]) && !(sourceStatics && sourceStatics[key2]) && !(targetStatics && targetStatics[key2])) {
        var descriptor = getOwnPropertyDescriptor(sourceComponent, key2);
        try {
          defineProperty(targetComponent, key2, descriptor);
        } catch (e2) {
        }
      }
    }
  }
  return targetComponent;
}
var hoistNonReactStatics_cjs = hoistNonReactStatics;
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source2 = arguments[i];
      for (var key2 in source2) {
        if (Object.prototype.hasOwnProperty.call(source2, key2)) {
          target[key2] = source2[key2];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _objectWithoutPropertiesLoose(source2, excluded) {
  if (source2 == null)
    return {};
  var target = {};
  var sourceKeys = Object.keys(source2);
  var key2, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key2 = sourceKeys[i];
    if (excluded.indexOf(key2) >= 0)
      continue;
    target[key2] = source2[key2];
  }
  return target;
}
function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}
var SCRIPT_MAP = {};
var idCount = 0;
function makeAsyncScript(getScriptURL, options) {
  options = options || {};
  return function wrapWithAsyncScript(WrappedComponent) {
    var wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || "Component";
    var AsyncScriptLoader = /* @__PURE__ */ function(_Component) {
      _inheritsLoose(AsyncScriptLoader2, _Component);
      function AsyncScriptLoader2(props, context) {
        var _this;
        _this = _Component.call(this, props, context) || this;
        _this.state = {};
        _this.__scriptURL = "";
        return _this;
      }
      var _proto = AsyncScriptLoader2.prototype;
      _proto.asyncScriptLoaderGetScriptLoaderID = function asyncScriptLoaderGetScriptLoaderID() {
        if (!this.__scriptLoaderID) {
          this.__scriptLoaderID = "async-script-loader-" + idCount++;
        }
        return this.__scriptLoaderID;
      };
      _proto.setupScriptURL = function setupScriptURL() {
        this.__scriptURL = typeof getScriptURL === "function" ? getScriptURL() : getScriptURL;
        return this.__scriptURL;
      };
      _proto.asyncScriptLoaderHandleLoad = function asyncScriptLoaderHandleLoad(state) {
        var _this2 = this;
        this.setState(state, function() {
          return _this2.props.asyncScriptOnLoad && _this2.props.asyncScriptOnLoad(_this2.state);
        });
      };
      _proto.asyncScriptLoaderTriggerOnScriptLoaded = function asyncScriptLoaderTriggerOnScriptLoaded() {
        var mapEntry = SCRIPT_MAP[this.__scriptURL];
        if (!mapEntry || !mapEntry.loaded) {
          throw new Error("Script is not loaded.");
        }
        for (var obsKey in mapEntry.observers) {
          mapEntry.observers[obsKey](mapEntry);
        }
        delete window[options.callbackName];
      };
      _proto.componentDidMount = function componentDidMount() {
        var _this3 = this;
        var scriptURL = this.setupScriptURL();
        var key2 = this.asyncScriptLoaderGetScriptLoaderID();
        var _options = options, globalName2 = _options.globalName, callbackName2 = _options.callbackName, scriptId = _options.scriptId;
        if (globalName2 && typeof window[globalName2] !== "undefined") {
          SCRIPT_MAP[scriptURL] = {
            loaded: true,
            observers: {}
          };
        }
        if (SCRIPT_MAP[scriptURL]) {
          var entry = SCRIPT_MAP[scriptURL];
          if (entry && (entry.loaded || entry.errored)) {
            this.asyncScriptLoaderHandleLoad(entry);
            return;
          }
          entry.observers[key2] = function(entry2) {
            return _this3.asyncScriptLoaderHandleLoad(entry2);
          };
          return;
        }
        var observers = {};
        observers[key2] = function(entry2) {
          return _this3.asyncScriptLoaderHandleLoad(entry2);
        };
        SCRIPT_MAP[scriptURL] = {
          loaded: false,
          observers
        };
        var script = document.createElement("script");
        script.src = scriptURL;
        script.async = true;
        for (var attribute in options.attributes) {
          script.setAttribute(attribute, options.attributes[attribute]);
        }
        if (scriptId) {
          script.id = scriptId;
        }
        var callObserverFuncAndRemoveObserver = function callObserverFuncAndRemoveObserver2(func) {
          if (SCRIPT_MAP[scriptURL]) {
            var mapEntry = SCRIPT_MAP[scriptURL];
            var observersMap = mapEntry.observers;
            for (var obsKey in observersMap) {
              if (func(observersMap[obsKey])) {
                delete observersMap[obsKey];
              }
            }
          }
        };
        if (callbackName2 && typeof window !== "undefined") {
          window[callbackName2] = function() {
            return _this3.asyncScriptLoaderTriggerOnScriptLoaded();
          };
        }
        script.onload = function() {
          var mapEntry = SCRIPT_MAP[scriptURL];
          if (mapEntry) {
            mapEntry.loaded = true;
            callObserverFuncAndRemoveObserver(function(observer) {
              if (callbackName2) {
                return false;
              }
              observer(mapEntry);
              return true;
            });
          }
        };
        script.onerror = function() {
          var mapEntry = SCRIPT_MAP[scriptURL];
          if (mapEntry) {
            mapEntry.errored = true;
            callObserverFuncAndRemoveObserver(function(observer) {
              observer(mapEntry);
              return true;
            });
          }
        };
        document.body.appendChild(script);
      };
      _proto.componentWillUnmount = function componentWillUnmount() {
        var scriptURL = this.__scriptURL;
        if (options.removeOnUnmount === true) {
          var allScripts = document.getElementsByTagName("script");
          for (var i = 0; i < allScripts.length; i += 1) {
            if (allScripts[i].src.indexOf(scriptURL) > -1) {
              if (allScripts[i].parentNode) {
                allScripts[i].parentNode.removeChild(allScripts[i]);
              }
            }
          }
        }
        var mapEntry = SCRIPT_MAP[scriptURL];
        if (mapEntry) {
          delete mapEntry.observers[this.asyncScriptLoaderGetScriptLoaderID()];
          if (options.removeOnUnmount === true) {
            delete SCRIPT_MAP[scriptURL];
          }
        }
      };
      _proto.render = function render() {
        var globalName2 = options.globalName;
        var _this$props = this.props;
        _this$props.asyncScriptOnLoad;
        var forwardedRef = _this$props.forwardedRef, childProps = _objectWithoutPropertiesLoose(_this$props, ["asyncScriptOnLoad", "forwardedRef"]);
        if (globalName2 && typeof window !== "undefined") {
          childProps[globalName2] = typeof window[globalName2] !== "undefined" ? window[globalName2] : void 0;
        }
        childProps.ref = forwardedRef;
        return react.exports.createElement(WrappedComponent, childProps);
      };
      return AsyncScriptLoader2;
    }(react.exports.Component);
    var ForwardedComponent = react.exports.forwardRef(function(props, ref) {
      return react.exports.createElement(AsyncScriptLoader, _extends({}, props, {
        forwardedRef: ref
      }));
    });
    ForwardedComponent.displayName = "AsyncScriptLoader(" + wrappedComponentName + ")";
    ForwardedComponent.propTypes = {
      asyncScriptOnLoad: PropTypes.func
    };
    return hoistNonReactStatics_cjs(ForwardedComponent, WrappedComponent);
  };
}
var callbackName = "onloadcallback";
var globalName = "grecaptcha";
function getOptions() {
  return typeof window !== "undefined" && window.recaptchaOptions || {};
}
function getURL() {
  var dynamicOptions = getOptions();
  var hostname = dynamicOptions.useRecaptchaNet ? "recaptcha.net" : "www.google.com";
  return "https://" + hostname + "/recaptcha/api.js?onload=" + callbackName + "&render=explicit";
}
var RecaptchaWrapper = makeAsyncScript(getURL, {
  callbackName,
  globalName
})(ReCAPTCHA);
var axios$2 = { exports: {} };
var bind$2 = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};
var bind$1 = bind$2;
var toString = Object.prototype.toString;
function isArray(val) {
  return Array.isArray(val);
}
function isUndefined(val) {
  return typeof val === "undefined";
}
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && typeof val.constructor.isBuffer === "function" && val.constructor.isBuffer(val);
}
function isArrayBuffer(val) {
  return toString.call(val) === "[object ArrayBuffer]";
}
function isFormData(val) {
  return toString.call(val) === "[object FormData]";
}
function isArrayBufferView(val) {
  var result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
function isString(val) {
  return typeof val === "string";
}
function isNumber(val) {
  return typeof val === "number";
}
function isObject(val) {
  return val !== null && typeof val === "object";
}
function isPlainObject(val) {
  if (toString.call(val) !== "[object Object]") {
    return false;
  }
  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}
function isDate(val) {
  return toString.call(val) === "[object Date]";
}
function isFile(val) {
  return toString.call(val) === "[object File]";
}
function isBlob(val) {
  return toString.call(val) === "[object Blob]";
}
function isFunction(val) {
  return toString.call(val) === "[object Function]";
}
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}
function isURLSearchParams(val) {
  return toString.call(val) === "[object URLSearchParams]";
}
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
}
function isStandardBrowserEnv() {
  if (typeof navigator !== "undefined" && (navigator.product === "ReactNative" || navigator.product === "NativeScript" || navigator.product === "NS")) {
    return false;
  }
  return typeof window !== "undefined" && typeof document !== "undefined";
}
function forEach(obj, fn) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (var i = 0, l2 = obj.length; i < l2; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    for (var key2 in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key2)) {
        fn.call(null, obj[key2], key2, obj);
      }
    }
  }
}
function merge() {
  var result = {};
  function assignValue(val, key2) {
    if (isPlainObject(result[key2]) && isPlainObject(val)) {
      result[key2] = merge(result[key2], val);
    } else if (isPlainObject(val)) {
      result[key2] = merge({}, val);
    } else if (isArray(val)) {
      result[key2] = val.slice();
    } else {
      result[key2] = val;
    }
  }
  for (var i = 0, l2 = arguments.length; i < l2; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}
function extend$1(a, b2, thisArg) {
  forEach(b2, function assignValue(val, key2) {
    if (thisArg && typeof val === "function") {
      a[key2] = bind$1(val, thisArg);
    } else {
      a[key2] = val;
    }
  });
  return a;
}
function stripBOM(content) {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
}
var utils$e = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isObject,
  isPlainObject,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isFunction,
  isStream,
  isURLSearchParams,
  isStandardBrowserEnv,
  forEach,
  merge,
  extend: extend$1,
  trim,
  stripBOM
};
var utils$d = utils$e;
function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
}
var buildURL$2 = function buildURL(url2, params, paramsSerializer) {
  if (!params) {
    return url2;
  }
  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils$d.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];
    utils$d.forEach(params, function serialize(val, key2) {
      if (val === null || typeof val === "undefined") {
        return;
      }
      if (utils$d.isArray(val)) {
        key2 = key2 + "[]";
      } else {
        val = [val];
      }
      utils$d.forEach(val, function parseValue(v2) {
        if (utils$d.isDate(v2)) {
          v2 = v2.toISOString();
        } else if (utils$d.isObject(v2)) {
          v2 = JSON.stringify(v2);
        }
        parts.push(encode(key2) + "=" + encode(v2));
      });
    });
    serializedParams = parts.join("&");
  }
  if (serializedParams) {
    var hashmarkIndex = url2.indexOf("#");
    if (hashmarkIndex !== -1) {
      url2 = url2.slice(0, hashmarkIndex);
    }
    url2 += (url2.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url2;
};
var utils$c = utils$e;
function InterceptorManager$1() {
  this.handlers = [];
}
InterceptorManager$1.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled,
    rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};
InterceptorManager$1.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};
InterceptorManager$1.prototype.forEach = function forEach2(fn) {
  utils$c.forEach(this.handlers, function forEachHandler(h2) {
    if (h2 !== null) {
      fn(h2);
    }
  });
};
var InterceptorManager_1 = InterceptorManager$1;
var utils$b = utils$e;
var normalizeHeaderName$1 = function normalizeHeaderName(headers, normalizedName) {
  utils$b.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};
var enhanceError$2 = function enhanceError(error, config2, code, request2, response) {
  error.config = config2;
  if (code) {
    error.code = code;
  }
  error.request = request2;
  error.response = response;
  error.isAxiosError = true;
  error.toJSON = function toJSON() {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  };
  return error;
};
var transitional = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};
var enhanceError$1 = enhanceError$2;
var createError$2 = function createError(message, config2, code, request2, response) {
  var error = new Error(message);
  return enhanceError$1(error, config2, code, request2, response);
};
var createError$1 = createError$2;
var settle$1 = function settle(resolve, reject, response) {
  var validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(createError$1("Request failed with status code " + response.status, response.config, null, response.request, response));
  }
};
var utils$a = utils$e;
var cookies$1 = utils$a.isStandardBrowserEnv() ? function standardBrowserEnv() {
  return {
    write: function write(name, value, expires, path, domain, secure) {
      var cookie = [];
      cookie.push(name + "=" + encodeURIComponent(value));
      if (utils$a.isNumber(expires)) {
        cookie.push("expires=" + new Date(expires).toGMTString());
      }
      if (utils$a.isString(path)) {
        cookie.push("path=" + path);
      }
      if (utils$a.isString(domain)) {
        cookie.push("domain=" + domain);
      }
      if (secure === true) {
        cookie.push("secure");
      }
      document.cookie = cookie.join("; ");
    },
    read: function read(name) {
      var match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
      return match ? decodeURIComponent(match[3]) : null;
    },
    remove: function remove(name) {
      this.write(name, "", Date.now() - 864e5);
    }
  };
}() : function nonStandardBrowserEnv() {
  return {
    write: function write() {
    },
    read: function read() {
      return null;
    },
    remove: function remove() {
    }
  };
}();
var isAbsoluteURL$1 = function isAbsoluteURL(url2) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
};
var combineURLs$1 = function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
};
var isAbsoluteURL2 = isAbsoluteURL$1;
var combineURLs2 = combineURLs$1;
var buildFullPath$1 = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL2(requestedURL)) {
    return combineURLs2(baseURL, requestedURL);
  }
  return requestedURL;
};
var utils$9 = utils$e;
var ignoreDuplicateOf = [
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
];
var parseHeaders$1 = function parseHeaders(headers) {
  var parsed = {};
  var key2;
  var val;
  var i;
  if (!headers) {
    return parsed;
  }
  utils$9.forEach(headers.split("\n"), function parser(line) {
    i = line.indexOf(":");
    key2 = utils$9.trim(line.substr(0, i)).toLowerCase();
    val = utils$9.trim(line.substr(i + 1));
    if (key2) {
      if (parsed[key2] && ignoreDuplicateOf.indexOf(key2) >= 0) {
        return;
      }
      if (key2 === "set-cookie") {
        parsed[key2] = (parsed[key2] ? parsed[key2] : []).concat([val]);
      } else {
        parsed[key2] = parsed[key2] ? parsed[key2] + ", " + val : val;
      }
    }
  });
  return parsed;
};
var utils$8 = utils$e;
var isURLSameOrigin$1 = utils$8.isStandardBrowserEnv() ? function standardBrowserEnv2() {
  var msie = /(msie|trident)/i.test(navigator.userAgent);
  var urlParsingNode = document.createElement("a");
  var originURL;
  function resolveURL(url2) {
    var href = url2;
    if (msie) {
      urlParsingNode.setAttribute("href", href);
      href = urlParsingNode.href;
    }
    urlParsingNode.setAttribute("href", href);
    return {
      href: urlParsingNode.href,
      protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, "") : "",
      host: urlParsingNode.host,
      search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, "") : "",
      hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, "") : "",
      hostname: urlParsingNode.hostname,
      port: urlParsingNode.port,
      pathname: urlParsingNode.pathname.charAt(0) === "/" ? urlParsingNode.pathname : "/" + urlParsingNode.pathname
    };
  }
  originURL = resolveURL(window.location.href);
  return function isURLSameOrigin2(requestURL) {
    var parsed = utils$8.isString(requestURL) ? resolveURL(requestURL) : requestURL;
    return parsed.protocol === originURL.protocol && parsed.host === originURL.host;
  };
}() : function nonStandardBrowserEnv2() {
  return function isURLSameOrigin2() {
    return true;
  };
}();
function Cancel$3(message) {
  this.message = message;
}
Cancel$3.prototype.toString = function toString2() {
  return "Cancel" + (this.message ? ": " + this.message : "");
};
Cancel$3.prototype.__CANCEL__ = true;
var Cancel_1 = Cancel$3;
var utils$7 = utils$e;
var settle2 = settle$1;
var cookies = cookies$1;
var buildURL$1 = buildURL$2;
var buildFullPath2 = buildFullPath$1;
var parseHeaders2 = parseHeaders$1;
var isURLSameOrigin = isURLSameOrigin$1;
var createError2 = createError$2;
var transitionalDefaults$1 = transitional;
var Cancel$2 = Cancel_1;
var xhr = function xhrAdapter(config2) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config2.data;
    var requestHeaders = config2.headers;
    var responseType = config2.responseType;
    var onCanceled;
    function done() {
      if (config2.cancelToken) {
        config2.cancelToken.unsubscribe(onCanceled);
      }
      if (config2.signal) {
        config2.signal.removeEventListener("abort", onCanceled);
      }
    }
    if (utils$7.isFormData(requestData)) {
      delete requestHeaders["Content-Type"];
    }
    var request2 = new XMLHttpRequest();
    if (config2.auth) {
      var username = config2.auth.username || "";
      var password = config2.auth.password ? unescape(encodeURIComponent(config2.auth.password)) : "";
      requestHeaders.Authorization = "Basic " + btoa(username + ":" + password);
    }
    var fullPath = buildFullPath2(config2.baseURL, config2.url);
    request2.open(config2.method.toUpperCase(), buildURL$1(fullPath, config2.params, config2.paramsSerializer), true);
    request2.timeout = config2.timeout;
    function onloadend() {
      if (!request2) {
        return;
      }
      var responseHeaders = "getAllResponseHeaders" in request2 ? parseHeaders2(request2.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === "text" || responseType === "json" ? request2.responseText : request2.response;
      var response = {
        data: responseData,
        status: request2.status,
        statusText: request2.statusText,
        headers: responseHeaders,
        config: config2,
        request: request2
      };
      settle2(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);
      request2 = null;
    }
    if ("onloadend" in request2) {
      request2.onloadend = onloadend;
    } else {
      request2.onreadystatechange = function handleLoad() {
        if (!request2 || request2.readyState !== 4) {
          return;
        }
        if (request2.status === 0 && !(request2.responseURL && request2.responseURL.indexOf("file:") === 0)) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request2.onabort = function handleAbort() {
      if (!request2) {
        return;
      }
      reject(createError2("Request aborted", config2, "ECONNABORTED", request2));
      request2 = null;
    };
    request2.onerror = function handleError() {
      reject(createError2("Network Error", config2, null, request2));
      request2 = null;
    };
    request2.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = config2.timeout ? "timeout of " + config2.timeout + "ms exceeded" : "timeout exceeded";
      var transitional3 = config2.transitional || transitionalDefaults$1;
      if (config2.timeoutErrorMessage) {
        timeoutErrorMessage = config2.timeoutErrorMessage;
      }
      reject(createError2(timeoutErrorMessage, config2, transitional3.clarifyTimeoutError ? "ETIMEDOUT" : "ECONNABORTED", request2));
      request2 = null;
    };
    if (utils$7.isStandardBrowserEnv()) {
      var xsrfValue = (config2.withCredentials || isURLSameOrigin(fullPath)) && config2.xsrfCookieName ? cookies.read(config2.xsrfCookieName) : void 0;
      if (xsrfValue) {
        requestHeaders[config2.xsrfHeaderName] = xsrfValue;
      }
    }
    if ("setRequestHeader" in request2) {
      utils$7.forEach(requestHeaders, function setRequestHeader(val, key2) {
        if (typeof requestData === "undefined" && key2.toLowerCase() === "content-type") {
          delete requestHeaders[key2];
        } else {
          request2.setRequestHeader(key2, val);
        }
      });
    }
    if (!utils$7.isUndefined(config2.withCredentials)) {
      request2.withCredentials = !!config2.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request2.responseType = config2.responseType;
    }
    if (typeof config2.onDownloadProgress === "function") {
      request2.addEventListener("progress", config2.onDownloadProgress);
    }
    if (typeof config2.onUploadProgress === "function" && request2.upload) {
      request2.upload.addEventListener("progress", config2.onUploadProgress);
    }
    if (config2.cancelToken || config2.signal) {
      onCanceled = function(cancel) {
        if (!request2) {
          return;
        }
        reject(!cancel || cancel && cancel.type ? new Cancel$2("canceled") : cancel);
        request2.abort();
        request2 = null;
      };
      config2.cancelToken && config2.cancelToken.subscribe(onCanceled);
      if (config2.signal) {
        config2.signal.aborted ? onCanceled() : config2.signal.addEventListener("abort", onCanceled);
      }
    }
    if (!requestData) {
      requestData = null;
    }
    request2.send(requestData);
  });
};
var utils$6 = utils$e;
var normalizeHeaderName2 = normalizeHeaderName$1;
var enhanceError2 = enhanceError$2;
var transitionalDefaults = transitional;
var DEFAULT_CONTENT_TYPE = {
  "Content-Type": "application/x-www-form-urlencoded"
};
function setContentTypeIfUnset(headers, value) {
  if (!utils$6.isUndefined(headers) && utils$6.isUndefined(headers["Content-Type"])) {
    headers["Content-Type"] = value;
  }
}
function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== "undefined") {
    adapter = xhr;
  } else if (typeof process !== "undefined" && Object.prototype.toString.call(process) === "[object process]") {
    adapter = xhr;
  }
  return adapter;
}
function stringifySafely(rawValue, parser, encoder) {
  if (utils$6.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$6.trim(rawValue);
    } catch (e2) {
      if (e2.name !== "SyntaxError") {
        throw e2;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
var defaults$3 = {
  transitional: transitionalDefaults,
  adapter: getDefaultAdapter(),
  transformRequest: [function transformRequest(data2, headers) {
    normalizeHeaderName2(headers, "Accept");
    normalizeHeaderName2(headers, "Content-Type");
    if (utils$6.isFormData(data2) || utils$6.isArrayBuffer(data2) || utils$6.isBuffer(data2) || utils$6.isStream(data2) || utils$6.isFile(data2) || utils$6.isBlob(data2)) {
      return data2;
    }
    if (utils$6.isArrayBufferView(data2)) {
      return data2.buffer;
    }
    if (utils$6.isURLSearchParams(data2)) {
      setContentTypeIfUnset(headers, "application/x-www-form-urlencoded;charset=utf-8");
      return data2.toString();
    }
    if (utils$6.isObject(data2) || headers && headers["Content-Type"] === "application/json") {
      setContentTypeIfUnset(headers, "application/json");
      return stringifySafely(data2);
    }
    return data2;
  }],
  transformResponse: [function transformResponse(data2) {
    var transitional3 = this.transitional || defaults$3.transitional;
    var silentJSONParsing = transitional3 && transitional3.silentJSONParsing;
    var forcedJSONParsing = transitional3 && transitional3.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === "json";
    if (strictJSONParsing || forcedJSONParsing && utils$6.isString(data2) && data2.length) {
      try {
        return JSON.parse(data2);
      } catch (e2) {
        if (strictJSONParsing) {
          if (e2.name === "SyntaxError") {
            throw enhanceError2(e2, this, "E_JSON_PARSE");
          }
          throw e2;
        }
      }
    }
    return data2;
  }],
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      "Accept": "application/json, text/plain, */*"
    }
  }
};
utils$6.forEach(["delete", "get", "head"], function forEachMethodNoData(method) {
  defaults$3.headers[method] = {};
});
utils$6.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
  defaults$3.headers[method] = utils$6.merge(DEFAULT_CONTENT_TYPE);
});
var defaults_1 = defaults$3;
var utils$5 = utils$e;
var defaults$2 = defaults_1;
var transformData$1 = function transformData(data2, headers, fns) {
  var context = this || defaults$2;
  utils$5.forEach(fns, function transform(fn) {
    data2 = fn.call(context, data2, headers);
  });
  return data2;
};
var isCancel$1 = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};
var utils$4 = utils$e;
var transformData2 = transformData$1;
var isCancel2 = isCancel$1;
var defaults$1 = defaults_1;
var Cancel$1 = Cancel_1;
function throwIfCancellationRequested(config2) {
  if (config2.cancelToken) {
    config2.cancelToken.throwIfRequested();
  }
  if (config2.signal && config2.signal.aborted) {
    throw new Cancel$1("canceled");
  }
}
var dispatchRequest$1 = function dispatchRequest(config2) {
  throwIfCancellationRequested(config2);
  config2.headers = config2.headers || {};
  config2.data = transformData2.call(config2, config2.data, config2.headers, config2.transformRequest);
  config2.headers = utils$4.merge(config2.headers.common || {}, config2.headers[config2.method] || {}, config2.headers);
  utils$4.forEach(["delete", "get", "head", "post", "put", "patch", "common"], function cleanHeaderConfig(method) {
    delete config2.headers[method];
  });
  var adapter = config2.adapter || defaults$1.adapter;
  return adapter(config2).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config2);
    response.data = transformData2.call(config2, response.data, response.headers, config2.transformResponse);
    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel2(reason)) {
      throwIfCancellationRequested(config2);
      if (reason && reason.response) {
        reason.response.data = transformData2.call(config2, reason.response.data, reason.response.headers, config2.transformResponse);
      }
    }
    return Promise.reject(reason);
  });
};
var utils$3 = utils$e;
var mergeConfig$2 = function mergeConfig(config1, config2) {
  config2 = config2 || {};
  var config3 = {};
  function getMergedValue(target, source2) {
    if (utils$3.isPlainObject(target) && utils$3.isPlainObject(source2)) {
      return utils$3.merge(target, source2);
    } else if (utils$3.isPlainObject(source2)) {
      return utils$3.merge({}, source2);
    } else if (utils$3.isArray(source2)) {
      return source2.slice();
    }
    return source2;
  }
  function mergeDeepProperties(prop) {
    if (!utils$3.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils$3.isUndefined(config1[prop])) {
      return getMergedValue(void 0, config1[prop]);
    }
  }
  function valueFromConfig2(prop) {
    if (!utils$3.isUndefined(config2[prop])) {
      return getMergedValue(void 0, config2[prop]);
    }
  }
  function defaultToConfig2(prop) {
    if (!utils$3.isUndefined(config2[prop])) {
      return getMergedValue(void 0, config2[prop]);
    } else if (!utils$3.isUndefined(config1[prop])) {
      return getMergedValue(void 0, config1[prop]);
    }
  }
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(void 0, config1[prop]);
    }
  }
  var mergeMap = {
    "url": valueFromConfig2,
    "method": valueFromConfig2,
    "data": valueFromConfig2,
    "baseURL": defaultToConfig2,
    "transformRequest": defaultToConfig2,
    "transformResponse": defaultToConfig2,
    "paramsSerializer": defaultToConfig2,
    "timeout": defaultToConfig2,
    "timeoutMessage": defaultToConfig2,
    "withCredentials": defaultToConfig2,
    "adapter": defaultToConfig2,
    "responseType": defaultToConfig2,
    "xsrfCookieName": defaultToConfig2,
    "xsrfHeaderName": defaultToConfig2,
    "onUploadProgress": defaultToConfig2,
    "onDownloadProgress": defaultToConfig2,
    "decompress": defaultToConfig2,
    "maxContentLength": defaultToConfig2,
    "maxBodyLength": defaultToConfig2,
    "transport": defaultToConfig2,
    "httpAgent": defaultToConfig2,
    "httpsAgent": defaultToConfig2,
    "cancelToken": defaultToConfig2,
    "socketPath": defaultToConfig2,
    "responseEncoding": defaultToConfig2,
    "validateStatus": mergeDirectKeys
  };
  utils$3.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge2 = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge2(prop);
    utils$3.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config3[prop] = configValue);
  });
  return config3;
};
var data = {
  "version": "0.26.1"
};
var VERSION = data.version;
var validators$1 = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach(function(type, i) {
  validators$1[type] = function validator2(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
var deprecatedWarnings = {};
validators$1.transitional = function transitional2(validator2, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return function(value, opt, opts) {
    if (validator2 === false) {
      throw new Error(formatMessage(opt, " has been removed" + (version ? " in " + version : "")));
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(formatMessage(opt, " has been deprecated since v" + version + " and will be removed in the near future"));
    }
    return validator2 ? validator2(value, opt, opts) : true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new TypeError("options must be an object");
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator2 = schema[opt];
    if (validator2) {
      var value = options[opt];
      var result = value === void 0 || validator2(value, opt, options);
      if (result !== true) {
        throw new TypeError("option " + opt + " must be " + result);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw Error("Unknown option " + opt);
    }
  }
}
var validator$1 = {
  assertOptions,
  validators: validators$1
};
var utils$2 = utils$e;
var buildURL2 = buildURL$2;
var InterceptorManager = InterceptorManager_1;
var dispatchRequest2 = dispatchRequest$1;
var mergeConfig$1 = mergeConfig$2;
var validator = validator$1;
var validators = validator.validators;
function Axios$1(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}
Axios$1.prototype.request = function request(configOrUrl, config2) {
  if (typeof configOrUrl === "string") {
    config2 = config2 || {};
    config2.url = configOrUrl;
  } else {
    config2 = configOrUrl || {};
  }
  config2 = mergeConfig$1(this.defaults, config2);
  if (config2.method) {
    config2.method = config2.method.toLowerCase();
  } else if (this.defaults.method) {
    config2.method = this.defaults.method.toLowerCase();
  } else {
    config2.method = "get";
  }
  var transitional3 = config2.transitional;
  if (transitional3 !== void 0) {
    validator.assertOptions(transitional3, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config2) === false) {
      return;
    }
    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });
  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });
  var promise;
  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest2, void 0];
    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);
    promise = Promise.resolve(config2);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }
    return promise;
  }
  var newConfig = config2;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }
  try {
    promise = dispatchRequest2(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }
  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }
  return promise;
};
Axios$1.prototype.getUri = function getUri(config2) {
  config2 = mergeConfig$1(this.defaults, config2);
  return buildURL2(config2.url, config2.params, config2.paramsSerializer).replace(/^\?/, "");
};
utils$2.forEach(["delete", "get", "head", "options"], function forEachMethodNoData2(method) {
  Axios$1.prototype[method] = function(url2, config2) {
    return this.request(mergeConfig$1(config2 || {}, {
      method,
      url: url2,
      data: (config2 || {}).data
    }));
  };
});
utils$2.forEach(["post", "put", "patch"], function forEachMethodWithData2(method) {
  Axios$1.prototype[method] = function(url2, data2, config2) {
    return this.request(mergeConfig$1(config2 || {}, {
      method,
      url: url2,
      data: data2
    }));
  };
});
var Axios_1 = Axios$1;
var Cancel = Cancel_1;
function CancelToken(executor) {
  if (typeof executor !== "function") {
    throw new TypeError("executor must be a function.");
  }
  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });
  var token = this;
  this.promise.then(function(cancel) {
    if (!token._listeners)
      return;
    var i;
    var l2 = token._listeners.length;
    for (i = 0; i < l2; i++) {
      token._listeners[i](cancel);
    }
    token._listeners = null;
  });
  this.promise.then = function(onfulfilled) {
    var _resolve;
    var promise = new Promise(function(resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);
    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };
    return promise;
  };
  executor(function cancel(message) {
    if (token.reason) {
      return;
    }
    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};
CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }
  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};
CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c2) {
    cancel = c2;
  });
  return {
    token,
    cancel
  };
};
var CancelToken_1 = CancelToken;
var spread = function spread2(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};
var utils$1 = utils$e;
var isAxiosError = function isAxiosError2(payload) {
  return utils$1.isObject(payload) && payload.isAxiosError === true;
};
var utils = utils$e;
var bind2 = bind$2;
var Axios = Axios_1;
var mergeConfig2 = mergeConfig$2;
var defaults = defaults_1;
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind2(Axios.prototype.request, context);
  utils.extend(instance, Axios.prototype, context);
  utils.extend(instance, context);
  instance.create = function create2(instanceConfig) {
    return createInstance(mergeConfig2(defaultConfig, instanceConfig));
  };
  return instance;
}
var axios$1 = createInstance(defaults);
axios$1.Axios = Axios;
axios$1.Cancel = Cancel_1;
axios$1.CancelToken = CancelToken_1;
axios$1.isCancel = isCancel$1;
axios$1.VERSION = data.version;
axios$1.all = function all(promises) {
  return Promise.all(promises);
};
axios$1.spread = spread;
axios$1.isAxiosError = isAxiosError;
axios$2.exports = axios$1;
axios$2.exports.default = axios$1;
var axios = axios$2.exports;
let nanoid = (size = 21) => crypto.getRandomValues(new Uint8Array(size)).reduce((id, byte) => {
  byte &= 63;
  if (byte < 36) {
    id += byte.toString(36);
  } else if (byte < 62) {
    id += (byte - 26).toString(36).toUpperCase();
  } else if (byte > 62) {
    id += "-";
  } else {
    id += "_";
  }
  return id;
}, "");
let uniqueId = 0;
const CSS_NUMBER = /* @__PURE__ */ Object.create(null);
const CSS_NUMBER_KEYS = [
  "animation-iteration-count",
  "border-image-outset",
  "border-image-slice",
  "border-image-width",
  "box-flex",
  "box-flex-group",
  "box-ordinal-group",
  "column-count",
  "columns",
  "counter-increment",
  "counter-reset",
  "flex",
  "flex-grow",
  "flex-positive",
  "flex-shrink",
  "flex-negative",
  "flex-order",
  "font-weight",
  "grid-area",
  "grid-column",
  "grid-column-end",
  "grid-column-span",
  "grid-column-start",
  "grid-row",
  "grid-row-end",
  "grid-row-span",
  "grid-row-start",
  "line-clamp",
  "line-height",
  "opacity",
  "order",
  "orphans",
  "tab-size",
  "widows",
  "z-index",
  "zoom",
  "fill-opacity",
  "flood-opacity",
  "stop-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width"
];
for (const property of CSS_NUMBER_KEYS) {
  for (const prefix of ["-webkit-", "-ms-", "-moz-", "-o-", ""]) {
    CSS_NUMBER[prefix + property] = true;
  }
}
function hyphenate(propertyName) {
  return propertyName.replace(/[A-Z]/g, (m2) => `-${m2.toLowerCase()}`).replace(/^ms-/, "-ms-");
}
function stringHash(str) {
  let value = 5381;
  let len = str.length;
  while (len--)
    value = value * 33 ^ str.charCodeAt(len);
  return (value >>> 0).toString(36);
}
function styleToString(key2, value) {
  if (value && typeof value === "number" && !CSS_NUMBER[key2]) {
    return `${key2}:${value}px`;
  }
  return `${key2}:${value}`;
}
function sortTuples(value) {
  return value.sort((a, b2) => a[0] > b2[0] ? 1 : -1);
}
function parseStyles(styles, hasNestedStyles) {
  const properties = [];
  const nestedStyles = [];
  for (const key2 of Object.keys(styles)) {
    const name = key2.trim();
    const value = styles[key2];
    if (name.charCodeAt(0) !== 36 && value != null) {
      if (typeof value === "object" && !Array.isArray(value)) {
        nestedStyles.push([name, value]);
      } else {
        properties.push([hyphenate(name), value]);
      }
    }
  }
  return {
    style: stringifyProperties(sortTuples(properties)),
    nested: hasNestedStyles ? nestedStyles : sortTuples(nestedStyles),
    isUnique: !!styles.$unique
  };
}
function stringifyProperties(properties) {
  return properties.map(([name, value]) => {
    if (!Array.isArray(value))
      return styleToString(name, value);
    return value.map((x2) => styleToString(name, x2)).join(";");
  }).join(";");
}
function interpolate(selector, parent) {
  if (selector.indexOf("&") === -1)
    return `${parent} ${selector}`;
  return selector.replace(/&/g, parent);
}
function stylize(selector, styles, rulesList, stylesList, parent) {
  const { style: style2, nested, isUnique } = parseStyles(styles, selector !== "");
  let pid = style2;
  if (selector.charCodeAt(0) === 64) {
    const child = {
      selector,
      styles: [],
      rules: [],
      style: parent ? "" : style2
    };
    rulesList.push(child);
    if (style2 && parent) {
      child.styles.push({ selector: parent, style: style2, isUnique });
    }
    for (const [name, value] of nested) {
      pid += name + stylize(name, value, child.rules, child.styles, parent);
    }
  } else {
    const key2 = parent ? interpolate(selector, parent) : selector;
    if (style2)
      stylesList.push({ selector: key2, style: style2, isUnique });
    for (const [name, value] of nested) {
      pid += name + stylize(name, value, rulesList, stylesList, key2);
    }
  }
  return pid;
}
function composeStylize(cache, pid, rulesList, stylesList, className, isStyle) {
  for (const { selector, style: style2, isUnique } of stylesList) {
    const key2 = isStyle ? interpolate(selector, className) : selector;
    const id = isUnique ? `u\0${(++uniqueId).toString(36)}` : `s\0${pid}\0${style2}`;
    const item = new Style(style2, id);
    item.add(new Selector(key2, `k\0${pid}\0${key2}`));
    cache.add(item);
  }
  for (const { selector, style: style2, rules, styles } of rulesList) {
    const item = new Rule(selector, style2, `r\0${pid}\0${selector}\0${style2}`);
    composeStylize(item, pid, rules, styles, className, isStyle);
    cache.add(item);
  }
}
function join(arr) {
  let res = "";
  for (let i = 0; i < arr.length; i++)
    res += arr[i];
  return res;
}
const noopChanges = {
  add: () => void 0,
  change: () => void 0,
  remove: () => void 0
};
class Cache {
  constructor(changes = noopChanges) {
    this.changes = changes;
    this.sheet = [];
    this.changeId = 0;
    this._keys = [];
    this._children = /* @__PURE__ */ Object.create(null);
    this._counters = /* @__PURE__ */ Object.create(null);
  }
  add(style2) {
    const count = this._counters[style2.id] || 0;
    const item = this._children[style2.id] || style2.clone();
    this._counters[style2.id] = count + 1;
    if (count === 0) {
      this._children[item.id] = item;
      this._keys.push(item.id);
      this.sheet.push(item.getStyles());
      this.changeId++;
      this.changes.add(item, this._keys.length - 1);
    } else if (item instanceof Cache && style2 instanceof Cache) {
      const curIndex = this._keys.indexOf(style2.id);
      const prevItemChangeId = item.changeId;
      item.merge(style2);
      if (item.changeId !== prevItemChangeId) {
        this.sheet.splice(curIndex, 1, item.getStyles());
        this.changeId++;
        this.changes.change(item, curIndex, curIndex);
      }
    }
  }
  remove(style2) {
    const count = this._counters[style2.id];
    if (count) {
      this._counters[style2.id] = count - 1;
      const item = this._children[style2.id];
      const index = this._keys.indexOf(item.id);
      if (count === 1) {
        delete this._counters[style2.id];
        delete this._children[style2.id];
        this._keys.splice(index, 1);
        this.sheet.splice(index, 1);
        this.changeId++;
        this.changes.remove(item, index);
      } else if (item instanceof Cache && style2 instanceof Cache) {
        const prevChangeId = item.changeId;
        item.unmerge(style2);
        if (item.changeId !== prevChangeId) {
          this.sheet.splice(index, 1, item.getStyles());
          this.changeId++;
          this.changes.change(item, index, index);
        }
      }
    }
  }
  values() {
    return this._keys.map((key2) => this._children[key2]);
  }
  merge(cache) {
    for (const item of cache.values())
      this.add(item);
    return this;
  }
  unmerge(cache) {
    for (const item of cache.values())
      this.remove(item);
    return this;
  }
  clone() {
    return new Cache().merge(this);
  }
}
class Selector {
  constructor(selector, id) {
    this.selector = selector;
    this.id = id;
  }
  getStyles() {
    return this.selector;
  }
  clone() {
    return this;
  }
}
class Style extends Cache {
  constructor(style2, id) {
    super();
    this.style = style2;
    this.id = id;
  }
  getStyles() {
    return `${this.sheet.join(",")}{${this.style}}`;
  }
  clone() {
    return new Style(this.style, this.id).merge(this);
  }
}
class Rule extends Cache {
  constructor(rule, style2, id) {
    super();
    this.rule = rule;
    this.style = style2;
    this.id = id;
  }
  getStyles() {
    return `${this.rule}{${this.style}${join(this.sheet)}}`;
  }
  clone() {
    return new Rule(this.rule, this.style, this.id).merge(this);
  }
}
function key(pid, styles) {
  const key2 = `f${stringHash(pid)}`;
  return key2;
}
class FreeStyle extends Cache {
  constructor(id, changes) {
    super(changes);
    this.id = id;
  }
  registerStyle(styles) {
    const rulesList = [];
    const stylesList = [];
    const pid = stylize("&", styles, rulesList, stylesList);
    const id = key(pid);
    const selector = `.${id}`;
    composeStylize(this, pid, rulesList, stylesList, selector, true);
    return id;
  }
  registerKeyframes(keyframes) {
    return this.registerHashRule("@keyframes", keyframes);
  }
  registerHashRule(prefix, styles) {
    const rulesList = [];
    const stylesList = [];
    const pid = stylize("", styles, rulesList, stylesList);
    const id = key(pid);
    const selector = `${prefix} ${id}`;
    const rule = new Rule(selector, "", `h\0${pid}\0${prefix}`);
    composeStylize(rule, pid, rulesList, stylesList, "", false);
    this.add(rule);
    return id;
  }
  registerRule(rule, styles) {
    const rulesList = [];
    const stylesList = [];
    const pid = stylize(rule, styles, rulesList, stylesList);
    composeStylize(this, pid, rulesList, stylesList, "", false);
  }
  registerCss(styles) {
    return this.registerRule("", styles);
  }
  getStyles() {
    return join(this.sheet);
  }
  clone() {
    return new FreeStyle(this.id, this.changes).merge(this);
  }
}
function create(changes) {
  return new FreeStyle(`f${(++uniqueId).toString(36)}`, changes);
}
function convertToStyles(object) {
  var styles = {};
  for (var key2 in object) {
    var val = object[key2];
    if (key2 === "$nest") {
      var nested = val;
      for (var selector in nested) {
        var subproperties = nested[selector];
        styles[selector] = convertToStyles(subproperties);
      }
    } else if (key2 === "$debugName") {
      styles.$displayName = val;
    } else {
      styles[key2] = val;
    }
  }
  return styles;
}
function convertToKeyframes(frames) {
  var result = {};
  for (var offset in frames) {
    if (offset !== "$debugName") {
      result[offset] = frames[offset];
    }
  }
  if (frames.$debugName) {
    result.$displayName = frames.$debugName;
  }
  return result;
}
var raf = typeof requestAnimationFrame === "undefined" ? function(cb) {
  return setTimeout(cb);
} : typeof window === "undefined" ? requestAnimationFrame : requestAnimationFrame.bind(window);
function extend() {
  var objects = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    objects[_i] = arguments[_i];
  }
  var result = {};
  for (var _a = 0, objects_1 = objects; _a < objects_1.length; _a++) {
    var object = objects_1[_a];
    if (object == null || object === false) {
      continue;
    }
    for (var key2 in object) {
      var val = object[key2];
      if (!val && val !== 0) {
        continue;
      }
      if (key2 === "$nest" && val) {
        result[key2] = result["$nest"] ? extend(result["$nest"], val) : val;
      } else if (key2.indexOf("&") !== -1 || key2.indexOf("@media") === 0) {
        result[key2] = result[key2] ? extend(result[key2], val) : val;
      } else {
        result[key2] = val;
      }
    }
  }
  return result;
}
var createFreeStyle = function() {
  return create();
};
var TypeStyle = function() {
  function TypeStyle2(_a) {
    var _this = this;
    var autoGenerateTag = _a.autoGenerateTag;
    this.cssRaw = function(mustBeValidCSS) {
      if (!mustBeValidCSS) {
        return;
      }
      _this._raw += mustBeValidCSS || "";
      _this._pendingRawChange = true;
      _this._styleUpdated();
    };
    this.cssRule = function(selector) {
      var objects = [];
      for (var _i = 1; _i < arguments.length; _i++) {
        objects[_i - 1] = arguments[_i];
      }
      var styles = convertToStyles(extend.apply(void 0, objects));
      _this._freeStyle.registerRule(selector, styles);
      _this._styleUpdated();
      return;
    };
    this.forceRenderStyles = function() {
      var target = _this._getTag();
      if (!target) {
        return;
      }
      target.textContent = _this.getStyles();
    };
    this.fontFace = function() {
      var fontFace = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        fontFace[_i] = arguments[_i];
      }
      var freeStyle2 = _this._freeStyle;
      for (var _a2 = 0, _b = fontFace; _a2 < _b.length; _a2++) {
        var face = _b[_a2];
        freeStyle2.registerRule("@font-face", face);
      }
      _this._styleUpdated();
      return;
    };
    this.getStyles = function() {
      return (_this._raw || "") + _this._freeStyle.getStyles();
    };
    this.keyframes = function(frames) {
      var keyframes = convertToKeyframes(frames);
      var animationName = _this._freeStyle.registerKeyframes(keyframes);
      _this._styleUpdated();
      return animationName;
    };
    this.reinit = function() {
      var freeStyle2 = createFreeStyle();
      _this._freeStyle = freeStyle2;
      _this._lastFreeStyleChangeId = freeStyle2.changeId;
      _this._raw = "";
      _this._pendingRawChange = false;
      var target = _this._getTag();
      if (target) {
        target.textContent = "";
      }
    };
    this.setStylesTarget = function(tag) {
      if (_this._tag) {
        _this._tag.textContent = "";
      }
      _this._tag = tag;
      _this.forceRenderStyles();
    };
    this.stylesheet = function(classes) {
      var classNames = Object.getOwnPropertyNames(classes);
      var result = {};
      for (var _i = 0, classNames_1 = classNames; _i < classNames_1.length; _i++) {
        var className = classNames_1[_i];
        var classDef = classes[className];
        if (classDef) {
          classDef.$debugName = className;
          result[className] = _this.style(classDef);
        }
      }
      return result;
    };
    var freeStyle = createFreeStyle();
    this._autoGenerateTag = autoGenerateTag;
    this._freeStyle = freeStyle;
    this._lastFreeStyleChangeId = freeStyle.changeId;
    this._pending = 0;
    this._pendingRawChange = false;
    this._raw = "";
    this._tag = void 0;
    this.style = this.style.bind(this);
  }
  TypeStyle2.prototype._afterAllSync = function(cb) {
    var _this = this;
    this._pending++;
    var pending = this._pending;
    raf(function() {
      if (pending !== _this._pending) {
        return;
      }
      cb();
    });
  };
  TypeStyle2.prototype._getTag = function() {
    if (this._tag) {
      return this._tag;
    }
    if (this._autoGenerateTag) {
      var tag = typeof window === "undefined" ? { textContent: "" } : document.createElement("style");
      if (typeof document !== "undefined") {
        document.head.appendChild(tag);
      }
      this._tag = tag;
      return tag;
    }
    return void 0;
  };
  TypeStyle2.prototype._styleUpdated = function() {
    var _this = this;
    var changeId = this._freeStyle.changeId;
    var lastChangeId = this._lastFreeStyleChangeId;
    if (!this._pendingRawChange && changeId === lastChangeId) {
      return;
    }
    this._lastFreeStyleChangeId = changeId;
    this._pendingRawChange = false;
    this._afterAllSync(function() {
      return _this.forceRenderStyles();
    });
  };
  TypeStyle2.prototype.style = function() {
    var className = this._freeStyle.registerStyle(convertToStyles(extend.apply(void 0, arguments)));
    this._styleUpdated();
    return className;
  };
  return TypeStyle2;
}();
var ts = new TypeStyle({ autoGenerateTag: true });
ts.setStylesTarget;
var cssRaw = ts.cssRaw;
ts.cssRule;
ts.forceRenderStyles;
ts.fontFace;
ts.getStyles;
ts.keyframes;
ts.reinit;
var style = ts.style;
ts.stylesheet;
const MediaHeader = (props) => {
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
}`);
  return /* @__PURE__ */ jsx("div", {
    className: "media---subhead",
    children: /* @__PURE__ */ jsx("p", {
      className: "text-1",
      children: props.title
    })
  });
};
function isValidImageURL(str) {
  if (typeof str !== "string")
    return false;
  return !!str.match(/\w+\.(jpg|jpeg|gif|png|tiff|bmp)$/gi);
}
const MediaRow = (props) => {
  const mediaRow = style({
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "4px"
  });
  const mediaThumbnail = style({
    height: "68px",
    width: "120px",
    backgroundColor: "#ffffff"
  });
  style({
    borderRadius: "8px",
    height: "68px",
    width: "120px"
  });
  style({
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center"
  });
  return /* @__PURE__ */ jsx("div", {
    className: mediaRow,
    children: props.data.map((item) => /* @__PURE__ */ jsx("img", {
      "aria-disabled": !props.selected,
      className: mediaThumbnail,
      src: item.thumbnail,
      onClick: () => props.handleClick(item, props.type ? props.type : isValidImageURL(item.url) ? "image" : "video")
    }, item.id))
  });
};
const overlays = [{
  id: "123",
  url: "https://www.pngmart.com/files/12/Twitch-Stream-Overlay-PNG-Transparent-Picture.png",
  thumbnail: "https://www.pngmart.com/files/12/Twitch-Stream-Overlay-PNG-Transparent-Picture.png"
}, {
  id: "124",
  url: "https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png",
  thumbnail: "https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png"
}, {
  id: "125",
  url: "https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png",
  thumbnail: "https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png"
}];
const videooverlays = [{
  id: "125",
  url: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4",
  thumbnail: "https://i.ibb.co/Zd0RfMM/Screenshot-from-2023-03-13-22-41-14.png"
}, {
  id: "126",
  url: "https://assets.mixkit.co/videos/preview/mixkit-curvy-road-on-a-tree-covered-hill-41537-large.mp4",
  thumbnail: "https://i.ibb.co/YR4fdLt/Screenshot-from-2023-03-13-22-42-57.png"
}, {
  id: "127",
  url: "https://assets.mixkit.co/videos/preview/mixkit-curvy-road-on-a-tree-covered-hill-41537-large.mp4",
  thumbnail: "https://i.ibb.co/YR4fdLt/Screenshot-from-2023-03-13-22-42-57.png"
}];
const backgrounds = [{
  id: "125",
  url: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4",
  thumbnail: "https://i.ibb.co/Zd0RfMM/Screenshot-from-2023-03-13-22-41-14.png"
}, {
  id: "126",
  url: "https://assets.mixkit.co/videos/preview/mixkit-curvy-road-on-a-tree-covered-hill-41537-large.mp4",
  thumbnail: "https://i.ibb.co/YR4fdLt/Screenshot-from-2023-03-13-22-42-57.png"
}, {
  id: "127",
  url: "https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png",
  thumbnail: "https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png"
}];
const logos = [{
  id: "128",
  url: "https://www.pngmart.com/files/12/Twitch-Stream-Overlay-PNG-Transparent-Picture.png",
  thumbnail: "https://www.pngmart.com/files/12/Twitch-Stream-Overlay-PNG-Transparent-Picture.png"
}, {
  id: "129",
  url: "https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png",
  thumbnail: "https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png"
}];
const {
  ScenelessProject
} = index$1;
const {
  useStudio
} = index$1.React;
const getUrl = () => window.location.protocol + "//" + window.location.host + window.location.pathname;
const isLiveURL = () => {
  return ["live.api.stream", "live.stream.horse", "localhost"].some((x2) => location.host.includes(x2));
};
const storage = {
  userName: localStorage.getItem("userName") || ""
};
const generateId = () => (Math.random() * 1e20).toString(36);
const Login = (props) => {
  const {
    onLogin
  } = props;
  const [userName, setUserName] = react.exports.useState(storage.userName);
  const [recaptchaToken, setRecaptchaToken] = react.exports.useState();
  const login = async (e2) => {
    e2.preventDefault();
    let token;
    if (isLiveURL()) {
      const http = axios.create({
        baseURL: location.host.includes("localhost") ? "https://live.stream.horse/live/v2" : `https://${location.host}/live/v2`,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8"
        }
      });
      let res = await http.post(`/demo/token`, {
        serviceId: "DEMO_STUDIOKIT",
        serviceUserId: nanoid(21),
        displayName: userName,
        recaptchaToken
      });
      token = res.data.accessToken;
    } else {
      const APISTREAM_API_KEY = "abc123";
      const http = axios.create({
        baseURL: `https://${location.host}/live/v2`,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
          "X-Api-Key": `${APISTREAM_API_KEY}`
        }
      });
      let res = await http.post(`/authentication/token`, {
        serviceUserId: nanoid(21),
        displayName: userName
      });
      token = res.data.accessToken;
    }
    onLogin({
      token,
      userName
    });
  };
  return /* @__PURE__ */ jsxs("form", {
    className: Style$1.column,
    onSubmit: login,
    style: {
      width: 310,
      alignItems: "flex-end"
    },
    children: [/* @__PURE__ */ jsxs("div", {
      className: Style$1.column,
      children: [/* @__PURE__ */ jsx("label", {
        children: "Username"
      }), /* @__PURE__ */ jsx("input", {
        type: "text",
        autoFocus: true,
        defaultValue: userName,
        style: {
          width: 302
        },
        onChange: (e2) => {
          setUserName(e2.target.value);
        }
      }), /* @__PURE__ */ jsx("div", {
        style: {
          marginTop: 10,
          height: 78
        },
        children: /* @__PURE__ */ jsx(RecaptchaWrapper, {
          theme: "dark",
          sitekey: config.recaptchaKey,
          onChange: (token) => {
            setRecaptchaToken(token);
          }
        })
      })]
    }), /* @__PURE__ */ jsx("button", {
      disabled: !recaptchaToken,
      onClick: login,
      style: {
        marginTop: 8,
        width: 70
      },
      children: "Log in"
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
  const [banners, setBanners] = React.useState(studio.compositor.getSources("Banner"));
  const layout = project.props.layout;
  const [background, setBackground] = react.exports.useState(projectCommands.getBackgroundMedia());
  const [logo, setLogo] = react.exports.useState(projectCommands.getLogo());
  const [overlay, setOverlay] = react.exports.useState(projectCommands.getImageOverlay());
  const [videoOverlay, setVideoOverlay] = react.exports.useState(projectCommands.getVideoOverlay());
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
    studio.compositor.subscribe((event, payload) => {
      if (event === "VideoTimeUpdate") {
        console.log(payload);
      }
    });
  }, []);
  React.useEffect(() => {
    return projectCommands.useLayerState("Background", (layerProps) => {
      var _a;
      setBackground((_a = layerProps[0]) == null ? void 0 : _a.id);
    });
  }, []);
  React.useEffect(() => {
    return projectCommands.useLayerState("Logo", (layerProps) => {
      var _a;
      setLogo((_a = layerProps[0]) == null ? void 0 : _a.id);
    });
  }, []);
  React.useEffect(() => {
    return projectCommands.useLayerState("Overlay", (layerProps) => {
      const imageOverlay = layerProps.find((l2) => {
        var _a;
        return ((_a = l2 == null ? void 0 : l2.sourceProps) == null ? void 0 : _a.type) === "image";
      });
      const videoOverlay2 = layerProps.find((l2) => {
        var _a;
        return ((_a = l2 == null ? void 0 : l2.sourceProps) == null ? void 0 : _a.type) === "video";
      });
      setOverlay(imageOverlay == null ? void 0 : imageOverlay.id);
      setVideoOverlay(videoOverlay2 == null ? void 0 : videoOverlay2.id);
    });
  }, []);
  React.useEffect(() => studio.compositor.useSources("Banner", setBanners), []);
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
  const handleOverlayClick = (data2, type) => {
    switch (type) {
      case "image":
        data2.id === overlay ? projectCommands.removeImageOverlay() : projectCommands.addImageOverlay(data2.id, {
          src: data2.url
        });
        break;
      case "video":
        data2.id === videoOverlay ? projectCommands.removeVideoOverlay() : projectCommands.addVideoOverlay(data2.id, {
          src: data2.url
        });
        break;
    }
  };
  const handleBackgroundClick = (data2, type) => {
    switch (type) {
      case "image":
        data2.id === background ? projectCommands.removeBackgroundImage() : projectCommands.setBackgroundImage(data2.id, {
          src: data2.url
        });
        break;
      case "video":
        data2.id === background ? projectCommands.removeBackgroundVideo() : projectCommands.setBackgroundVideo(data2.id, {
          src: data2.url
        });
        break;
    }
  };
  const handleLogoClick = (data2, type) => {
    switch (type) {
      case "image":
        data2.id === logo ? projectCommands.removeLogo() : projectCommands.addLogo(data2.id, {
          src: data2.url
        });
        break;
    }
  };
  function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  if (!room)
    return null;
  return /* @__PURE__ */ jsxs("div", {
    className: Style$1.column,
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
      style: {
        display: "flex"
      },
      children: [/* @__PURE__ */ jsxs("div", {
        className: Style$1.column,
        style: {
          width: 316,
          display: "flex"
        },
        children: [/* @__PURE__ */ jsx("label", {
          children: "RTMP Url"
        }), /* @__PURE__ */ jsx("input", {
          type: "text",
          defaultValue: rtmpUrl,
          onChange: (e2) => {
            setRtmpUrl(e2.target.value);
          }
        }), /* @__PURE__ */ jsx("label", {
          children: "Stream Key"
        }), /* @__PURE__ */ jsx("input", {
          type: "text",
          defaultValue: streamKey,
          onChange: (e2) => {
            setStreamKey(e2.target.value);
          }
        }), /* @__PURE__ */ jsx("div", {
          className: Style$1.row,
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
        }), /* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            marginLeft: "20%",
            marginTop: "-2%",
            position: "absolute"
          }
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          gap: "20px",
          marginLeft: "50px"
        },
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx(MediaHeader, {
            title: "Banners"
          }), /* @__PURE__ */ jsx("div", {
            className: Style$1.column,
            children: /* @__PURE__ */ jsx("input", {
              type: "button",
              value: "Add Banner",
              onClick: (e2) => {
                projectCommands.addBanner({
                  bodyText: `hey hey hey ${Date.now()}`
                });
              }
            })
          }), /* @__PURE__ */ jsx("div", {
            className: Style$1.column,
            children: /* @__PURE__ */ jsx("input", {
              type: "button",
              value: "Set Banner",
              onClick: (e2) => {
                const randomIndex = randomIntFromInterval(0, banners.length - 1);
                projectCommands.setActiveBanner(banners[randomIndex].id);
              }
            })
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: Style$1.column,
          children: [/* @__PURE__ */ jsx(MediaHeader, {
            title: "Chat Overlays"
          }), /* @__PURE__ */ jsx("input", {
            type: "button",
            value: "Add chat Banner",
            onClick: (e2) => {
              projectCommands.addChatOverlay(generateId(), {
                message: JSON.parse('[{"type":"text","text":"is now live! Streaming Mobile Legends: Bang Bang: My Stream "},{"type":"emoticon","text":"SirUwU","data":{"type":"direct","url":"https://static-cdn.jtvnw.net/emoticons/v2/301544927/default/light/2.0"}},{"type":"text","text":" Hey hey hey!!! this is going live "},{"type":"emoticon","text":"WutFace","data":{"type":"direct","url":"https://static-cdn.jtvnw.net/emoticons/v2/28087/default/light/2.0"}},{"type":"text","text":" , so lets go"}]'),
                username: "Maddygoround",
                metadata: {
                  platform: "twitch",
                  variant: 0,
                  avatar: "https://inf2userdata0wus.blob.core.windows.net/content/62cc383fec1b480054cc2fde/resources/video/EchoBG.mp4/medium.jpg"
                }
              });
            }
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: Style$1.column,
          children: [/* @__PURE__ */ jsx(MediaHeader, {
            title: "Custom Overlays"
          }), /* @__PURE__ */ jsx("input", {
            type: "button",
            value: "Add Custom Overlay",
            onClick: (e2) => {
              projectCommands.addCustomOverlay(generateId(), {
                src: "https://rainmaker.gg/overlay/609c76dcae6381152444d16d5709fe62/12",
                width: 1920,
                height: 1080
              });
            }
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: Style$1.row,
      style: {
        marginTop: 14,
        marginBottom: 8,
        background: "#242533",
        padding: 10
      },
      children: [/* @__PURE__ */ jsx(Participants, {
        room,
        projectCommands,
        studio
      }), /* @__PURE__ */ jsxs("div", {
        className: Style$1.column,
        style: {
          marginLeft: 14,
          marginBottom: 14
        },
        children: [/* @__PURE__ */ jsxs("div", {
          className: Style$1.column,
          children: [/* @__PURE__ */ jsx("label", {
            children: "Layout"
          }), /* @__PURE__ */ jsx("select", {
            defaultValue: layout,
            onChange: (e2) => {
              const {
                layout: layout2,
                props
              } = getLayout(e2.target.value);
              projectCommands.setLayout(layout2, props);
              studio.Command.updateProjectMeta({
                projectId: project.id,
                meta: {
                  layout: e2.target.value
                }
              });
            },
            children: layouts.map((x2) => /* @__PURE__ */ jsx("option", {
              value: x2,
              children: x2
            }, x2))
          })]
        }), /* @__PURE__ */ jsx("div", {
          ref: renderContainer,
          style: {
            width: 840,
            height: 500
          }
        }), /* @__PURE__ */ jsxs("div", {
          className: Style$1.row,
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
      }), /* @__PURE__ */ jsx("div", {
        style: {
          marginLeft: 14
        },
        children: /* @__PURE__ */ jsx(Chat, {})
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          marginLeft: 14
        },
        children: [/* @__PURE__ */ jsx(MediaHeader, {
          title: "Logos"
        }), /* @__PURE__ */ jsx(MediaRow, {
          data: logos,
          type: "image",
          handleClick: handleLogoClick,
          selected: Boolean(overlay)
        }), /* @__PURE__ */ jsx(MediaHeader, {
          title: "Backgrounds"
        }), /* @__PURE__ */ jsx(MediaRow, {
          data: backgrounds,
          handleClick: handleBackgroundClick,
          selected: Boolean(background)
        }), /* @__PURE__ */ jsx(MediaHeader, {
          title: "Video Overlays"
        }), /* @__PURE__ */ jsx(MediaRow, {
          selected: Boolean(videoOverlay),
          data: videooverlays,
          type: "video",
          handleClick: handleOverlayClick
        }), /* @__PURE__ */ jsx(MediaHeader, {
          title: "Image Overlays"
        }), /* @__PURE__ */ jsx(MediaRow, {
          data: overlays,
          type: "image",
          handleClick: handleOverlayClick,
          selected: Boolean(overlay)
        })]
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: Style$1.column,
      children: [/* @__PURE__ */ jsx("label", {
        children: "Preview URL"
      }), /* @__PURE__ */ jsx("input", {
        onClick: (e2) => e2.target.select(),
        value: previewUrl,
        readOnly: true,
        style: {
          width: 630
        }
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: Style$1.column,
      children: [/* @__PURE__ */ jsx("label", {
        children: "Guest URL"
      }), /* @__PURE__ */ jsx("input", {
        onClick: (e2) => e2.target.select(),
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
    }).then(setStudio).catch((e2) => {
      console.warn("Failed to initialize", e2);
      setFailure(e2.message);
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
    }).catch((e2) => {
      console.warn(e2);
      setToken(null);
      localStorage.removeItem("token");
    });
  }, [studio, token, project]);
  react.exports.useEffect(() => {
    if (room) {
      room.sendData({
        type: "UserJoined"
      });
    }
  }, [room]);
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
        token: token2
      }) => {
        setToken(token2);
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
//# sourceMappingURL=main.cd64c5b5.js.map

"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
var react_1 = require("react");
var STYLE = {
    border: '1px solid #aaa',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    width: '30px',
    height: '30px',
    display: 'block',
    padding: 0,
    outline: 'none',
    boxSizing: 'border-box',
    fontWeight: 'bold',
    color: '#666',
    marginLeft: '12px',
    marginBottom: '12px',
};
var HOVER_STYLE = {
    background: '#eee',
};
var FOCUS_STYLE = {
    boxShadow: '0px 0px 0px 1px #aaa inset',
};
var SELECTED_STYLE = {
    background: '#ccc',
    color: '#222',
};
var SELECTED_HOVER_FOCUS_STYLE = {
    background: '#eee',
    color: '#222',
    boxShadow: '0px 0px 0px 1px #aaa inset',
};
var SELECTED_HOVER_STYLE = {
    background: '#eee',
    color: '#222',
};
var SELECTED_FOCUS_STYLE = {
    background: '#ccc',
    color: '#222',
    boxShadow: '0px 0px 0px 1px #aaa inset',
};
var HOVER_FOCUS_STYLE = {
    background: '#eee',
    boxShadow: '0px 0px 0px 1px #aaa inset',
};
var DISABLED_STYLE = {
    background: '#eee',
    color: '#aaa',
};
// TODO - memoize style computation
var buttonStyle = function (disabled, selected, hover, focus, group) {
    var _STYLE = group === undefined ? (STYLE) : group === 'top' ? __assign(__assign({}, STYLE), { borderBottomLeftRadius: '0', borderBottomRightRadius: '0', marginBottom: '0', borderBottom: '0' }) : group === 'middle' ? __assign(__assign({}, STYLE), { borderRadius: '0', marginBottom: '0', borderBottom: '0' }) : __assign(__assign({}, STYLE), { borderTopLeftRadius: '0', borderTopRightRadius: '0' });
    return disabled ? (__assign(__assign({}, _STYLE), DISABLED_STYLE)) : selected && hover && focus ? (__assign(__assign({}, _STYLE), SELECTED_HOVER_FOCUS_STYLE)) : selected && hover ? (__assign(__assign({}, _STYLE), SELECTED_HOVER_STYLE)) : selected && focus ? (__assign(__assign({}, _STYLE), SELECTED_FOCUS_STYLE)) : hover && focus ? (__assign(__assign({}, _STYLE), HOVER_FOCUS_STYLE)) : selected ? (__assign(__assign({}, _STYLE), SELECTED_STYLE)) : hover ? (__assign(__assign({}, _STYLE), HOVER_STYLE)) : focus ? (__assign(__assign({}, _STYLE), FOCUS_STYLE)) : _STYLE;
};
var Button = function (props) {
    var _a = __read(react_1.useState(false), 2), hover = _a[0], setHover = _a[1];
    var _b = __read(react_1.useState(false), 2), focus = _b[0], setFocus = _b[1];
    var onMouseEnter = react_1.useCallback(function () { return setHover(true); }, []);
    var onMouseLeave = react_1.useCallback(function () { return setHover(false); }, []);
    var onFocus = react_1.useCallback(function () { return setFocus(true); }, []);
    var onBlur = react_1.useCallback(function () { return setFocus(false); }, []);
    return react_1.createElement('button', {
        style: buttonStyle(props.disabled, props.selected, hover, focus, props.group),
        'aria-label': props.title,
        title: props.title,
        onClick: props.onClick,
        onMouseEnter: onMouseEnter,
        onMouseLeave: onMouseLeave,
        onFocus: onFocus,
        onBlur: onBlur,
    }, props.children);
};
exports.Button = Button;
//# sourceMappingURL=button.js.map
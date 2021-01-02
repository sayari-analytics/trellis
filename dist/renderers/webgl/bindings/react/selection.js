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
exports.Selection = void 0;
var react_1 = require("react");
// TODO - memoize
var Selection = function (props) {
    var _a, _b, _c;
    var _d = __read(react_1.useState({ select: false }), 2), state = _d[0], setState = _d[1];
    var _state = react_1.useRef(state);
    _state.current = state;
    var toggleSelect = react_1.useCallback(function () { return setState(function (state) { return (__assign(__assign({}, state), { select: !state.select })); }); }, []);
    var onViewportPointerDown = react_1.useCallback(function (event) {
        var _a;
        if (_state.current.select) {
            setState({
                select: true,
                cursor: 'copy',
                circle: { x: event.x, y: event.y, radius: 0 },
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
            });
        }
        (_a = props.onViewportPointerDown) === null || _a === void 0 ? void 0 : _a.call(props, event);
    }, [props.onViewportPointerDown]);
    var onViewportDrag = react_1.useCallback(function (event) {
        var _a, _b;
        if (_state.current.select && _state.current.circle && event.type === 'viewportDrag') {
            var x = _state.current.circle.x;
            var y = _state.current.circle.y;
            var radius = Math.hypot(event.x - x, event.y - y);
            setState({
                select: true,
                cursor: 'copy',
                circle: { x: x, y: y, radius: radius },
                altKey: _state.current.altKey,
                ctrlKey: _state.current.ctrlKey,
                metaKey: _state.current.metaKey,
                shiftKey: _state.current.shiftKey
            });
            (_a = props.onSelection) === null || _a === void 0 ? void 0 : _a.call(props, { type: 'selectionChange', x: x, y: y, radius: radius });
        }
        else {
            (_b = props.onViewportDrag) === null || _b === void 0 ? void 0 : _b.call(props, event);
        }
    }, [props.onSelection, props.onViewportPointerDown]);
    var onViewportPointerUp = react_1.useCallback(function (event) {
        var _a;
        setState({ select: false });
        (_a = props.onViewportPointerUp) === null || _a === void 0 ? void 0 : _a.call(props, event);
    }, [props.onViewportPointerUp]);
    return react_1.createElement(react_1.Fragment, {}, props.children({
        select: state.select,
        toggleSelect: toggleSelect,
        onViewportPointerDown: onViewportPointerDown,
        onViewportDrag: onViewportDrag,
        onViewportPointerUp: onViewportPointerUp,
        cursor: state.cursor,
        annotation: state.circle && state.circle.radius > 0 ? {
            type: 'circle',
            id: 'selection',
            x: state.circle.x,
            y: state.circle.y,
            radius: state.circle.radius,
            style: {
                color: (_a = props.color) !== null && _a !== void 0 ? _a : '#eee',
                stroke: {
                    color: (_b = props.strokeColor) !== null && _b !== void 0 ? _b : '#ccc',
                    width: (_c = props.strokeWidth) !== null && _c !== void 0 ? _c : 2
                }
            }
        } : undefined
    }));
};
exports.Selection = Selection;
//# sourceMappingURL=selection.js.map
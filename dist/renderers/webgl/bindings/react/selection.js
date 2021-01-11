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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
function setsAreEqual(a, b) {
    var e_1, _a;
    if (a.size !== b.size) {
        return false;
    }
    try {
        for (var _b = __values(Array.from(a)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var item = _c.value;
            if (!b.has(item)) {
                return false;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return true;
}
var Selection = function (props) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var _j = __read(react_1.useState({ select: false }), 2), state = _j[0], setState = _j[1];
    var _state = react_1.useRef(state);
    _state.current = state;
    var _keys = react_1.useRef({});
    var _selection = react_1.useRef(new Set());
    var _props = react_1.useRef(props);
    _props.current = props;
    react_1.useEffect(function () {
        var onKeyDown = function (_a) {
            var altKey = _a.altKey, ctrlKey = _a.ctrlKey, metaKey = _a.metaKey, shiftKey = _a.shiftKey;
            _keys.current = { altKey: altKey, ctrlKey: ctrlKey, metaKey: metaKey, shiftKey: shiftKey };
            if (_props.current.enableOnShift !== false) {
                setState(function (state) { return (__assign(__assign({}, state), { select: true })); });
            }
        };
        var onKeyUp = function () {
            _keys.current = {};
            setState(function (state) { return (__assign(__assign({}, state), { select: false })); });
        };
        document.body.addEventListener('keydown', onKeyDown);
        document.body.addEventListener('keyup', onKeyUp);
        return function () {
            document.body.removeEventListener('keydown', onKeyDown);
            document.body.removeEventListener('keyup', onKeyUp);
        };
    });
    var toggleSelect = react_1.useCallback(function () { return setState(function (state) { return (__assign(__assign({}, state), { select: !state.select })); }); }, []);
    var onViewportDragStart = react_1.useCallback(function (event) {
        var _a;
        if (_state.current.select) {
            setState({
                select: true,
                cursor: 'copy',
                annotation: _props.current.shape === 'circle' ?
                    { type: 'circle', x: event.x, y: event.y, radius: 0 } :
                    { type: 'rectangle', x: event.x, y: event.y, width: 0, height: 0 },
            });
        }
        (_a = props.onViewportDragStart) === null || _a === void 0 ? void 0 : _a.call(props, event);
    }, [props.onViewportDragStart]);
    var onViewportDrag = react_1.useCallback(function (event) {
        var e_2, _a;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k;
        if (_state.current.select && _state.current.annotation && event.type === 'viewportDrag') {
            var selection = new Set();
            if (_props.current.shape === 'circle') {
                var x = _state.current.annotation.x;
                var y = _state.current.annotation.y;
                var radius = Math.hypot(event.x - x, event.y - y);
                setState({
                    select: true,
                    cursor: 'copy',
                    annotation: { type: 'circle', x: x, y: y, radius: radius },
                });
                try {
                    for (var _l = __values((_b = _props.current.nodes) !== null && _b !== void 0 ? _b : []), _m = _l.next(); !_m.done; _m = _l.next()) {
                        var node = _m.value;
                        if (Math.hypot(((_c = node.x) !== null && _c !== void 0 ? _c : 0) - x, ((_d = node.y) !== null && _d !== void 0 ? _d : 0) - y) <= radius) {
                            selection.add(node.id);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_m && !_m.done && (_a = _l.return)) _a.call(_l);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else {
                // TODO
            }
            if (!setsAreEqual(_selection.current, selection)) {
                _selection.current = selection;
                (_e = props.onSelection) === null || _e === void 0 ? void 0 : _e.call(props, {
                    type: 'selectionChange',
                    selection: selection,
                    altKey: (_f = _keys.current.altKey) !== null && _f !== void 0 ? _f : false,
                    ctrlKey: (_g = _keys.current.ctrlKey) !== null && _g !== void 0 ? _g : false,
                    metaKey: (_h = _keys.current.metaKey) !== null && _h !== void 0 ? _h : false,
                    shiftKey: (_j = _keys.current.shiftKey) !== null && _j !== void 0 ? _j : false,
                });
            }
        }
        else {
            (_k = props.onViewportDrag) === null || _k === void 0 ? void 0 : _k.call(props, event);
        }
    }, [props.onSelection, props.onViewportDrag]);
    var onViewportDragEnd = react_1.useCallback(function (event) {
        var _a;
        _selection.current = new Set();
        if (_props.current.enableOnShift !== false && _keys.current.shiftKey) {
            setState({ select: true });
        }
        else {
            setState({ select: false });
        }
        (_a = props.onViewportDragEnd) === null || _a === void 0 ? void 0 : _a.call(props, event);
    }, [props.onViewportDragEnd]);
    return props.children({
        select: state.select,
        toggleSelect: toggleSelect,
        onViewportDragStart: onViewportDragStart,
        onViewportDrag: onViewportDrag,
        onViewportDragEnd: onViewportDragEnd,
        cursor: state.cursor,
        annotation: ((_a = state.annotation) === null || _a === void 0 ? void 0 : _a.type) === 'circle' ? {
            type: 'circle',
            id: 'selection',
            x: state.annotation.x,
            y: state.annotation.y,
            radius: state.annotation.radius,
            style: {
                color: (_b = props.color) !== null && _b !== void 0 ? _b : '#eee',
                stroke: {
                    color: (_c = props.strokeColor) !== null && _c !== void 0 ? _c : '#ccc',
                    width: (_d = props.strokeWidth) !== null && _d !== void 0 ? _d : 2
                }
            }
        } : ((_e = state.annotation) === null || _e === void 0 ? void 0 : _e.type) === 'rectangle' ? {
            type: 'rectangle',
            id: 'selection',
            x: state.annotation.x,
            y: state.annotation.y,
            width: state.annotation.width,
            height: state.annotation.height,
            style: {
                color: (_f = props.color) !== null && _f !== void 0 ? _f : '#eee',
                stroke: {
                    color: (_g = props.strokeColor) !== null && _g !== void 0 ? _g : '#ccc',
                    width: (_h = props.strokeWidth) !== null && _h !== void 0 ? _h : 2
                }
            }
        } : undefined,
    });
};
exports.Selection = Selection;
//# sourceMappingURL=selection.js.map
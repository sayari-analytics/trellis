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
            setState(function (state) { return (state.annotation === undefined ? __assign(__assign({}, state), { select: false }) : state); });
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
        var e_2, _a, e_3, _b;
        var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        if (_state.current.select && _state.current.annotation && event.type === 'viewportDrag') {
            var selection = new Set();
            if (_props.current.shape === 'circle') {
                var radius = Math.hypot(event.x - _state.current.annotation.x, event.y - _state.current.annotation.y);
                setState({
                    select: true,
                    cursor: 'copy',
                    annotation: { type: 'circle', x: _state.current.annotation.x, y: _state.current.annotation.y, radius: radius },
                });
                try {
                    for (var _q = __values((_c = _props.current.nodes) !== null && _c !== void 0 ? _c : []), _r = _q.next(); !_r.done; _r = _q.next()) {
                        var node = _r.value;
                        if (Math.hypot(((_d = node.x) !== null && _d !== void 0 ? _d : 0) - _state.current.annotation.x, ((_e = node.y) !== null && _e !== void 0 ? _e : 0) - _state.current.annotation.y) <= radius) {
                            selection.add(node.id);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_r && !_r.done && (_a = _q.return)) _a.call(_q);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else {
                var x1 = _state.current.annotation.x;
                var x2 = event.x;
                var y1 = _state.current.annotation.y;
                var y2 = event.y;
                var width = x2 - x1;
                var height = y2 - y1;
                setState({
                    select: true,
                    cursor: 'copy',
                    annotation: { type: 'rectangle', x: x1, y: y1, width: width, height: height },
                });
                try {
                    for (var _s = __values((_f = _props.current.nodes) !== null && _f !== void 0 ? _f : []), _t = _s.next(); !_t.done; _t = _s.next()) {
                        var node = _t.value;
                        var x = (_g = node.x) !== null && _g !== void 0 ? _g : 0;
                        var y = (_h = node.y) !== null && _h !== void 0 ? _h : 0;
                        if (((x > x1 && x < x2) || (x > x2 && x < x1)) && ((y > y1 && y < y2) || (y > y2 && y < y1))) {
                            selection.add(node.id);
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_t && !_t.done && (_b = _s.return)) _b.call(_s);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
            if (!setsAreEqual(_selection.current, selection)) {
                _selection.current = selection;
                (_j = props.onSelection) === null || _j === void 0 ? void 0 : _j.call(props, {
                    type: 'selectionChange',
                    selection: selection,
                    altKey: (_k = _keys.current.altKey) !== null && _k !== void 0 ? _k : false,
                    ctrlKey: (_l = _keys.current.ctrlKey) !== null && _l !== void 0 ? _l : false,
                    metaKey: (_m = _keys.current.metaKey) !== null && _m !== void 0 ? _m : false,
                    shiftKey: (_o = _keys.current.shiftKey) !== null && _o !== void 0 ? _o : false,
                });
            }
        }
        else {
            (_p = props.onViewportDrag) === null || _p === void 0 ? void 0 : _p.call(props, event);
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
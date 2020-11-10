"use strict";
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
exports.zoomToBounds = exports.getBounds = void 0;
exports.getBounds = function (nodes, padding) {
    var e_1, _a;
    var _b, _c, _d, _e;
    if (padding === void 0) { padding = 0; }
    var left = 0;
    var top = 0;
    var right = 0;
    var bottom = 0;
    try {
        for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
            var node = nodes_1_1.value;
            var nodeLeft = ((_b = node.x) !== null && _b !== void 0 ? _b : 0) - node.radius;
            var nodeTop = ((_c = node.y) !== null && _c !== void 0 ? _c : 0) - node.radius;
            var nodeRight = ((_d = node.x) !== null && _d !== void 0 ? _d : 0) + node.radius;
            var nodeBottom = ((_e = node.y) !== null && _e !== void 0 ? _e : 0) + node.radius;
            if (nodeLeft < left)
                left = nodeLeft;
            if (nodeTop < top)
                top = nodeTop;
            if (nodeRight > right)
                right = nodeRight;
            if (nodeBottom > bottom)
                bottom = nodeBottom;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return [left - padding, top - padding, right + padding, bottom + padding];
};
exports.zoomToBounds = function (_a, width, height) {
    var _b = __read(_a, 4), left = _b[0], top = _b[1], right = _b[2], bottom = _b[3];
    var targetWidth = right - left;
    var targetHeight = bottom - top;
    var x = (targetWidth / 2) - right;
    var y = (targetHeight / 2) - bottom;
    if (targetWidth / targetHeight > width / height) {
        // fit to width
        return { x: x, y: y, zoom: width / targetWidth };
    }
    else {
        // fit to height
        return { x: x, y: y, zoom: height / targetHeight };
    }
};
//# sourceMappingURL=index.js.map
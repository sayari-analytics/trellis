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
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp = exports.boundsToDimenions = exports.boundsToViewport = exports.viewportToBounds = exports.mergeBounds = exports.getSelectionBounds = void 0;
exports.getSelectionBounds = function (nodes, padding) {
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
    return { left: left - padding, top: top - padding, right: right + padding, bottom: bottom + padding };
};
exports.mergeBounds = function (a, b, padding) {
    if (padding === void 0) { padding = 0; }
    return {
        left: Math.min(a.left, b.left) - padding,
        top: Math.min(a.top, b.top) - padding,
        right: Math.max(a.right, b.right) + padding,
        bottom: Math.max(a.bottom, b.bottom) + padding,
    };
};
exports.viewportToBounds = function (_a, _b) {
    var x = _a.x, y = _a.y, zoom = _a.zoom;
    var width = _b.width, height = _b.height;
    var xOffset = width / 2 / zoom;
    var yOffset = height / 2 / zoom;
    return {
        left: -(x + xOffset),
        top: -(y + yOffset),
        right: -(x - xOffset),
        bottom: -(y - yOffset),
    };
};
exports.boundsToViewport = function (_a, _b) {
    var left = _a.left, top = _a.top, right = _a.right, bottom = _a.bottom;
    var width = _b.width, height = _b.height;
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
exports.boundsToDimenions = function (_a, zoom) {
    var left = _a.left, top = _a.top, right = _a.right, bottom = _a.bottom;
    return {
        width: (right - left) / zoom,
        height: (bottom - top) / zoom,
    };
};
exports.clamp = function (min, max, value) { return Math.max(min, Math.min(max, value)); };
//# sourceMappingURL=index.js.map
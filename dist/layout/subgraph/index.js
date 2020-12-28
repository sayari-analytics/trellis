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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layout = exports.subgraphRadius = void 0;
var subgraphRadius = function (radius, nodes) {
    var e_1, _a;
    var _b, _c;
    var _radius = radius;
    try {
        for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
            var node = nodes_1_1.value;
            var newRadius = Math.hypot((_b = node.x) !== null && _b !== void 0 ? _b : 0, (_c = node.y) !== null && _c !== void 0 ? _c : 0) + node.radius;
            _radius = Math.max(_radius, newRadius);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return _radius;
};
exports.subgraphRadius = subgraphRadius;
var Layout = function () {
    return function (previousNodes, nextNodes) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        var result = nextNodes.map(function (node) { return (__assign({}, node)); }), collapseNode, collapseNodeX, collapseNodeY, expandNode, expandNodeX, expandNodeY, node, theta, radius, nodeX, nodeY;
        var _loop_1 = function (i) {
            if (previousNodes[i].subgraph !== undefined) {
                collapseNode = (_a = result.find(function (node) { return node.id === previousNodes[i].id; })) !== null && _a !== void 0 ? _a : previousNodes[i];
                collapseNodeX = (_b = collapseNode.x) !== null && _b !== void 0 ? _b : 0;
                collapseNodeY = (_c = collapseNode.y) !== null && _c !== void 0 ? _c : 0;
                radius = previousNodes[i].radius;
                for (var j = 0; j < result.length; j++) {
                    node = result[j];
                    if (node.id !== collapseNode.id) {
                        nodeX = (_d = node.x) !== null && _d !== void 0 ? _d : 0;
                        nodeY = (_e = node.y) !== null && _e !== void 0 ? _e : 0;
                        theta = Math.atan2(collapseNodeY - nodeY, collapseNodeX - nodeX);
                        node.x = nodeX + (Math.cos(theta) * radius);
                        node.y = nodeY + (Math.sin(theta) * radius);
                    }
                }
            }
        };
        /**
         * collapse all existing subgraphs
         */
        for (var i = previousNodes.length - 1; i >= 0; i--) {
            _loop_1(i);
        }
        var _loop_2 = function (i) {
            if (nextNodes[i].subgraph !== undefined) {
                expandNode = (_f = result.find(function (node) { return node.id === nextNodes[i].id; })) !== null && _f !== void 0 ? _f : nextNodes[i];
                expandNodeX = (_g = expandNode.x) !== null && _g !== void 0 ? _g : 0;
                expandNodeY = (_h = expandNode.y) !== null && _h !== void 0 ? _h : 0;
                radius = nextNodes[i].radius;
                for (var j = 0; j < result.length; j++) {
                    node = result[j];
                    if (node.id !== expandNode.id) {
                        nodeX = (_j = node.x) !== null && _j !== void 0 ? _j : 0;
                        nodeY = (_k = node.y) !== null && _k !== void 0 ? _k : 0;
                        theta = Math.atan2(nodeY - expandNodeY, nodeX - expandNodeX);
                        node.x = nodeX + (Math.cos(theta) * radius);
                        node.y = nodeY + (Math.sin(theta) * radius);
                    }
                }
            }
        };
        /**
         * expand all new subgraphs
         */
        for (var i = 0; i < nextNodes.length; i++) {
            _loop_2(i);
        }
        return result;
    };
};
exports.Layout = Layout;
//# sourceMappingURL=index.js.map
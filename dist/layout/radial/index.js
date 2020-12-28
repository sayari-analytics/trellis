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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layout = void 0;
var Hierarchy = __importStar(require("../hierarchy"));
var TWO_PI = Math.PI * 2;
var Layout = function () {
    var layout = Hierarchy.Layout();
    return function (root, graph) {
        var _a, _b, _c;
        var _d = layout(root, {
            nodes: graph.nodes,
            edges: graph.edges,
            options: {
                bfs: (_a = graph.options) === null || _a === void 0 ? void 0 : _a.bfs,
                size: [TWO_PI, (_c = (_b = graph.options) === null || _b === void 0 ? void 0 : _b.radius) !== null && _c !== void 0 ? _c : 600],
                separation: function (a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; }
            }
        }), nodes = _d.nodes, edges = _d.edges;
        return {
            nodes: nodes.map(function (node) {
                var _a, _b, _c, _d, _e, _f;
                var theta = (_a = node.x) !== null && _a !== void 0 ? _a : 0;
                var radius = (_b = node.y) !== null && _b !== void 0 ? _b : 0;
                return __assign(__assign({}, node), { x: Math.cos(theta) * radius + ((_d = (_c = graph.options) === null || _c === void 0 ? void 0 : _c.x) !== null && _d !== void 0 ? _d : 0), y: Math.sin(theta) * radius - ((_f = (_e = graph.options) === null || _e === void 0 ? void 0 : _e.y) !== null && _f !== void 0 ? _f : 0) });
            }),
            edges: edges,
            options: graph.options
        };
    };
};
exports.Layout = Layout;
//# sourceMappingURL=index.js.map
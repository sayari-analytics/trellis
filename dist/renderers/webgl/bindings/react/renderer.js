"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = void 0;
var react_1 = require("react");
var __1 = require("../..");
var defaultNodesEqual = function (prev, current) { return prev === current; };
var defaultEdgesEqual = function (prev, current) { return prev === current; };
var Renderer = function (props) {
    var _a, _b;
    var ref = react_1.useRef(null);
    var renderer = react_1.useRef();
    react_1.useEffect(function () {
        var _a, _b;
        var _renderer = __1.Renderer({ container: ref.current, debug: props.debug });
        renderer.current = _renderer;
        var nodes = props.nodes, edges = props.edges, annotations = props.annotations, options = __rest(props, ["nodes", "edges", "annotations"]);
        options.nodesEqual = (_a = options.nodesEqual) !== null && _a !== void 0 ? _a : defaultNodesEqual;
        options.edgesEqual = (_b = options.edgesEqual) !== null && _b !== void 0 ? _b : defaultEdgesEqual;
        renderer.current({ nodes: nodes, edges: edges, annotations: annotations, options: options });
        return function () { return _renderer.delete(); };
    }, []);
    if (renderer.current) {
        var nodes = props.nodes, edges = props.edges, annotations = props.annotations, options = __rest(props, ["nodes", "edges", "annotations"]);
        options.nodesEqual = (_a = options.nodesEqual) !== null && _a !== void 0 ? _a : defaultNodesEqual;
        options.edgesEqual = (_b = options.edgesEqual) !== null && _b !== void 0 ? _b : defaultEdgesEqual;
        renderer.current({ nodes: nodes, edges: edges, annotations: annotations, options: options });
    }
    return react_1.createElement('div', { ref: ref });
};
exports.Renderer = Renderer;
//# sourceMappingURL=renderer.js.map
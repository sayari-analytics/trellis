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
var simulation_1 = require("./simulation");
var utils_1 = require("../../utils");
var ForceLayout = /** @class */ (function () {
    function ForceLayout(handler) {
        var _this = this;
        if (handler === void 0) { handler = utils_1.noop; }
        this.nodes = [];
        this.edges = [];
        this.nodesById = {};
        this.edgesById = {};
        this.positionedNodes = [];
        this.positionedNodesById = {};
        this.options = {};
        this.run = false;
        this.apply = function (_a) {
            var e_1, _b, e_2, _c;
            var nodes = _a.nodes, edges = _a.edges, _d = _a.options, options = _d === void 0 ? simulation_1.LAYOUT_OPTIONS : _d;
            var _e, _f, _g, _h;
            var nodesById = {};
            var edgesById = {};
            var positionedNodes = [];
            var positionedNodesById = {};
            var updateNodes = [];
            /**
             * run simulation on node enter/exit, node update radius/subGraph
             * update simulation on node move
             */
            if (nodes !== _this.nodes) {
                try {
                    for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                        var node = nodes_1_1.value;
                        if (_this.nodesById[node.id] === undefined) {
                            // node enter
                            nodesById[node.id] = node;
                            var positionedNode = __assign(__assign({}, node), { x: (_e = node.x) !== null && _e !== void 0 ? _e : 0, y: (_f = node.y) !== null && _f !== void 0 ? _f : 0 });
                            positionedNodes.push(positionedNode);
                            positionedNodesById[node.id] = positionedNode;
                            _this.run = true;
                        }
                        else if (_this.nodesById[node.id] !== node) {
                            // node update
                            nodesById[node.id] = node;
                            var positionedNode = __assign(__assign({}, node), { x: (_g = node.x) !== null && _g !== void 0 ? _g : _this.positionedNodesById[node.id].x, y: (_h = node.y) !== null && _h !== void 0 ? _h : _this.positionedNodesById[node.id].y, radius: node.subGraph !== undefined ? _this.positionedNodesById[node.id].radius : node.radius });
                            positionedNodes.push(positionedNode);
                            positionedNodesById[node.id] = positionedNode;
                            /**
                             * TODO - if subGraphs have changed, but nothing else has, then rather than rerunning the entire simulation,
                             * could instead just rerun the subGraph repositioning: more efficient and less disruptive
                             */
                            if (node.radius !== _this.nodesById[node.id].radius || node.subGraph !== _this.nodesById[node.id].subGraph) {
                                _this.run = true;
                            }
                            else if (node.x !== _this.nodesById[node.id].x || node.y !== _this.nodesById[node.id].y) {
                                updateNodes.push(positionedNode);
                            }
                        }
                        else {
                            nodesById[node.id] = node;
                            var positionedNode = _this.positionedNodesById[node.id];
                            positionedNodes.push(positionedNode);
                            positionedNodesById[node.id] = positionedNode;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (nodes_1_1 && !nodes_1_1.done && (_b = nodes_1.return)) _b.call(nodes_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                /**
                 * TODO - if ((number of node updates) < this.nodes.length) { this.run = true }
                 */
                for (var nodeId in _this.nodesById) {
                    if (nodesById[nodeId] === undefined) {
                        // node exit
                        _this.run = true;
                    }
                }
                _this.nodes = nodes;
                _this.nodesById = nodesById;
                _this.positionedNodes = positionedNodes;
                _this.positionedNodesById = positionedNodesById;
            }
            /**
             * run simulation on edge enter/exit
             */
            if (edges !== _this.edges) {
                try {
                    for (var edges_1 = __values(edges), edges_1_1 = edges_1.next(); !edges_1_1.done; edges_1_1 = edges_1.next()) {
                        var edge = edges_1_1.value;
                        edgesById[edge.id] = edge;
                        if (_this.edgesById[edge.id] === undefined) {
                            // edge enter
                            _this.run = true;
                        }
                        // no edge update
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (edges_1_1 && !edges_1_1.done && (_c = edges_1.return)) _c.call(edges_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                /**
                 * TODO - if ((number of edge updates) < this.edge.length) { this.run = true }
                 */
                for (var edgeId in _this.edgesById) {
                    if (edgesById[edgeId] === undefined) {
                        // edge exit
                        _this.run = true;
                    }
                }
                _this.edges = edges;
                _this.edgesById = edgesById;
            }
            /**
             * run simulation on options update
             */
            if (options !== _this.options) { // TODO - shallow equals
                // update options
                _this.options = options;
                _this.run = true;
            }
            if (_this.run) {
                _this.worker.postMessage({ type: 'run', nodes: nodes, edges: edges, options: options });
            }
            else if (updateNodes.length > 0) {
                _this.worker.postMessage({ type: 'update', nodes: updateNodes });
                _this.handler({ nodes: _this.positionedNodes, edges: _this.edges });
            }
            else {
                _this.handler({ nodes: _this.positionedNodes, edges: _this.edges });
            }
            _this.run = false;
            return _this;
        };
        this.handler = handler;
        var _a = simulation_1.Simulation(), worker = _a.worker, dispose = _a.dispose;
        this.worker = worker;
        this.dispose = dispose;
        this.worker.onmessage = function (event) {
            var e_3, _a;
            var positionedNodes = [];
            var positionedNodesById = {};
            try {
                for (var _b = __values(event.data.nodes), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var node = _c.value;
                    if (_this.positionedNodesById[node.id]) {
                        positionedNodes.push(node);
                        positionedNodesById[node.id] = node;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            _this.positionedNodes = positionedNodes;
            _this.positionedNodesById = positionedNodesById;
            _this.handler({ nodes: positionedNodes, edges: _this.edges });
        };
    }
    return ForceLayout;
}());
exports.Layout = function (handler) {
    if (handler === void 0) { handler = utils_1.noop; }
    var forceLayout = new ForceLayout(handler);
    var apply = function (graph) { return forceLayout.apply(graph); };
    apply.nodes = function () { return forceLayout.positionedNodes; };
    apply.edges = function () { return forceLayout.edges; };
    return apply;
};
//# sourceMappingURL=index.js.map
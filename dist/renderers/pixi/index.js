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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var PIXI = __importStar(require("pixi.js"));
var pixi_viewport_1 = require("pixi-viewport");
var fontfaceobserver_1 = __importDefault(require("fontfaceobserver"));
var utils_1 = require("../../utils");
var node_1 = require("./node");
var edge_1 = require("./edge");
exports.RENDERER_OPTIONS = {
    width: 800, height: 600,
    onNodePointerEnter: utils_1.noop, onNodePointerDown: utils_1.noop, onNodeDrag: utils_1.noop, onNodePointerUp: utils_1.noop, onNodePointerLeave: utils_1.noop, onNodeDoubleClick: utils_1.noop,
    onEdgePointerEnter: utils_1.noop, onEdgePointerDown: utils_1.noop, onEdgePointerUp: utils_1.noop, onEdgePointerLeave: utils_1.noop,
    onContainerPointerEnter: utils_1.noop, onContainerPointerDown: utils_1.noop, onContainerPointerMove: utils_1.noop, onContainerPointerUp: utils_1.noop, onContainerPointerLeave: utils_1.noop,
};
exports.NODE_STYLES = {
    strokeWidth: 2,
    fill: '#ff4b4b',
    stroke: '#bb0000',
    fillOpacity: 1,
    strokeOpacity: 1,
};
exports.EDGE_STYLES = {
    width: 1,
    stroke: '#ccc',
    strokeOpacity: 1,
};
exports.nodeStyleSelector = function (nodeStyles) { return function (node, attribute) {
    if (node.style === undefined || node.style[attribute] === undefined) {
        return nodeStyles[attribute];
    }
    return node.style[attribute];
}; };
exports.edgeStyleSelector = function (edgeStyles) { return function (edge, attribute) {
    if (edge.style === undefined || edge.style[attribute] === undefined) {
        return edgeStyles[attribute];
    }
    return edge.style[attribute];
}; };
new fontfaceobserver_1.default('Material Icons').load();
var POSITION_ANIMATION_DURATION = 800;
PIXI.utils.skipHello();
var PIXIRenderer = /** @class */ (function () {
    function PIXIRenderer(_a) {
        var _this = this;
        var container = _a.container, _b = _a.debug, debug = _b === void 0 ? {} : _b;
        this.dirty = false;
        this.renderTime = Date.now();
        this.animationDuration = 0;
        this.animationPercent = 0;
        this.restartAnimation = false;
        this.edgesLayer = new PIXI.Container();
        this.nodesLayer = new PIXI.Container();
        this.labelsLayer = new PIXI.Container();
        this.frontNodeLayer = new PIXI.Container();
        this.frontLabelLayer = new PIXI.Container();
        this.nodesById = {};
        this.edgesById = {};
        this.forwardEdgeIndex = {};
        this.reverseEdgeIndex = {};
        this.onNodePointerEnter = utils_1.noop;
        this.onNodePointerDown = utils_1.noop;
        this.onNodeDrag = utils_1.noop;
        this.onNodePointerUp = utils_1.noop;
        this.onNodePointerLeave = utils_1.noop;
        this.onNodeDoubleClick = utils_1.noop;
        this.onEdgePointerEnter = utils_1.noop;
        this.onEdgePointerDown = utils_1.noop;
        this.onEdgePointerUp = utils_1.noop;
        this.onEdgePointerLeave = utils_1.noop;
        this.width = exports.RENDERER_OPTIONS.width;
        this.height = exports.RENDERER_OPTIONS.height;
        /**
         * TODO
         * - handle case where apply is called while previous apply is still being interpolated
         * current approach essentially cancels previous apply and runs a new one
         * maybe instead stage new one, overwriting stagged apply if new applys are called, and don't run until previous interpolation is done
         * - do a better job diffing against existing nodes/edges/options
         */
        this.apply = function (_a) {
            var e_1, _b, e_2, _c, e_3, _d;
            var nodes = _a.nodes, edges = _a.edges, _e = _a.options, _f = _e === void 0 ? exports.RENDERER_OPTIONS : _e, _g = _f.width, width = _g === void 0 ? exports.RENDERER_OPTIONS.width : _g, _h = _f.height, height = _h === void 0 ? exports.RENDERER_OPTIONS.height : _h, _j = _f.onNodePointerEnter, onNodePointerEnter = _j === void 0 ? utils_1.noop : _j, _k = _f.onNodePointerDown, onNodePointerDown = _k === void 0 ? utils_1.noop : _k, _l = _f.onNodeDrag, onNodeDrag = _l === void 0 ? utils_1.noop : _l, _m = _f.onNodePointerUp, onNodePointerUp = _m === void 0 ? utils_1.noop : _m, _o = _f.onNodePointerLeave, onNodePointerLeave = _o === void 0 ? utils_1.noop : _o, _p = _f.onNodeDoubleClick, onNodeDoubleClick = _p === void 0 ? utils_1.noop : _p, _q = _f.onEdgePointerEnter, onEdgePointerEnter = _q === void 0 ? utils_1.noop : _q, _r = _f.onEdgePointerDown, onEdgePointerDown = _r === void 0 ? utils_1.noop : _r, _s = _f.onEdgePointerUp, onEdgePointerUp = _s === void 0 ? utils_1.noop : _s, _t = _f.onEdgePointerLeave, onEdgePointerLeave = _t === void 0 ? utils_1.noop : _t, _u = _f.onContainerPointerEnter, onContainerPointerEnter = _u === void 0 ? utils_1.noop : _u, _v = _f.onContainerPointerDown, onContainerPointerDown = _v === void 0 ? utils_1.noop : _v, _w = _f.onContainerPointerMove, onContainerPointerMove = _w === void 0 ? utils_1.noop : _w, _x = _f.onContainerPointerUp, onContainerPointerUp = _x === void 0 ? utils_1.noop : _x, _y = _f.onContainerPointerLeave, onContainerPointerLeave = _y === void 0 ? utils_1.noop : _y;
            var _z, _0;
            if (width !== _this.width || height !== _this.height) {
                _this.width = width;
                _this.height = height;
                _this.app.renderer.resize(width, height);
            }
            // TODO - these shouldn't fire on edge hover or click either
            _this.app.view.onpointerenter = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && onContainerPointerEnter(e); };
            _this.app.view.onpointerdown = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && onContainerPointerDown(e); };
            _this.app.view.onpointermove = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && onContainerPointerMove(e); };
            _this.app.view.onpointerup = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && onContainerPointerUp(e); };
            _this.app.view.onpointerleave = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && onContainerPointerLeave(e); };
            _this.onNodePointerEnter = onNodePointerEnter;
            _this.onNodePointerDown = onNodePointerDown;
            _this.onNodeDrag = onNodeDrag;
            _this.onNodePointerUp = onNodePointerUp;
            _this.onNodePointerLeave = onNodePointerLeave;
            _this.onNodeDoubleClick = onNodeDoubleClick;
            _this.onEdgePointerEnter = onEdgePointerEnter;
            _this.onEdgePointerDown = onEdgePointerDown;
            _this.onEdgePointerUp = onEdgePointerUp;
            _this.onEdgePointerLeave = onEdgePointerLeave;
            /**
             * restart animation whenever a new layout is calculated: nodes/edges are added/removed from graph, subGraph is added/removed from graph
             */
            _this.restartAnimation = false;
            var nodesById = {};
            var edgesById = {};
            /**
             * Build edge indices
             * TODO - is it possible to build edge indices and enter/update/exit edge containers in one pass?
             */
            if (edges !== _this.edges) {
                try {
                    for (var edges_1 = __values(edges), edges_1_1 = edges_1.next(); !edges_1_1.done; edges_1_1 = edges_1.next()) {
                        var edge = edges_1_1.value;
                        var id = edge.id, source = edge.source, target = edge.target;
                        if (_this.forwardEdgeIndex[source] === undefined) {
                            _this.forwardEdgeIndex[source] = {};
                        }
                        if (_this.forwardEdgeIndex[source][target] === undefined) {
                            _this.forwardEdgeIndex[source][target] = new Set();
                        }
                        _this.forwardEdgeIndex[source][target].add(id);
                        if (_this.reverseEdgeIndex[target] === undefined) {
                            _this.reverseEdgeIndex[target] = {};
                        }
                        if (_this.reverseEdgeIndex[target][source] === undefined) {
                            _this.reverseEdgeIndex[target][source] = new Set();
                        }
                        _this.reverseEdgeIndex[target][source].add(id);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (edges_1_1 && !edges_1_1.done && (_b = edges_1.return)) _b.call(edges_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            /**
             * Ndge enter/update/exit
             */
            if (nodes !== _this.nodes) {
                try {
                    for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                        var node = nodes_1_1.value;
                        if (_this.nodesById[node.id] === undefined) {
                            // node enter
                            _this.dirty = true;
                            _this.restartAnimation = true;
                            var adjacentNode = void 0;
                            if (_this.reverseEdgeIndex[node.id]) {
                                // nodes w edges from existing nodes enter from one of those nodes
                                adjacentNode = _this.nodesById[Object.keys(_this.reverseEdgeIndex[node.id])[0]];
                            }
                            else if (_this.forwardEdgeIndex[node.id]) {
                                // nodes w edges to existing nodes enter from one of those nodes
                                adjacentNode = _this.nodesById[Object.keys(_this.forwardEdgeIndex[node.id])[0]];
                            }
                            nodesById[node.id] = new node_1.Node(_this, node, (_z = adjacentNode === null || adjacentNode === void 0 ? void 0 : adjacentNode.x) !== null && _z !== void 0 ? _z : 0, (_0 = adjacentNode === null || adjacentNode === void 0 ? void 0 : adjacentNode.y) !== null && _0 !== void 0 ? _0 : 0);
                        }
                        else { // TODO - if node can't be mutated, only set node if (node !== this.nodesById[node.id].node)
                            // node update
                            /**
                             * TODO - unclear whether or not node can get mutated by layout
                             */
                            _this.dirty = true;
                            if (node.subGraph !== _this.nodesById[node.id].node.subGraph || node.radius !== _this.nodesById[node.id].node.radius) {
                                _this.restartAnimation = true;
                            }
                            nodesById[node.id] = _this.nodesById[node.id].set(node);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (nodes_1_1 && !nodes_1_1.done && (_c = nodes_1.return)) _c.call(nodes_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                for (var nodeId in _this.nodesById) {
                    if (nodesById[nodeId] === undefined) {
                        // node exit
                        _this.dirty = true;
                        _this.restartAnimation = true;
                        _this.nodesById[nodeId].delete();
                    }
                }
                _this.nodesById = nodesById;
                _this.nodes = nodes;
            }
            /**
             * Edge enter/update/exit
             */
            if (edges !== _this.edges) {
                try {
                    for (var edges_2 = __values(edges), edges_2_1 = edges_2.next(); !edges_2_1.done; edges_2_1 = edges_2.next()) {
                        var edge = edges_2_1.value;
                        var id = edge.id;
                        if (_this.edgesById[id] === undefined) {
                            // edge enter
                            _this.dirty = true;
                            _this.restartAnimation = true;
                            edgesById[id] = new edge_1.Edge(_this, _this.edgesLayer).set(edge);
                        }
                        else if (edge !== _this.edgesById[id].edge) {
                            // edge update
                            _this.dirty = true;
                            edgesById[id] = _this.edgesById[id].set(edge);
                        }
                        else {
                            _this.dirty = true;
                            edgesById[id] = _this.edgesById[id].set(edge);
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (edges_2_1 && !edges_2_1.done && (_d = edges_2.return)) _d.call(edges_2);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                for (var edgeId in _this.edgesById) {
                    if (edgesById[edgeId] === undefined) {
                        // edge exit
                        _this.dirty = true;
                        _this.restartAnimation = true;
                        _this.edgesById[edgeId].delete();
                    }
                }
                _this.edgesById = edgesById;
                _this.edges = edges;
            }
            if (_this.restartAnimation) {
                _this.restartAnimation = false;
                _this.animationDuration = 0;
                _this.animationPercent = 0;
            }
        };
        this.render = function () {
            var now = Date.now();
            // this.animationDuration += Math.min(16, Math.max(0, now - this.renderTime)) // clamp to 0 <= x <= 16 to make animations appear slower and smoother
            _this.animationDuration += now - _this.renderTime;
            _this.animationPercent = Math.min(_this.animationDuration / POSITION_ANIMATION_DURATION, 1);
            _this.renderTime = now;
            if (_this.dirty) {
                for (var nodeId in _this.nodesById) {
                    _this.nodesById[nodeId].render();
                }
                for (var edgeId in _this.edgesById) {
                    _this.edgesById[edgeId].render();
                }
                _this.dirty = _this.animationPercent < 1;
                _this.viewport.dirty = false;
                _this.app.render();
            }
            else if (_this.viewport.dirty) {
                _this.viewport.dirty = false;
                _this.app.render();
            }
        };
        this.debugRender = function () {
            var _a, _b, _c, _d;
            (_b = (_a = _this.debug) === null || _a === void 0 ? void 0 : _a.stats) === null || _b === void 0 ? void 0 : _b.update();
            var now = Date.now();
            // this.animationDuration += Math.min(16, Math.max(0, now - this.renderTime))
            _this.animationDuration += now - _this.renderTime;
            _this.animationPercent = Math.min(_this.animationDuration / POSITION_ANIMATION_DURATION, 1);
            _this.renderTime = now;
            if (_this.dirty) {
                performance.mark('update');
                for (var nodeId in _this.nodesById) {
                    _this.nodesById[nodeId].render();
                }
                for (var edgeId in _this.edgesById) {
                    _this.edgesById[edgeId].render();
                }
                performance.measure('update', 'update');
                _this.dirty = _this.animationPercent < 1;
                _this.viewport.dirty = false;
                performance.mark('render');
                _this.app.render();
                performance.measure('render', 'render');
            }
            else if (_this.viewport.dirty) {
                _this.viewport.dirty = false;
                performance.mark('render');
                _this.app.render();
                performance.measure('render', 'render');
            }
            var measurements = performance.getEntriesByType('measure');
            if (((_c = _this.debug) === null || _c === void 0 ? void 0 : _c.logPerformance) && measurements.length === 1) {
                var total = measurements[0].duration;
                console.log("%c" + total.toFixed(2) + "ms %c(update: 0.00, render: " + measurements[0].duration.toFixed(2) + ")", "color: " + (total < 17 ? '#6c6' : total < 25 ? '#f88' : total < 40 ? '#e22' : '#a00'), 'color: #666');
            }
            else if (((_d = _this.debug) === null || _d === void 0 ? void 0 : _d.logPerformance) && measurements.length === 2) {
                var total = measurements[0].duration + measurements[1].duration;
                console.log("%c" + total.toFixed(2) + "ms %c(" + measurements.map(function (_a) {
                    var name = _a.name, duration = _a.duration;
                    return name + ": " + duration.toFixed(2);
                }).join(', ') + "}", "color: " + (total < 17 ? '#6c6' : total < 25 ? '#f88' : total < 40 ? '#e22' : '#a00'), 'color: #666');
            }
            performance.clearMarks();
            performance.clearMeasures();
        };
        if (!(container instanceof HTMLCanvasElement)) {
            throw new Error('container must be an instance of HTMLCanvasElement');
        }
        this.debug = debug;
        this.app = new PIXI.Application({
            view: container,
            width: this.width,
            height: this.height,
            resolution: window.devicePixelRatio,
            transparent: true,
            antialias: true,
            autoDensity: true,
            autoStart: false,
            powerPreference: 'high-performance',
        });
        this.labelsLayer.interactiveChildren = false;
        this.nodesLayer.sortableChildren = true; // TODO - perf test
        this.viewport = new pixi_viewport_1.Viewport({
            interaction: this.app.renderer.plugins.interaction
        })
            .drag()
            .pinch()
            .wheel()
            .decelerate()
            .clampZoom({ minScale: 0.02, maxScale: 2.5 })
            .setZoom(0.6, true)
            .on('drag-start', function () { return container.style.cursor = 'move'; })
            .on('drag-end', function () { return container.style.cursor = 'auto'; });
        this.viewport.center = new PIXI.Point(0, 0);
        this.viewport.addChild(this.edgesLayer);
        this.viewport.addChild(this.nodesLayer);
        this.viewport.addChild(this.labelsLayer);
        this.viewport.addChild(this.frontNodeLayer);
        this.viewport.addChild(this.frontLabelLayer);
        this.app.stage.addChild(this.viewport);
        // this.nodesLayer.addChild(
        //   new PIXI.Graphics().lineStyle(1, 0x666666).moveTo(-10000, 0).lineTo(10000, 0).endFill(),
        //   new PIXI.Graphics().lineStyle(1, 0x666666).moveTo(0, -10000).lineTo(0, 10000).endFill()
        // )
        this.app.view.addEventListener('wheel', function (event) { event.preventDefault(); });
        utils_1.animationFrameLoop(this.debug ? this.debugRender : this.render);
    }
    return PIXIRenderer;
}());
exports.PIXIRenderer = PIXIRenderer;
exports.Renderer = function (options) {
    var pixiRenderer = new PIXIRenderer(options);
    var apply = function (graph) { return pixiRenderer.apply(graph); };
    apply.nodes = function () { return pixiRenderer.nodes; };
    apply.edges = function () { return pixiRenderer.edges; };
    return apply;
};
//# sourceMappingURL=index.js.map
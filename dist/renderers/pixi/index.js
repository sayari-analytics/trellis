"use strict";
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
exports.Renderer = exports.PIXIRenderer = exports.RENDERER_OPTIONS = void 0;
var PIXI = __importStar(require("pixi.js"));
var utils_1 = require("../../utils");
var node_1 = require("./node");
var edge_1 = require("./edge");
var edgeArrow_1 = require("./edgeArrow");
var circle_1 = require("./circle");
var drag_1 = require("./interaction/drag");
var decelerate_1 = require("./interaction/decelerate");
var zoom_1 = require("./interaction/zoom");
exports.RENDERER_OPTIONS = {
    width: 800, height: 600, x: 0, y: 0, zoom: 1, minZoom: 0.1, maxZoom: 2.5,
    nodesEqual: function () { return false; }, edgesEqual: function () { return false; },
    onNodePointerEnter: utils_1.noop, onNodePointerDown: utils_1.noop, onNodeDrag: utils_1.noop, onNodePointerUp: utils_1.noop, onNodePointerLeave: utils_1.noop, onNodeDoubleClick: utils_1.noop,
    onEdgePointerEnter: utils_1.noop, onEdgePointerDown: utils_1.noop, onEdgePointerUp: utils_1.noop, onEdgePointerLeave: utils_1.noop,
    onContainerPointerEnter: utils_1.noop, onContainerPointerDown: utils_1.noop, onContainerDrag: utils_1.noop,
    onContainerPointerMove: utils_1.noop, onContainerPointerUp: utils_1.noop, onContainerPointerLeave: utils_1.noop, onWheel: utils_1.noop
};
var POSITION_ANIMATION_DURATION = 800;
PIXI.utils.skipHello();
var PIXIRenderer = /** @class */ (function () {
    function PIXIRenderer(_a) {
        var _this = this;
        var container = _a.container, debug = _a.debug;
        this.dirty = false;
        this.viewportDirty = false;
        this.previousRenderTime = Date.now();
        this.animationDuration = 0;
        this.animationPercent = 0;
        this.edgesLayer = new PIXI.Container();
        this.nodesLayer = new PIXI.Container();
        this.labelsLayer = new PIXI.Container();
        this.frontNodeLayer = new PIXI.Container();
        this.frontLabelLayer = new PIXI.Container();
        this.edgesGraphic = new PIXI.Graphics();
        this.nodes = [];
        this.edges = [];
        this.nodesById = {};
        this.edgesById = {};
        this.edgeIndex = {};
        this.onContainerPointerEnter = utils_1.noop;
        this.onContainerPointerDown = utils_1.noop;
        this.onContainerDrag = utils_1.noop;
        this.onContainerPointerMove = utils_1.noop;
        this.onContainerPointerUp = utils_1.noop;
        this.onContainerPointerLeave = utils_1.noop;
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
        this.onWheel = utils_1.noop;
        this.width = exports.RENDERER_OPTIONS.width;
        this.height = exports.RENDERER_OPTIONS.height;
        this.zoom = exports.RENDERER_OPTIONS.zoom;
        this.minZoom = exports.RENDERER_OPTIONS.minZoom;
        this.maxZoom = exports.RENDERER_OPTIONS.maxZoom;
        this.x = exports.RENDERER_OPTIONS.x;
        this.y = exports.RENDERER_OPTIONS.y;
        this.root = new PIXI.Container();
        this._update = function (_a) {
            var e_1, _b, e_2, _c, e_3, _d;
            var _e, _f, _g, _h;
            var nodes = _a.nodes, edges = _a.edges, _j = _a.options, _k = _j === void 0 ? exports.RENDERER_OPTIONS : _j, _l = _k.width, width = _l === void 0 ? exports.RENDERER_OPTIONS.width : _l, _m = _k.height, height = _m === void 0 ? exports.RENDERER_OPTIONS.height : _m, _o = _k.x, x = _o === void 0 ? exports.RENDERER_OPTIONS.x : _o, _p = _k.y, y = _p === void 0 ? exports.RENDERER_OPTIONS.y : _p, _q = _k.zoom, zoom = _q === void 0 ? exports.RENDERER_OPTIONS.zoom : _q, _r = _k.minZoom, minZoom = _r === void 0 ? exports.RENDERER_OPTIONS.minZoom : _r, _s = _k.maxZoom, maxZoom = _s === void 0 ? exports.RENDERER_OPTIONS.maxZoom : _s, _t = _k.nodesEqual, nodesEqual = _t === void 0 ? exports.RENDERER_OPTIONS.nodesEqual : _t, _u = _k.edgesEqual, edgesEqual = _u === void 0 ? exports.RENDERER_OPTIONS.edgesEqual : _u, _v = _k.onNodePointerEnter, onNodePointerEnter = _v === void 0 ? utils_1.noop : _v, _w = _k.onNodePointerDown, onNodePointerDown = _w === void 0 ? utils_1.noop : _w, _x = _k.onNodeDrag, onNodeDrag = _x === void 0 ? utils_1.noop : _x, _y = _k.onNodePointerUp, onNodePointerUp = _y === void 0 ? utils_1.noop : _y, _z = _k.onNodePointerLeave, onNodePointerLeave = _z === void 0 ? utils_1.noop : _z, _0 = _k.onNodeDoubleClick, onNodeDoubleClick = _0 === void 0 ? utils_1.noop : _0, _1 = _k.onEdgePointerEnter, onEdgePointerEnter = _1 === void 0 ? utils_1.noop : _1, _2 = _k.onEdgePointerDown, onEdgePointerDown = _2 === void 0 ? utils_1.noop : _2, _3 = _k.onEdgePointerUp, onEdgePointerUp = _3 === void 0 ? utils_1.noop : _3, _4 = _k.onEdgePointerLeave, onEdgePointerLeave = _4 === void 0 ? utils_1.noop : _4, _5 = _k.onContainerPointerEnter, onContainerPointerEnter = _5 === void 0 ? utils_1.noop : _5, _6 = _k.onContainerPointerDown, onContainerPointerDown = _6 === void 0 ? utils_1.noop : _6, _7 = _k.onContainerDrag, onContainerDrag = _7 === void 0 ? utils_1.noop : _7, _8 = _k.onContainerPointerMove, onContainerPointerMove = _8 === void 0 ? utils_1.noop : _8, _9 = _k.onContainerPointerUp, onContainerPointerUp = _9 === void 0 ? utils_1.noop : _9, _10 = _k.onContainerPointerLeave, onContainerPointerLeave = _10 === void 0 ? utils_1.noop : _10, _11 = _k.onWheel, onWheel = _11 === void 0 ? utils_1.noop : _11;
            _this.onContainerPointerEnter = onContainerPointerEnter;
            _this.onContainerPointerDown = onContainerPointerDown;
            _this.onContainerDrag = onContainerDrag;
            _this.onContainerPointerMove = onContainerPointerMove;
            _this.onContainerPointerUp = onContainerPointerUp;
            _this.onContainerPointerLeave = onContainerPointerLeave;
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
            _this.onWheel = onWheel;
            _this.zoomInteraction.minZoom = minZoom;
            _this.zoomInteraction.maxZoom = maxZoom;
            if (width !== _this.width || height !== _this.height) {
                _this.width = width;
                _this.height = height;
                _this.root.pivot.x = _this.width / zoom / -2;
                _this.root.pivot.y = _this.height / zoom / -2;
                _this.app.renderer.resize(_this.width, _this.height);
                _this.viewportDirty = true;
            }
            if (x !== _this.x) {
                _this.x = _this.root.x = x;
                _this.viewportDirty = true;
            }
            if (y !== _this.y) {
                _this.y = _this.root.y = y;
                _this.viewportDirty = true;
            }
            if (zoom !== _this.zoom) {
                _this.zoom = zoom;
                _this.root.pivot.x = (_this.width / zoom) / -2;
                _this.root.pivot.y = (_this.height / zoom) / -2;
                _this.root.scale.set(zoom); // TODO - interpolate zoom
                _this.viewportDirty = true;
            }
            var edgesAreEqual = edgesEqual(_this.edges, edges);
            var nodesAreEqual = nodesEqual(_this.nodes, nodes);
            /**
             * Build edge indices
             */
            if (!edgesAreEqual) {
                try {
                    for (var edges_1 = __values(edges), edges_1_1 = edges_1.next(); !edges_1_1.done; edges_1_1 = edges_1.next()) {
                        var edge = edges_1_1.value;
                        if (_this.edgeIndex[edge.source] === undefined) {
                            _this.edgeIndex[edge.source] = {};
                        }
                        if (_this.edgeIndex[edge.target] === undefined) {
                            _this.edgeIndex[edge.target] = {};
                        }
                        if (_this.edgeIndex[edge.source][edge.target] === undefined) {
                            _this.edgeIndex[edge.source][edge.target] = new Set();
                        }
                        if (_this.edgeIndex[edge.target][edge.source] === undefined) {
                            _this.edgeIndex[edge.target][edge.source] = new Set();
                        }
                        _this.edgeIndex[edge.source][edge.target].add(edge.id);
                        _this.edgeIndex[edge.target][edge.source].add(edge.id);
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
            if (!nodesAreEqual) {
                _this.nodes = nodes;
                var nodesById = {};
                try {
                    for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                        var node = nodes_1_1.value;
                        if (_this.nodesById[node.id] === undefined) {
                            // node enter
                            var adjacentNode = void 0;
                            if (_this.edgeIndex[node.id]) {
                                // nodes w edges from existing positioned nodes enter from one of those nodes
                                adjacentNode = Object.keys(_this.edgeIndex[node.id]).find(function (adjacentNodeId) {
                                    var _a, _b;
                                    return (((_a = _this.nodesById[adjacentNodeId]) === null || _a === void 0 ? void 0 : _a.node.x) !== undefined && ((_b = _this.nodesById[adjacentNodeId]) === null || _b === void 0 ? void 0 : _b.node.y) !== undefined);
                                });
                            }
                            nodesById[node.id] = new node_1.NodeRenderer(_this, node, (_f = (_e = _this.nodesById[adjacentNode !== null && adjacentNode !== void 0 ? adjacentNode : '']) === null || _e === void 0 ? void 0 : _e.x) !== null && _f !== void 0 ? _f : 0, (_h = (_g = _this.nodesById[adjacentNode !== null && adjacentNode !== void 0 ? adjacentNode : '']) === null || _g === void 0 ? void 0 : _g.y) !== null && _h !== void 0 ? _h : 0, node.radius);
                            /**
                             * alternatively, don't animate entering nodes
                             */
                            // nodesById[node.id] = new NodeRenderer(this, node, this.nodesById[adjacentNode]?.x ?? node.x ?? 0, this.nodesById[adjacentNode]?.y ?? node.y ?? 0, node.radius)
                        }
                        else {
                            nodesById[node.id] = _this.nodesById[node.id].update(node);
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
                        _this.nodesById[nodeId].delete();
                    }
                }
                _this.animationDuration = 0;
                _this.nodesById = nodesById;
                _this.dirty = true;
            }
            /**
             * Edge enter/update/exit
             */
            if (!edgesAreEqual) {
                _this.edges = edges;
                var edgesById = {};
                try {
                    for (var edges_2 = __values(edges), edges_2_1 = edges_2.next(); !edges_2_1.done; edges_2_1 = edges_2.next()) {
                        var edge = edges_2_1.value;
                        var id = edge.id;
                        if (_this.edgesById[id] === undefined) {
                            // edge enter
                            edgesById[id] = new edge_1.EdgeRenderer(_this, edge, _this.edgesLayer);
                        }
                        else {
                            // edge update
                            edgesById[id] = _this.edgesById[id].update(edge);
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
                        _this.edgesById[edgeId].delete();
                    }
                }
                _this.edgesById = edgesById;
                _this.dirty = true;
            }
            return _this;
        };
        this._debugUpdate = function (graph) {
            performance.mark('update');
            _this._update(graph);
            performance.measure('update', 'update');
        };
        this.render = function () {
            var currentRenderTime = Date.now();
            var elapsedRenderTime = currentRenderTime - _this.previousRenderTime;
            _this.animationDuration += Math.min(16, Math.max(0, elapsedRenderTime)); // clamp to 0 <= x <= 16 to smooth animations
            // this.animationDuration += elapsedRenderTime
            _this.animationPercent = Math.min(_this.animationDuration / POSITION_ANIMATION_DURATION, 1);
            _this.previousRenderTime = currentRenderTime;
            _this.decelerateInteraction.update(elapsedRenderTime);
            if (_this.dirty) {
                for (var nodeId in _this.nodesById) {
                    _this.nodesById[nodeId].render();
                }
                _this.edgesGraphic.clear();
                for (var edgeId in _this.edgesById) {
                    _this.edgesById[edgeId].render();
                }
                _this.dirty = _this.animationPercent < 1;
                _this.app.render();
            }
            else if (_this.viewportDirty) {
                _this.app.render();
                _this.viewportDirty = false;
            }
        };
        this._debugFirstRender = true;
        this.debugRender = function () {
            var e_4, _a;
            var _b, _c, _d;
            var currentRenderTime = Date.now();
            var elapsedRenderTime = currentRenderTime - _this.previousRenderTime;
            _this.animationDuration += Math.min(16, Math.max(0, elapsedRenderTime));
            // this.animationDuration += elapsedRenderTime
            _this.animationPercent = Math.min(_this.animationDuration / POSITION_ANIMATION_DURATION, 1);
            _this.previousRenderTime = currentRenderTime;
            _this.decelerateInteraction.update(elapsedRenderTime);
            (_c = (_b = _this.debug) === null || _b === void 0 ? void 0 : _b.stats) === null || _c === void 0 ? void 0 : _c.update();
            if (!_this._debugFirstRender) {
                performance.measure('external', 'external');
            }
            else {
                _this._debugFirstRender = false;
            }
            if (_this.dirty) {
                performance.mark('render');
                for (var nodeId in _this.nodesById) {
                    _this.nodesById[nodeId].render();
                }
                _this.edgesGraphic.clear();
                for (var edgeId in _this.edgesById) {
                    _this.edgesById[edgeId].render();
                }
                performance.measure('render', 'render');
                _this.dirty = _this.animationPercent < 1;
                performance.mark('draw');
                _this.app.render();
                performance.measure('draw', 'draw');
            }
            else if (_this.viewportDirty) {
                performance.mark('draw');
                _this.app.render();
                performance.measure('draw', 'draw');
            }
            if (((_d = _this.debug) === null || _d === void 0 ? void 0 : _d.logPerformance) && (_this.dirty || _this.viewportDirty)) {
                var external_1 = 0;
                var update = 0;
                var render = 0;
                var draw = 0;
                var total = 0;
                try {
                    for (var _e = __values(performance.getEntriesByType('measure')), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var measurement = _f.value;
                        if (measurement.name === 'update') {
                            update = measurement.duration;
                            total += measurement.duration;
                        }
                        else if (measurement.name === 'render') {
                            render = measurement.duration;
                            total += measurement.duration;
                        }
                        else if (measurement.name === 'draw') {
                            draw = measurement.duration;
                            total += measurement.duration;
                        }
                        else if (measurement.name === 'external') {
                            external_1 = measurement.duration;
                            total += measurement.duration;
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                // green: 50+ frames/sec, pink: 30 frames/sec, red: 20 frames/sec
                console.log("%c" + total.toFixed(1) + "ms%c (update: %c" + update.toFixed(1) + "%c, render: %c" + render.toFixed(1) + "%c, draw: %c" + draw.toFixed(1) + "%c, external: %c" + external_1.toFixed(1) + "%c)", "color: " + (total <= 20 ? '#6c6' : total <= 33 ? '#f88' : total <= 50 ? '#e22' : '#a00'), 'color: #666', "color: " + (update <= 5 ? '#6c6' : update <= 10 ? '#f88' : update <= 20 ? '#e22' : '#a00'), 'color: #666', "color: " + (render <= 5 ? '#6c6' : render <= 10 ? '#f88' : render <= 20 ? '#e22' : '#a00'), 'color: #666', "color: " + (draw <= 5 ? '#6c6' : draw <= 10 ? '#f88' : draw <= 20 ? '#e22' : '#a00'), 'color: #666', "color: " + (external_1 <= 5 ? '#6c6' : external_1 <= 10 ? '#f88' : external_1 <= 20 ? '#e22' : '#a00'), 'color: #666');
            }
            _this.viewportDirty = false;
            performance.clearMarks();
            performance.clearMeasures();
            performance.mark('external');
        };
        this.delete = function () {
            _this.app.destroy(true, { children: true, texture: true, baseTexture: true });
            _this.circle.delete();
            _this.arrow.delete();
        };
        if (!(container instanceof HTMLDivElement)) {
            throw new Error('container must be an instance of HTMLDivElement');
        }
        var view = document.createElement('canvas');
        container.appendChild(view);
        container.style.position = 'relative';
        this.app = new PIXI.Application({
            view: view,
            width: this.width,
            height: this.height,
            resolution: 2,
            transparent: true,
            antialias: true,
            autoDensity: true,
            autoStart: false,
            powerPreference: 'high-performance',
        });
        this.labelsLayer.interactiveChildren = false;
        this.nodesLayer.sortableChildren = true; // TODO - perf test
        this.root.pivot.x = this.width / this.zoom / -2;
        this.root.pivot.y = this.height / this.zoom / -2;
        this.app.stage.addChild(this.root);
        this.root.addChild(this.edgesGraphic);
        this.root.addChild(this.edgesLayer);
        this.root.addChild(this.nodesLayer);
        this.root.addChild(this.labelsLayer);
        this.root.addChild(this.frontNodeLayer);
        this.root.addChild(this.frontLabelLayer);
        this.arrow = new edgeArrow_1.ArrowRenderer(this);
        this.circle = new circle_1.CircleRenderer(this);
        this.zoomInteraction = new zoom_1.Zoom(this, function (e, x, y, zoom) { return _this.onWheel(e, x, y, zoom); });
        this.app.view.addEventListener('wheel', this.zoomInteraction.wheel);
        this.dragInteraction = new drag_1.Drag(this, function (e, x, y) { return _this.onContainerDrag(e, x, y); });
        this.app.renderer.plugins.interaction.on('pointerdown', this.dragInteraction.down);
        this.app.renderer.plugins.interaction.on('pointermove', this.dragInteraction.move);
        this.app.renderer.plugins.interaction.on('pointerup', this.dragInteraction.up);
        this.app.renderer.plugins.interaction.on('pointerupoutside', this.dragInteraction.up);
        this.app.renderer.plugins.interaction.on('pointercancel', this.dragInteraction.up);
        this.app.renderer.plugins.interaction.on('pointerout', this.dragInteraction.up);
        this.decelerateInteraction = new decelerate_1.Decelerate(this, function (x, y) { return _this.onContainerDrag(undefined, x, y); });
        this.app.renderer.plugins.interaction.on('pointerdown', this.decelerateInteraction.down);
        this.app.renderer.plugins.interaction.on('pointermove', this.decelerateInteraction.move);
        this.app.renderer.plugins.interaction.on('pointerup', this.decelerateInteraction.up);
        this.app.renderer.plugins.interaction.on('pointerupoutside', this.decelerateInteraction.up);
        this.app.renderer.plugins.interaction.on('pointercancel', this.decelerateInteraction.up);
        this.app.renderer.plugins.interaction.on('pointerout', this.decelerateInteraction.up);
        this.app.view.onpointerenter = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && _this.onContainerPointerEnter(e); };
        this.app.view.onpointerdown = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && _this.onContainerPointerDown(e); };
        this.app.view.onpointermove = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && _this.onContainerPointerMove(e); };
        this.app.view.onpointerup = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && _this.onContainerPointerUp(e); };
        this.app.view.onpointerleave = function (e) { return _this.hoveredNode === undefined && _this.clickedNode === undefined && _this.onContainerPointerLeave(e); };
        this.debug = debug;
        if (this.debug) {
            utils_1.animationFrameLoop(this.debugRender);
            this.update = this._debugUpdate;
        }
        else {
            utils_1.animationFrameLoop(this.render);
            this.update = this._update;
        }
    }
    return PIXIRenderer;
}());
exports.PIXIRenderer = PIXIRenderer;
exports.Renderer = function (options) {
    var pixiRenderer = new PIXIRenderer(options);
    var render = function (graph) {
        pixiRenderer.update(graph);
    };
    render.delete = pixiRenderer.delete;
    return render;
};
//# sourceMappingURL=index.js.map
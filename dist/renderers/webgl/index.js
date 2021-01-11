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
exports.Renderer = exports.InternalRenderer = exports.RENDERER_OPTIONS = void 0;
var PIXI = __importStar(require("pixi.js-legacy"));
var unsafe_eval_1 = require("@pixi/unsafe-eval");
var utils_1 = require("../../utils");
var node_1 = require("./node");
var edge_1 = require("./edge");
var drag_1 = require("./interaction/drag");
var decelerate_1 = require("./interaction/decelerate");
var zoom_1 = require("./interaction/zoom");
var arrowSprite_1 = require("./sprites/arrowSprite");
var circleSprite_1 = require("./sprites/circleSprite");
var ImageSprite_1 = require("./sprites/ImageSprite");
var FontIconSprite_1 = require("./sprites/FontIconSprite");
var Loader_1 = require("./Loader");
var circle_1 = require("./annotations/circle");
var utils_2 = require("./utils");
var rectangle_1 = require("./annotations/rectangle");
unsafe_eval_1.install(PIXI);
exports.RENDERER_OPTIONS = {
    width: 800, height: 600, x: 0, y: 0, zoom: 1, minZoom: 0.1, maxZoom: 2.5,
    animateViewportPosition: 600, animateViewportZoom: 600, animateNodePosition: 800, animateNodeRadius: 800, dragInertia: 0.88,
    nodesEqual: function () { return false; }, edgesEqual: function () { return false; }, nodeIsEqual: function () { return false; }, edgeIsEqual: function () { return false; },
};
PIXI.utils.skipHello();
var InternalRenderer = /** @class */ (function () {
    function InternalRenderer(options) {
        var _this = this;
        this.width = exports.RENDERER_OPTIONS.width;
        this.height = exports.RENDERER_OPTIONS.height;
        this.minZoom = exports.RENDERER_OPTIONS.minZoom;
        this.maxZoom = exports.RENDERER_OPTIONS.maxZoom;
        this.x = exports.RENDERER_OPTIONS.x;
        this.y = exports.RENDERER_OPTIONS.y;
        this.zoom = exports.RENDERER_OPTIONS.zoom;
        this.animateViewportPosition = exports.RENDERER_OPTIONS.animateViewportPosition;
        this.animateViewportZoom = exports.RENDERER_OPTIONS.animateViewportZoom;
        this.animateNodePosition = exports.RENDERER_OPTIONS.animateNodePosition;
        this.animateNodeRadius = exports.RENDERER_OPTIONS.animateNodeRadius;
        this.dragInertia = exports.RENDERER_OPTIONS.dragInertia;
        this.dragging = false;
        this.dirty = false;
        this.viewportDirty = false;
        this.time = performance.now();
        this.annotationsBottomLayer = new PIXI.Container();
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
        this.annotationsById = {};
        this.edgeIndex = {};
        this.root = new PIXI.Container();
        this.fontLoader = Loader_1.FontLoader();
        this.imageLoader = Loader_1.ImageLoader();
        this.altKey = false;
        this.ctrlKey = false;
        this.metaKey = false;
        this.shiftKey = false;
        this.clickedContainer = false;
        this.previousTime = performance.now();
        this.targetX = exports.RENDERER_OPTIONS.x;
        this.targetY = exports.RENDERER_OPTIONS.y;
        this.targetZoom = exports.RENDERER_OPTIONS.zoom;
        this.firstRender = true;
        this.doubleClick = false;
        this.onKeyDown = function (_a) {
            var altKey = _a.altKey, ctrlKey = _a.ctrlKey, metaKey = _a.metaKey, shiftKey = _a.shiftKey;
            _this.altKey = altKey;
            _this.ctrlKey = ctrlKey;
            _this.metaKey = metaKey;
            _this.shiftKey = shiftKey;
        };
        this.onKeyUp = function () {
            _this.altKey = false;
            _this.ctrlKey = false;
            _this.metaKey = false;
            _this.shiftKey = false;
        };
        this._update = function (_a) {
            var e_1, _b, e_2, _c, e_3, _d, e_4, _e;
            var _f, _g, _h, _j, _k;
            var nodes = _a.nodes, edges = _a.edges, _l = _a.options, _m = _l === void 0 ? exports.RENDERER_OPTIONS : _l, _o = _m.width, width = _o === void 0 ? exports.RENDERER_OPTIONS.width : _o, _p = _m.height, height = _p === void 0 ? exports.RENDERER_OPTIONS.height : _p, _q = _m.x, x = _q === void 0 ? exports.RENDERER_OPTIONS.x : _q, _r = _m.y, y = _r === void 0 ? exports.RENDERER_OPTIONS.y : _r, _s = _m.zoom, zoom = _s === void 0 ? exports.RENDERER_OPTIONS.zoom : _s, _t = _m.minZoom, minZoom = _t === void 0 ? exports.RENDERER_OPTIONS.minZoom : _t, _u = _m.maxZoom, maxZoom = _u === void 0 ? exports.RENDERER_OPTIONS.maxZoom : _u, cursor = _m.cursor, _v = _m.animateNodePosition, animateNodePosition = _v === void 0 ? exports.RENDERER_OPTIONS.animateNodePosition : _v, _w = _m.animateNodeRadius, animateNodeRadius = _w === void 0 ? exports.RENDERER_OPTIONS.animateNodeRadius : _w, _x = _m.animateViewportPosition, animateViewportPosition = _x === void 0 ? exports.RENDERER_OPTIONS.animateViewportPosition : _x, _y = _m.animateViewportZoom, animateViewportZoom = _y === void 0 ? exports.RENDERER_OPTIONS.animateViewportZoom : _y, _z = _m.dragInertia, dragInertia = _z === void 0 ? exports.RENDERER_OPTIONS.dragInertia : _z, _0 = _m.nodesEqual, nodesEqual = _0 === void 0 ? exports.RENDERER_OPTIONS.nodesEqual : _0, _1 = _m.edgesEqual, edgesEqual = _1 === void 0 ? exports.RENDERER_OPTIONS.edgesEqual : _1, _2 = _m.nodeIsEqual, nodeIsEqual = _2 === void 0 ? exports.RENDERER_OPTIONS.nodeIsEqual : _2, _3 = _m.edgeIsEqual, edgeIsEqual = _3 === void 0 ? exports.RENDERER_OPTIONS.edgeIsEqual : _3, onNodePointerEnter = _m.onNodePointerEnter, onNodePointerDown = _m.onNodePointerDown, onNodeDragStart = _m.onNodeDragStart, onNodeDrag = _m.onNodeDrag, onNodeDragEnd = _m.onNodeDragEnd, onNodePointerUp = _m.onNodePointerUp, onNodeClick = _m.onNodeClick, onNodeDoubleClick = _m.onNodeDoubleClick, onNodePointerLeave = _m.onNodePointerLeave, onEdgePointerEnter = _m.onEdgePointerEnter, onEdgePointerDown = _m.onEdgePointerDown, onEdgePointerUp = _m.onEdgePointerUp, onEdgeClick = _m.onEdgeClick, onEdgeDoubleClick = _m.onEdgeDoubleClick, onEdgePointerLeave = _m.onEdgePointerLeave, onViewportPointerEnter = _m.onViewportPointerEnter, onViewportPointerDown = _m.onViewportPointerDown, onViewportDragStart = _m.onViewportDragStart, onViewportDrag = _m.onViewportDrag, onViewportDragEnd = _m.onViewportDragEnd, onViewportPointerMove = _m.onViewportPointerMove, onViewportPointerUp = _m.onViewportPointerUp, onViewportClick = _m.onViewportClick, onViewportDoubleClick = _m.onViewportDoubleClick, onViewportPointerLeave = _m.onViewportPointerLeave, onViewportWheel = _m.onViewportWheel, annotations = _a.annotations;
            _this.onNodePointerEnter = onNodePointerEnter;
            _this.onNodePointerDown = onNodePointerDown;
            _this.onNodeDragStart = onNodeDragStart;
            _this.onNodeDrag = onNodeDrag;
            _this.onNodeDragEnd = onNodeDragEnd;
            _this.onNodePointerUp = onNodePointerUp;
            _this.onNodeClick = onNodeClick;
            _this.onNodeDoubleClick = onNodeDoubleClick;
            _this.onNodePointerLeave = onNodePointerLeave;
            _this.onEdgePointerEnter = onEdgePointerEnter;
            _this.onEdgePointerDown = onEdgePointerDown;
            _this.onEdgePointerUp = onEdgePointerUp;
            _this.onEdgeClick = onEdgeClick;
            _this.onEdgeDoubleClick = onEdgeDoubleClick;
            _this.onEdgePointerLeave = onEdgePointerLeave;
            _this.onViewportPointerEnter = onViewportPointerEnter;
            _this.onViewportPointerDown = onViewportPointerDown;
            _this.onViewportDragStart = onViewportDragStart;
            _this.onViewportDrag = onViewportDrag;
            _this.onViewportDragEnd = onViewportDragEnd;
            _this.onViewportPointerMove = onViewportPointerMove;
            _this.onViewportClick = onViewportClick;
            _this.onViewportDoubleClick = onViewportDoubleClick;
            _this.onViewportPointerUp = onViewportPointerUp;
            _this.onViewportPointerLeave = onViewportPointerLeave;
            _this.onViewportWheel = onViewportWheel;
            _this.animateViewportPosition = animateViewportPosition === true ? exports.RENDERER_OPTIONS.animateViewportPosition : animateViewportPosition;
            _this.animateViewportZoom = animateViewportZoom === true ? exports.RENDERER_OPTIONS.animateViewportZoom : animateViewportZoom;
            _this.animateNodePosition = animateNodePosition === true ? exports.RENDERER_OPTIONS.animateNodePosition : animateNodePosition;
            _this.animateNodeRadius = animateNodeRadius === true ? exports.RENDERER_OPTIONS.animateNodeRadius : animateNodeRadius;
            _this.dragInertia = dragInertia;
            _this.minZoom = minZoom;
            _this.maxZoom = maxZoom;
            if (cursor !== undefined) {
                _this.container.style.cursor = cursor;
            }
            if (width !== _this.width || height !== _this.height) {
                _this.width = width;
                _this.height = height;
                _this.app.renderer.resize(_this.width, _this.height);
                _this.viewportDirty = true;
            }
            if (zoom !== _this.targetZoom) {
                if (zoom === _this.expectedViewportZoom || !_this.animateViewportZoom || _this.firstRender) {
                    _this.interpolateZoom = undefined;
                    _this.zoom = zoom;
                    _this.root.scale.set(Math.max(_this.minZoom, Math.min(_this.maxZoom, _this.zoom)));
                }
                else {
                    _this.interpolateZoom = utils_1.interpolate(_this.zoom, zoom, _this.animateViewportZoom, _this.time);
                }
                _this.expectedViewportZoom = undefined;
                _this.targetZoom = zoom;
                _this.viewportDirty = true;
            }
            if (x !== _this.targetX) {
                if (x === _this.expectedViewportXPosition || !_this.animateViewportPosition || _this.firstRender) {
                    _this.interpolateX = undefined;
                    _this.x = x;
                }
                else {
                    _this.interpolateX = utils_1.interpolate(_this.x, x, _this.animateViewportPosition, _this.time);
                }
                _this.expectedViewportXPosition = undefined;
                _this.targetX = x;
                _this.viewportDirty = true;
            }
            if (y !== _this.targetY) {
                if (y === _this.expectedViewportYPosition || !_this.animateViewportPosition || _this.firstRender) {
                    _this.interpolateY = undefined;
                    _this.y = y;
                }
                else {
                    _this.interpolateY = utils_1.interpolate(_this.y, y, _this.animateViewportPosition, _this.time);
                }
                _this.expectedViewportYPosition = undefined;
                _this.targetY = y;
                _this.viewportDirty = true;
            }
            _this.root.x = (_this.x * _this.zoom) + (_this.width / 2);
            _this.root.y = (_this.y * _this.zoom) + (_this.height / 2);
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
             * Node enter/update/exit
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
                            nodesById[node.id] = new node_1.NodeRenderer(_this, node, (_g = (_f = _this.nodesById[adjacentNode !== null && adjacentNode !== void 0 ? adjacentNode : '']) === null || _f === void 0 ? void 0 : _f.x) !== null && _g !== void 0 ? _g : 0, (_j = (_h = _this.nodesById[adjacentNode !== null && adjacentNode !== void 0 ? adjacentNode : '']) === null || _h === void 0 ? void 0 : _h.y) !== null && _j !== void 0 ? _j : 0, node.radius);
                            _this.dirty = true;
                        }
                        else if (!nodeIsEqual(_this.nodesById[node.id].node, node)) {
                            // node update
                            nodesById[node.id] = _this.nodesById[node.id].update(node);
                            _this.dirty = true;
                        }
                        else {
                            nodesById[node.id] = _this.nodesById[node.id];
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
                        _this.dirty = true;
                    }
                }
                _this.nodesById = nodesById;
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
                        if (_this.edgesById[edge.id] === undefined) {
                            // edge enter
                            edgesById[edge.id] = new edge_1.EdgeRenderer(_this, edge);
                            _this.dirty = true;
                        }
                        else if (!edgeIsEqual(_this.edgesById[edge.id].edge, edge)) {
                            // edge update
                            edgesById[edge.id] = _this.edgesById[edge.id].update(edge);
                            _this.dirty = true;
                        }
                        else {
                            edgesById[edge.id] = _this.edgesById[edge.id];
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
                        _this.dirty = true;
                    }
                }
                _this.edgesById = edgesById;
            }
            /**
             * Annotation enter/update/exit
             */
            _this.annotations = annotations;
            var annotationsById = {};
            try {
                for (var _4 = __values((_k = _this.annotations) !== null && _k !== void 0 ? _k : []), _5 = _4.next(); !_5.done; _5 = _4.next()) {
                    var annotation = _5.value;
                    var id = "" + annotation.type + annotation.id;
                    if (_this.annotationsById[id] === undefined) {
                        // annotation enter
                        if (annotation.type === 'circle') {
                            annotationsById[id] = new circle_1.CircleAnnotationRenderer(_this, annotation);
                        }
                        else if (annotation.type === 'rectangle') {
                            annotationsById[id] = new rectangle_1.RectangleAnnotationRenderer(_this, annotation);
                        }
                        _this.dirty = true;
                    }
                    else {
                        // annotation update
                        if (annotation.type === 'circle') {
                            annotationsById[id] = _this.annotationsById[id].update(annotation);
                        }
                        else if (annotation.type === 'rectangle') {
                            annotationsById[id] = _this.annotationsById[id].update(annotation);
                        }
                        _this.dirty = true;
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_5 && !_5.done && (_e = _4.return)) _e.call(_4);
                }
                finally { if (e_4) throw e_4.error; }
            }
            for (var annotationId in _this.annotationsById) {
                if (annotationsById[annotationId] === undefined) {
                    // annotation exit
                    _this.annotationsById[annotationId].delete();
                    _this.dirty = true;
                }
            }
            _this.annotationsById = annotationsById;
            // this.root.getChildByName('bbox')?.destroy()
            // const bounds = Graph.getSelectionBounds(this.nodes, 0)
            // const bbox = new PIXI.Graphics()
            //   .lineStyle(1, 0xff0000, 0.5)
            //   .drawPolygon(new PIXI.Polygon([bounds.left, bounds.top, bounds.right, bounds.top, bounds.right, bounds.bottom, bounds.left, bounds.bottom]))
            // bbox.name = 'bbox'
            // this.root.addChild(bbox)
            // this.root.getChildByName('bboxCenter')?.destroy()
            // const viewport = Graph.boundsToViewport(bounds, { width: this.width, height: this.height })
            // const bboxCenter = new PIXI.Graphics().lineStyle(2, 0xff0000, 0.5).drawCircle(-viewport.x, -viewport.y, 5)
            // bboxCenter.name = 'bboxCenter'
            // this.root.addChild(bboxCenter)
            // this.root.getChildByName('origin')?.destroy()
            // const origin = new PIXI.Graphics().lineStyle(6, 0x000000, 1).drawCircle(0, 0, 3)
            // origin.name = 'origin'
            // this.root.addChild(origin)
            // this.root.getChildByName('screenCenter')?.destroy()
            // const screenCenter = new PIXI.Graphics().lineStyle(2, 0x0000ff, 0.5).drawCircle(-this.x, -this.y, 10)
            // screenCenter.name = 'screenCenter'
            // this.root.addChild(screenCenter)
            // this.root.getChildByName('viewportBbox')?.destroy()
            // const viewPortBounds = Graph.viewportToBounds({ x: this.x, y: this.y, zoom: this.zoom }, { width: this.width, height: this.height })
            // const viewportBbox = new PIXI.Graphics()
            //   .lineStyle(4, 0xff00ff, 0.5)
            //   .drawPolygon(new PIXI.Polygon([viewPortBounds.left, viewPortBounds.top, viewPortBounds.right, viewPortBounds.top, viewPortBounds.right, viewPortBounds.bottom, viewPortBounds.left, viewPortBounds.bottom]))
            // viewportBbox.name = 'viewportBbox'
            // this.root.addChild(viewportBbox)
            _this.firstRender = false;
            return _this;
        };
        this.render = function (time) {
            _this.time = time;
            var elapsedTime = _this.time - _this.previousTime;
            _this.previousTime = _this.time;
            _this.decelerateInteraction.update(elapsedTime);
            if (_this.interpolateZoom) {
                var _a = _this.interpolateZoom(_this.time), value = _a.value, done = _a.done;
                _this.zoom = value;
                _this.root.scale.set(Math.max(_this.minZoom, Math.min(_this.maxZoom, _this.zoom)));
                if (done) {
                    _this.interpolateZoom = undefined;
                }
                _this.viewportDirty = true;
            }
            if (_this.interpolateX) {
                var _b = _this.interpolateX(_this.time), value = _b.value, done = _b.done;
                _this.x = value;
                if (done) {
                    _this.interpolateX = undefined;
                }
                _this.viewportDirty = true;
            }
            if (_this.interpolateY) {
                var _c = _this.interpolateY(_this.time), value = _c.value, done = _c.done;
                _this.y = value;
                if (done) {
                    _this.interpolateY = undefined;
                }
                _this.viewportDirty = true;
            }
            var dirty = false;
            if (_this.dirty) {
                for (var nodeId in _this.nodesById) {
                    if (_this.nodesById[nodeId].dirty) {
                        _this.nodesById[nodeId].render();
                        dirty = dirty || _this.nodesById[nodeId].dirty;
                    }
                }
                _this.edgesGraphic.clear();
                for (var edgeId in _this.edgesById) {
                    /**
                     * TODO - only render dirty edges [this is a harder thing to check than a node's dirty status]
                     * an edge is dirty if:
                     * - it has been added/updated
                     * - any multiedge (edge that shares source/target) has been added/updated/deleted
                     * - the position or radius of its source/target node has been updated
                     * additionally, the way edges are drawn will need to change:
                     * rather than clearing all edges via `this.edgesGraphic.clear()` and rerendering each,
                     * each edge might need to be its own PIXI.Graphics object
                     */
                    _this.edgesById[edgeId].render();
                }
            }
            if (_this.viewportDirty || _this.dirty) {
                _this.root.x = (_this.x * _this.zoom) + (_this.width / 2);
                _this.root.y = (_this.y * _this.zoom) + (_this.height / 2);
                _this.app.render();
            }
            _this.viewportDirty = false;
            _this.dirty = dirty;
        };
        this._debugUpdate = function (graph) {
            if (_this._measurePerformance) {
                performance.measure('external', 'external');
            }
            performance.mark('update');
            _this._update(graph);
            performance.measure('update', 'update');
        };
        this.debugRender = function (time) {
            var e_5, _a;
            var _b, _c, _d;
            (_c = (_b = _this.debug) === null || _b === void 0 ? void 0 : _b.stats) === null || _c === void 0 ? void 0 : _c.update();
            _this.time = time;
            var elapsedTime = _this.time - _this.previousTime;
            _this.previousTime = _this.time;
            _this.decelerateInteraction.update(elapsedTime);
            if (_this.interpolateZoom) {
                var _e = _this.interpolateZoom(_this.time), value = _e.value, done = _e.done;
                _this.zoom = value;
                _this.root.scale.set(Math.max(_this.minZoom, Math.min(_this.maxZoom, _this.zoom)));
                if (done) {
                    _this.interpolateZoom = undefined;
                }
                _this.viewportDirty = true;
            }
            if (_this.interpolateX) {
                var _f = _this.interpolateX(_this.time), value = _f.value, done = _f.done;
                _this.x = value;
                if (done) {
                    _this.interpolateX = undefined;
                }
                _this.viewportDirty = true;
            }
            if (_this.interpolateY) {
                var _g = _this.interpolateY(_this.time), value = _g.value, done = _g.done;
                _this.y = value;
                if (done) {
                    _this.interpolateY = undefined;
                }
                _this.viewportDirty = true;
            }
            var dirty = false;
            if (_this.dirty) {
                performance.mark('render');
                for (var nodeId in _this.nodesById) {
                    if (_this.nodesById[nodeId].dirty) {
                        _this.nodesById[nodeId].render();
                        dirty = dirty || _this.nodesById[nodeId].dirty;
                    }
                }
                _this.edgesGraphic.clear();
                for (var edgeId in _this.edgesById) {
                    _this.edgesById[edgeId].render();
                }
                performance.measure('render', 'render');
            }
            if (_this.viewportDirty || _this.dirty) {
                performance.mark('draw');
                _this.root.x = (_this.x * _this.zoom) + (_this.width / 2);
                _this.root.y = (_this.y * _this.zoom) + (_this.height / 2);
                _this.app.render();
                performance.measure('draw', 'draw');
            }
            if (_this._measurePerformance) {
                performance.measure('total', 'total');
            }
            if (((_d = _this.debug) === null || _d === void 0 ? void 0 : _d.logPerformance) && (_this.dirty || _this.viewportDirty)) {
                var external_1 = 0;
                var update = 0;
                var render = 0;
                var draw = 0;
                var total = 0;
                try {
                    for (var _h = __values(performance.getEntriesByType('measure')), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var measurement = _j.value;
                        if (measurement.name === 'update') {
                            update = measurement.duration;
                        }
                        else if (measurement.name === 'render') {
                            render = measurement.duration;
                        }
                        else if (measurement.name === 'draw') {
                            draw = measurement.duration;
                        }
                        else if (measurement.name === 'external') {
                            external_1 = measurement.duration;
                        }
                        else if (measurement.name === 'total') {
                            total = measurement.duration;
                        }
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_a = _h.return)) _a.call(_h);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                // green: 50+ frames/sec, pink: 30 frames/sec, red: 20 frames/sec
                console.log("%c" + total.toFixed(1) + "ms%c (update: %c" + update.toFixed(1) + "%c, render: %c" + render.toFixed(1) + "%c, draw: %c" + draw.toFixed(1) + "%c, external: %c" + external_1.toFixed(1) + "%c)", "color: " + (total <= 20 ? '#6c6' : total <= 33 ? '#f88' : total <= 50 ? '#e22' : '#a00'), 'color: #666', "color: " + (update <= 5 ? '#6c6' : update <= 10 ? '#f88' : update <= 20 ? '#e22' : '#a00'), 'color: #666', "color: " + (render <= 5 ? '#6c6' : render <= 10 ? '#f88' : render <= 20 ? '#e22' : '#a00'), 'color: #666', "color: " + (draw <= 5 ? '#6c6' : draw <= 10 ? '#f88' : draw <= 20 ? '#e22' : '#a00'), 'color: #666', "color: " + (external_1 <= 5 ? '#6c6' : external_1 <= 10 ? '#f88' : external_1 <= 20 ? '#e22' : '#a00'), 'color: #666');
            }
            _this.viewportDirty = false;
            _this.dirty = dirty;
            performance.clearMarks();
            performance.clearMeasures();
            performance.mark('external');
            performance.mark('total');
            _this._measurePerformance = true;
        };
        this.delete = function () {
            if (_this.doubleClickTimeout) {
                clearTimeout(_this.doubleClickTimeout);
                _this.doubleClickTimeout = undefined;
            }
            document.body.removeEventListener('keydown', _this.onKeyDown);
            document.body.removeEventListener('keyup', _this.onKeyUp);
            _this.cancelAnimationLoop();
            _this.app.destroy(true, { children: true, texture: true, baseTexture: true });
            _this.circle.delete();
            _this.arrow.delete();
            _this.image.delete();
            _this.fontIcon.delete();
        };
        this.base64 = function (resolution, mimetype) {
            if (resolution === void 0) { resolution = 2; }
            if (mimetype === void 0) { mimetype = 'image/jpeg'; }
            return new Promise(function (resolve) {
                var cancelAnimationFrame = utils_1.animationFrameLoop(function (time) {
                    if (!_this.fontLoader.loading() && !_this.imageLoader.loading()) {
                        _this.render(time);
                        // const bounds = Graph.viewportToBounds({ x: this.x, y: this.y, zoom: this.zoom }, { width: this.width, height: this.height })
                        var background = new PIXI.Graphics()
                            .beginFill(0xffffff)
                            .drawRect((-_this.x * _this.zoom) - (_this.width / 2), (-_this.y * _this.zoom) - (_this.height / 2), _this.width, _this.height)
                            .endFill();
                        _this.root.addChildAt(background, 0);
                        var imageTexture = _this.app.renderer.generateTexture(_this.root, PIXI.SCALE_MODES.LINEAR, resolution !== null && resolution !== void 0 ? resolution : 2);
                        var dataURL = _this.app.renderer.plugins.extract.base64(imageTexture, mimetype);
                        imageTexture.destroy();
                        _this.root.removeChild(background);
                        background.destroy();
                        cancelAnimationFrame();
                        resolve(dataURL);
                    }
                });
            });
        };
        this.pointerEnter = function (event) {
            var _a;
            var _b = _this.root.toLocal(event.data.global), x = _b.x, y = _b.y;
            var client = utils_2.clientPositionFromEvent(event.data.originalEvent);
            (_a = _this.onViewportPointerEnter) === null || _a === void 0 ? void 0 : _a.call(_this, __assign({ type: 'viewportPointer', x: x, y: y, clientX: client.x, clientY: client.y, target: { x: _this.x, y: _this.y, zoom: _this.zoom } }, utils_2.pointerKeysFromEvent(event.data.originalEvent)));
        };
        this.pointerDown = function (event) {
            var _a;
            if (_this.doubleClickTimeout === undefined) {
                _this.doubleClickTimeout = setTimeout(_this.clearDoubleClick, 500);
            }
            else {
                _this.doubleClick = true;
            }
            _this.dragInteraction.down(event);
            _this.decelerateInteraction.down();
            if (_this.hoveredNode === undefined && _this.clickedNode === undefined && _this.hoveredEdge === undefined && _this.clickedEdge === undefined) {
                _this.clickedContainer = true;
                var _b = _this.root.toLocal(event.data.global), x = _b.x, y = _b.y;
                var client = utils_2.clientPositionFromEvent(event.data.originalEvent);
                (_a = _this.onViewportPointerDown) === null || _a === void 0 ? void 0 : _a.call(_this, __assign({ type: 'viewportPointer', x: x, y: y, clientX: client.x, clientY: client.y, target: { x: _this.x, y: _this.y, zoom: _this.zoom } }, utils_2.pointerKeysFromEvent(event.data.originalEvent)));
            }
        };
        this.pointerMove = function (event) {
            var _a;
            _this.dragInteraction.move(event);
            _this.decelerateInteraction.move();
            var _b = _this.root.toLocal(event.data.global), x = _b.x, y = _b.y;
            var client = utils_2.clientPositionFromEvent(event.data.originalEvent);
            (_a = _this.onViewportPointerMove) === null || _a === void 0 ? void 0 : _a.call(_this, __assign({ type: 'viewportPointer', x: x, y: y, clientX: client.x, clientY: client.y, target: { x: _this.x, y: _this.y, zoom: _this.zoom } }, utils_2.pointerKeysFromEvent(event.data.originalEvent)));
        };
        this.pointerUp = function (event) {
            var _a, _b, _c, _d;
            _this.dragInteraction.up();
            _this.decelerateInteraction.up();
            var _e = _this.root.toLocal(event.data.global), x = _e.x, y = _e.y;
            var client = utils_2.clientPositionFromEvent(event.data.originalEvent);
            if (_this.dragging) {
                _this.dragging = false;
                _this.clickedContainer = false;
                (_a = _this.onViewportDragEnd) === null || _a === void 0 ? void 0 : _a.call(_this, __assign({ type: 'viewportDrag', x: x,
                    y: y, clientX: client.x, clientY: client.y, viewportX: _this.x, viewportY: _this.y, target: { x: _this.x, y: _this.y, zoom: _this.zoom }, altKey: _this.altKey, ctrlKey: _this.ctrlKey, metaKey: _this.metaKey, shiftKey: _this.shiftKey }, utils_2.pointerKeysFromEvent(event.data.originalEvent)));
            }
            else if (_this.clickedContainer) {
                _this.clickedContainer = false;
                (_b = _this.onViewportPointerUp) === null || _b === void 0 ? void 0 : _b.call(_this, __assign({ type: 'viewportPointer', x: x, y: y, clientX: client.x, clientY: client.y, target: { x: _this.x, y: _this.y, zoom: _this.zoom } }, utils_2.pointerKeysFromEvent(event.data.originalEvent)));
                (_c = _this.onViewportClick) === null || _c === void 0 ? void 0 : _c.call(_this, __assign({ type: 'viewportPointer', x: x, y: y, clientX: client.x, clientY: client.y, target: { x: _this.x, y: _this.y, zoom: _this.zoom } }, utils_2.pointerKeysFromEvent(event.data.originalEvent)));
                if (_this.doubleClick) {
                    _this.doubleClick = false;
                    _this.doubleClickTimeout = undefined;
                    (_d = _this.onViewportDoubleClick) === null || _d === void 0 ? void 0 : _d.call(_this, __assign({ type: 'viewportPointer', x: x, y: y, clientX: client.x, clientY: client.y, target: { x: _this.x, y: _this.y, zoom: _this.zoom } }, utils_2.pointerKeysFromEvent(event.data.originalEvent)));
                }
            }
        };
        this.pointerLeave = function (event) {
            var _a;
            var _b = _this.root.toLocal(event.data.global), x = _b.x, y = _b.y;
            var client = utils_2.clientPositionFromEvent(event.data.originalEvent);
            (_a = _this.onViewportPointerLeave) === null || _a === void 0 ? void 0 : _a.call(_this, __assign({ type: 'viewportPointer', x: x, y: y, clientX: client.x, clientY: client.y, target: { x: _this.x, y: _this.y, zoom: _this.zoom } }, utils_2.pointerKeysFromEvent(event.data.originalEvent)));
        };
        this.clearDoubleClick = function () {
            _this.doubleClickTimeout = undefined;
            _this.doubleClick = false;
        };
        if (!(options.container instanceof HTMLDivElement)) {
            throw new Error('container must be an instance of HTMLDivElement');
        }
        var view = document.createElement('canvas');
        view.onselectstart = function () { return false; };
        options.container.appendChild(view);
        this.container = options.container;
        this.app = new PIXI.Application({
            view: view,
            width: this.width,
            height: this.height,
            resolution: 2,
            antialias: true,
            autoDensity: true,
            autoStart: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
            transparent: true,
        });
        this.labelsLayer.interactiveChildren = false;
        this.nodesLayer.sortableChildren = true; // TODO - perf test
        this.app.stage.addChild(this.root);
        this.root.addChild(this.annotationsBottomLayer);
        this.root.addChild(this.edgesGraphic);
        this.root.addChild(this.edgesLayer);
        this.root.addChild(this.nodesLayer);
        this.root.addChild(this.labelsLayer);
        this.root.addChild(this.frontNodeLayer);
        this.root.addChild(this.frontLabelLayer);
        this.zoomInteraction = new zoom_1.Zoom(this);
        this.dragInteraction = new drag_1.Drag(this);
        this.decelerateInteraction = new decelerate_1.Decelerate(this);
        this.app.renderer.plugins.interaction
            .on('pointerenter', this.pointerEnter)
            .on('pointerdown', this.pointerDown)
            .on('pointermove', this.pointerMove)
            .on('pointerup', this.pointerUp)
            .on('pointerupoutside', this.pointerUp)
            .on('pointercancel', this.pointerUp)
            .on('pointerleave', this.pointerLeave);
        this.app.view.addEventListener('wheel', this.zoomInteraction.wheel);
        this.arrow = new arrowSprite_1.ArrowSprite(this);
        this.circle = new circleSprite_1.CircleSprite(this);
        this.image = new ImageSprite_1.ImageSprite();
        this.fontIcon = new FontIconSprite_1.FontIconSprite();
        document.body.addEventListener('keydown', this.onKeyDown);
        document.body.addEventListener('keyup', this.onKeyUp);
        this.debug = options.debug;
        if (this.debug) {
            this.cancelAnimationLoop = utils_1.animationFrameLoop(this.debugRender);
            this.update = this._debugUpdate;
        }
        else {
            this.cancelAnimationLoop = utils_1.animationFrameLoop(this.render);
            this.update = this._update;
        }
    }
    return InternalRenderer;
}());
exports.InternalRenderer = InternalRenderer;
var Renderer = function (options) {
    var pixiRenderer = new InternalRenderer(options);
    var render = function (graph) {
        pixiRenderer.update(graph);
    };
    render.delete = pixiRenderer.delete;
    return render;
};
exports.Renderer = Renderer;
//# sourceMappingURL=index.js.map
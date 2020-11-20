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
exports.NodeRenderer = void 0;
var PIXI = __importStar(require("pixi.js"));
var d3_interpolate_1 = require("d3-interpolate");
var utils_1 = require("./utils");
var utils_2 = require("../../utils");
var circleSprite_1 = require("./sprites/circleSprite");
var LABEL_Y_PADDING = 2;
var DEFAULT_NODE_FILL = utils_1.colorToNumber('#666');
var DEFAULT_NODE_STROKE = utils_1.colorToNumber('#aaa');
var DEFAULT_NODE_STROKE_WIDTH = 2;
var DEFAULT_LABEL_FAMILY = 'Helvetica';
var DEFAULT_LABEL_COLOR = utils_1.colorToNumber('#444');
var DEFAULT_LABEL_SIZE = 11;
var DEFAULT_RADIUS = 18;
var DEFAULT_BADGE_RADIUS = 8;
var DEFAULT_BADGE_STROKE_WIDTH = 2;
var NodeRenderer = /** @class */ (function () {
    function NodeRenderer(renderer, node, x, y, radius, parent) {
        var _this = this;
        this.strokeWidth = 0;
        this.subgraphNodes = {};
        this.interpolateX = function () { return _this.endX; };
        this.interpolateY = function () { return _this.endY; };
        this.interpolateRadius = function () { return _this.endRadius; };
        this.nodeContainer = new PIXI.Container();
        this.strokeSpriteContainer = [];
        this.strokeSprites = [];
        this.badgeSprites = [];
        this.labelContainer = new PIXI.Container(); // TODO - create lazily
        this.badgeIconLoader = [];
        this.doubleClick = false;
        this.nodeMoveXOffset = 0;
        this.nodeMoveYOffset = 0;
        this.pointerEnter = function (event) {
            var _a, _b;
            if (_this.renderer.clickedNode !== undefined)
                return;
            _this.renderer.hoveredNode = _this;
            if (_this.parent === undefined) {
                _this.renderer.dirty = true;
                _this.renderer.nodesLayer.removeChild(_this.nodeContainer);
                _this.renderer.labelsLayer.removeChild(_this.labelContainer);
                _this.renderer.frontNodeLayer.addChild(_this.nodeContainer);
                _this.renderer.frontLabelLayer.addChild(_this.labelContainer);
                for (var subgraphNodeId in _this.subgraphNodes) {
                    _this.renderer.nodesLayer.removeChild(_this.subgraphNodes[subgraphNodeId].nodeContainer);
                    _this.renderer.labelsLayer.removeChild(_this.subgraphNodes[subgraphNodeId].labelContainer);
                    _this.renderer.frontNodeLayer.addChild(_this.subgraphNodes[subgraphNodeId].nodeContainer);
                    _this.renderer.frontLabelLayer.addChild(_this.subgraphNodes[subgraphNodeId].labelContainer);
                }
            }
            var position = _this.renderer.root.toLocal(event.data.global);
            (_b = (_a = _this.renderer).onNodePointerEnter) === null || _b === void 0 ? void 0 : _b.call(_a, event, _this.node, position.x, position.y);
        };
        this.pointerLeave = function (event) {
            var _a, _b;
            if (_this.renderer.clickedNode !== undefined || _this.renderer.hoveredNode !== _this)
                return;
            _this.renderer.hoveredNode = undefined;
            if (_this.parent === undefined) {
                _this.renderer.dirty = true;
                _this.renderer.frontNodeLayer.removeChild(_this.nodeContainer);
                _this.renderer.frontLabelLayer.removeChild(_this.labelContainer);
                _this.renderer.nodesLayer.addChild(_this.nodeContainer);
                _this.renderer.labelsLayer.addChild(_this.labelContainer);
                for (var subgraphNodeId in _this.subgraphNodes) {
                    _this.renderer.frontNodeLayer.removeChild(_this.subgraphNodes[subgraphNodeId].nodeContainer);
                    _this.renderer.frontLabelLayer.removeChild(_this.subgraphNodes[subgraphNodeId].labelContainer);
                    _this.renderer.nodesLayer.addChild(_this.subgraphNodes[subgraphNodeId].nodeContainer);
                    _this.renderer.labelsLayer.addChild(_this.subgraphNodes[subgraphNodeId].labelContainer);
                }
            }
            var position = _this.renderer.root.toLocal(event.data.global);
            (_b = (_a = _this.renderer).onNodePointerLeave) === null || _b === void 0 ? void 0 : _b.call(_a, event, _this.node, position.x, position.y);
        };
        this.pointerDown = function (event) {
            var _a, _b;
            if (_this.doubleClickTimeout === undefined) {
                _this.doubleClickTimeout = setTimeout(_this.clearDoubleClick, 500);
            }
            else {
                _this.doubleClick = true;
            }
            _this.renderer.clickedNode = _this;
            _this.renderer.app.renderer.plugins.interaction.on('pointermove', _this.nodeMove);
            _this.renderer.zoomInteraction.pause();
            _this.renderer.dragInteraction.pause();
            _this.renderer.decelerateInteraction.pause();
            var position = _this.renderer.root.toLocal(event.data.global);
            _this.nodeMoveXOffset = position.x - _this.x;
            _this.nodeMoveYOffset = position.y - _this.y;
            (_b = (_a = _this.renderer).onNodePointerDown) === null || _b === void 0 ? void 0 : _b.call(_a, event, _this.node, _this.x, _this.y);
        };
        this.pointerUp = function (event) {
            var _a, _b, _c, _d, _e, _f;
            if (_this.renderer.clickedNode === undefined)
                return;
            _this.renderer.clickedNode = undefined;
            _this.renderer.app.renderer.plugins.interaction.off('pointermove', _this.nodeMove);
            _this.renderer.zoomInteraction.resume();
            _this.renderer.dragInteraction.resume();
            _this.renderer.decelerateInteraction.resume();
            _this.nodeMoveXOffset = 0;
            _this.nodeMoveYOffset = 0;
            if (_this.renderer.dragging) {
                _this.renderer.dragging = false;
                (_b = (_a = _this.renderer).onNodeDragEnd) === null || _b === void 0 ? void 0 : _b.call(_a, event, _this.node, _this.x, _this.y);
            }
            else {
                (_d = (_c = _this.renderer).onNodePointerUp) === null || _d === void 0 ? void 0 : _d.call(_c, event, _this.node, _this.x, _this.y);
                if (_this.doubleClick) {
                    _this.doubleClick = false;
                    (_f = (_e = _this.renderer).onNodeDoubleClick) === null || _f === void 0 ? void 0 : _f.call(_e, event, _this.node, _this.x, _this.y);
                }
            }
        };
        this.nodeMove = function (event) {
            var _a, _b, _c, _d;
            if (_this.renderer.clickedNode === undefined)
                return;
            var position = _this.renderer.root.toLocal(event.data.global);
            if (!_this.renderer.dragging) {
                _this.renderer.dragging = true;
                (_b = (_a = _this.renderer).onNodeDragStart) === null || _b === void 0 ? void 0 : _b.call(_a, event, _this.node, position.x - _this.nodeMoveXOffset, position.y - _this.nodeMoveYOffset);
            }
            (_d = (_c = _this.renderer).onNodeDrag) === null || _d === void 0 ? void 0 : _d.call(_c, event, _this.node, position.x - _this.nodeMoveXOffset, position.y - _this.nodeMoveYOffset);
        };
        this.clearDoubleClick = function () {
            _this.doubleClickTimeout = undefined;
            _this.doubleClick = false;
        };
        this.renderer = renderer;
        this.parent = parent;
        this.depth = parent ? parent.depth + 1 : 0;
        this.fillSprite = this.renderer.circle.create();
        this.nodeContainer.interactive = true;
        this.nodeContainer.buttonMode = true;
        this.nodeContainer.zIndex = this.depth;
        this.nodeContainer
            .on('pointerover', this.pointerEnter)
            .on('pointerout', this.pointerLeave)
            .on('pointerdown', this.pointerDown)
            .on('pointerup', this.pointerUp)
            .on('pointerupoutside', this.pointerUp)
            .on('pointercancel', this.pointerUp)
            .addChild(this.fillSprite);
        /**
         * if any ancestor is in front layer, add to front
         * otherwise, add to regular layers
         */
        if (utils_1.parentInFront(this.renderer, this.parent)) {
            this.renderer.frontNodeLayer.addChild(this.nodeContainer);
            this.renderer.frontLabelLayer.addChild(this.labelContainer);
        }
        else {
            this.renderer.nodesLayer.addChild(this.nodeContainer);
            this.renderer.labelsLayer.addChild(this.labelContainer);
        }
        this.node = node;
        this.startX = this.endX = this.x = x;
        this.startY = this.endY = this.y = y;
        this.startRadius = this.endRadius = this.radius = radius !== null && radius !== void 0 ? radius : DEFAULT_RADIUS;
        this.update(node);
    }
    NodeRenderer.prototype.update = function (node) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        var _this = this;
        var _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10;
        this.node = node;
        this.startX = this.x;
        this.endX = (_e = node.x) !== null && _e !== void 0 ? _e : 0;
        var interpolateXNumber = d3_interpolate_1.interpolateNumber(this.startX, this.endX);
        this.interpolateX = d3_interpolate_1.interpolateBasis([this.startX, interpolateXNumber(0.7), interpolateXNumber(0.95), this.endX]);
        this.startY = this.y;
        this.endY = (_f = node.y) !== null && _f !== void 0 ? _f : 0;
        var interpolateYNumber = d3_interpolate_1.interpolateNumber(this.startY, this.endY);
        this.interpolateY = d3_interpolate_1.interpolateBasis([this.startY, interpolateYNumber(0.7), interpolateYNumber(0.95), this.endY]);
        this.startRadius = this.radius;
        this.endRadius = (_g = node.radius) !== null && _g !== void 0 ? _g : DEFAULT_RADIUS;
        var interpolateRadiusNumber = d3_interpolate_1.interpolateNumber(this.startRadius, this.endRadius);
        this.interpolateRadius = d3_interpolate_1.interpolateBasis([this.startRadius, interpolateRadiusNumber(0.7), interpolateRadiusNumber(0.95), this.endRadius]);
        /**
         * Styles
         */
        this.fillSprite.tint = ((_h = this.node.style) === null || _h === void 0 ? void 0 : _h.color) === undefined ? DEFAULT_NODE_FILL : utils_1.colorToNumber((_j = this.node.style) === null || _j === void 0 ? void 0 : _j.color);
        // this.fillOpacity = this.fillSprite.alpha = this.node.style?.fillOpacity ?? NODE_STYLES.fillOpacity // TODO - to enable fill opacity, mask out center of strokeSprite
        /**
         * Label
         */
        var labelFamily = (_l = (_k = node.style) === null || _k === void 0 ? void 0 : _k.labelFamily) !== null && _l !== void 0 ? _l : DEFAULT_LABEL_FAMILY;
        var labelColor = ((_m = node.style) === null || _m === void 0 ? void 0 : _m.labelColor) === undefined ? DEFAULT_LABEL_COLOR : utils_1.colorToNumber((_o = node.style) === null || _o === void 0 ? void 0 : _o.labelColor);
        var labelSize = (_q = (_p = node.style) === null || _p === void 0 ? void 0 : _p.labelSize) !== null && _q !== void 0 ? _q : DEFAULT_LABEL_SIZE;
        var labelWordWrap = (_r = node.style) === null || _r === void 0 ? void 0 : _r.labelWordWrap;
        var labelBackground = (_s = node.style) === null || _s === void 0 ? void 0 : _s.labelBackground;
        if (node.label !== this.label ||
            labelFamily !== this.labelFamily ||
            labelColor !== this.labelColor ||
            labelSize !== this.labelSize ||
            labelWordWrap !== this.labelWordWrap ||
            labelBackground !== this.labelBackground) {
            this.label = node.label;
            this.labelFamily = labelFamily;
            this.labelColor = labelColor;
            this.labelSize = labelSize;
            this.labelWordWrap = labelWordWrap;
            this.labelBackground = labelBackground;
            this.labelContainer.removeChildren();
            (_t = this.labelSprite) === null || _t === void 0 ? void 0 : _t.destroy();
            this.labelSprite = undefined;
            (_u = this.labelLoader) === null || _u === void 0 ? void 0 : _u.call(this);
            if (this.label) {
                this.labelLoader = this.renderer.fontLoader.load(this.labelFamily)(function (family) {
                    var _a;
                    if (_this.label === undefined || _this.labelFamily !== family)
                        return;
                    _this.renderer.dirty = true;
                    _this.labelSprite = new PIXI.Text(_this.label, {
                        fontFamily: _this.labelFamily,
                        fontSize: ((_a = _this.labelSize) !== null && _a !== void 0 ? _a : labelSize) * 2.5,
                        fill: _this.labelColor,
                        lineJoin: 'round',
                        stroke: _this.labelBackground === undefined ? '#fff' : undefined,
                        strokeThickness: _this.labelBackground === undefined ? (2.5 * 2.5) : 0,
                        align: 'center',
                        wordWrap: labelWordWrap !== undefined,
                        wordWrapWidth: labelWordWrap,
                    });
                    _this.labelSprite.anchor.set(0.5, 0);
                    _this.labelSprite.scale.set(0.4);
                    _this.labelContainer.addChild(_this.labelSprite);
                    if (_this.labelBackground) {
                        _this.labelBackgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
                        _this.labelBackgroundSprite.width = _this.labelSprite.width + 4;
                        _this.labelBackgroundSprite.height = _this.labelSprite.height;
                        _this.labelBackgroundSprite.tint = utils_1.colorToNumber(_this.labelBackground);
                        _this.labelBackgroundSprite.anchor.set(0.5, 0);
                        _this.labelContainer.addChild(_this.labelBackgroundSprite);
                    }
                    _this.labelContainer.addChild(_this.labelSprite);
                });
            }
        }
        /**
         * Strokes
         */
        if (!utils_2.equals((_v = node.style) === null || _v === void 0 ? void 0 : _v.stroke, this.stroke)) {
            this.stroke = (_w = node.style) === null || _w === void 0 ? void 0 : _w.stroke;
            try {
                for (var _11 = __values(this.strokeSpriteContainer), _12 = _11.next(); !_12.done; _12 = _11.next()) {
                    var container = _12.value;
                    this.nodeContainer.removeChild(container);
                    container.destroy();
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_12 && !_12.done && (_a = _11.return)) _a.call(_11);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.strokeSprites = [];
            this.strokeSpriteContainer = [];
            this.strokeWidth = 0;
            if (this.stroke) {
                this.strokeWidth = this.stroke.reduce(function (sum, _a) {
                    var _b = _a.width, width = _b === void 0 ? DEFAULT_NODE_STROKE_WIDTH : _b;
                    return sum + width;
                }, 0);
                try {
                    for (var _13 = __values(this.stroke), _14 = _13.next(); !_14.done; _14 = _13.next()) {
                        var stroke = _14.value;
                        var strokeSprite = this.renderer.circle.create();
                        strokeSprite.tint = stroke.color === undefined ? DEFAULT_NODE_STROKE : utils_1.colorToNumber(stroke.color);
                        this.strokeSprites.push({ sprite: strokeSprite, width: (_x = stroke.width) !== null && _x !== void 0 ? _x : DEFAULT_NODE_STROKE_WIDTH });
                        var container = new PIXI.Container();
                        container.addChild(strokeSprite);
                        this.strokeSpriteContainer.push(container);
                        this.nodeContainer.addChildAt(container, 0); // add to bottom
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_14 && !_14.done && (_b = _13.return)) _b.call(_13);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        /**
         * Badges
         */
        if (!utils_2.equals((_y = node.style) === null || _y === void 0 ? void 0 : _y.badge, this.badge)) {
            this.badge = (_z = node.style) === null || _z === void 0 ? void 0 : _z.badge;
            (_0 = this.badgeSpriteContainer) === null || _0 === void 0 ? void 0 : _0.destroy();
            this.badgeSpriteContainer = undefined;
            this.badgeSprites = [];
            this.badgeIconLoader.forEach(function (loader) { return loader(); });
            if (this.badge !== undefined) {
                this.badgeSpriteContainer = new PIXI.Container();
                var _loop_1 = function (badge) {
                    var badgeRadius = (_1 = badge.radius) !== null && _1 !== void 0 ? _1 : DEFAULT_BADGE_RADIUS;
                    var badgeStrokeRadius = badgeRadius + ((_2 = badge.strokeWidth) !== null && _2 !== void 0 ? _2 : DEFAULT_BADGE_STROKE_WIDTH);
                    var badgeFillSprite = this_1.renderer.circle.create();
                    badgeFillSprite.tint = badge.color === undefined ? DEFAULT_NODE_FILL : utils_1.colorToNumber(badge.color);
                    badgeFillSprite.scale.set(badgeRadius / circleSprite_1.CircleSprite.radius);
                    var badgeStrokeSprite = this_1.renderer.circle.create();
                    badgeStrokeSprite.tint = badge.stroke === undefined ? DEFAULT_NODE_STROKE : utils_1.colorToNumber(badge.stroke);
                    badgeStrokeSprite.scale.set(badgeStrokeRadius / circleSprite_1.CircleSprite.radius);
                    var badgeIconSprite;
                    if (((_3 = badge.icon) === null || _3 === void 0 ? void 0 : _3.type) === 'textIcon') {
                        var badgeIconLoader = this_1.renderer.fontLoader.load(badge.icon.family)(function (family) {
                            var _a, _b;
                            if (_this.badgeSpriteContainer === undefined || ((_a = badge.icon) === null || _a === void 0 ? void 0 : _a.type) !== 'textIcon' || ((_b = badge.icon) === null || _b === void 0 ? void 0 : _b.family) !== family)
                                return;
                            _this.renderer.dirty = true;
                            badgeIconSprite = _this.renderer.fontIcon.create(badge.icon.text, badge.icon.family, badge.icon.size, 'bold', badge.icon.color);
                            _this.badgeSprites.push({ fill: badgeFillSprite, stroke: badgeStrokeSprite, icon: badgeIconSprite, angle: (badge.position * utils_1.RADIANS_PER_DEGREE) - utils_1.HALF_PI });
                            _this.badgeSpriteContainer.addChild(badgeStrokeSprite);
                            _this.badgeSpriteContainer.addChild(badgeFillSprite);
                            badgeIconSprite !== undefined && _this.badgeSpriteContainer.addChild(badgeIconSprite);
                            _this.nodeContainer.addChild(_this.badgeSpriteContainer); // add to top
                        });
                        this_1.badgeIconLoader.push(badgeIconLoader);
                    }
                    else if (((_4 = badge.icon) === null || _4 === void 0 ? void 0 : _4.type) === 'imageIcon') {
                        var badgeIconLoader = this_1.renderer.imageLoader.load(badge.icon.url)(function (url) {
                            var _a, _b;
                            if (_this.badgeSpriteContainer === undefined || ((_a = badge.icon) === null || _a === void 0 ? void 0 : _a.type) !== 'imageIcon' || ((_b = badge.icon) === null || _b === void 0 ? void 0 : _b.url) !== url)
                                return;
                            _this.renderer.dirty = true;
                            badgeIconSprite = _this.renderer.image.create(badge.icon.url);
                            _this.badgeSprites.push({ fill: badgeFillSprite, stroke: badgeStrokeSprite, icon: badgeIconSprite, angle: (badge.position * utils_1.RADIANS_PER_DEGREE) - utils_1.HALF_PI });
                            _this.badgeSpriteContainer.addChild(badgeStrokeSprite);
                            _this.badgeSpriteContainer.addChild(badgeFillSprite);
                            badgeIconSprite !== undefined && _this.badgeSpriteContainer.addChild(badgeIconSprite);
                            _this.nodeContainer.addChild(_this.badgeSpriteContainer); // add to top
                        });
                        this_1.badgeIconLoader.push(badgeIconLoader);
                    }
                };
                var this_1 = this;
                try {
                    for (var _15 = __values(this.badge), _16 = _15.next(); !_16.done; _16 = _15.next()) {
                        var badge = _16.value;
                        _loop_1(badge);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_16 && !_16.done && (_c = _15.return)) _c.call(_15);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
        }
        /**
         * Icon
         */
        if (!utils_2.equals((_5 = node.style) === null || _5 === void 0 ? void 0 : _5.icon, this.icon)) {
            this.icon = (_6 = node.style) === null || _6 === void 0 ? void 0 : _6.icon;
            if (this.iconSprite !== undefined) {
                this.nodeContainer.removeChild(this.iconSprite);
                this.iconSprite.destroy();
                this.iconSprite = undefined;
                (_7 = this.iconLoader) === null || _7 === void 0 ? void 0 : _7.call(this);
            }
            if (((_8 = this.icon) === null || _8 === void 0 ? void 0 : _8.type) === 'textIcon') {
                this.iconLoader = this.renderer.fontLoader.load(this.icon.family)(function (family) {
                    var _a;
                    if (((_a = _this.icon) === null || _a === void 0 ? void 0 : _a.type) !== 'textIcon' || _this.icon.family !== family)
                        return;
                    _this.renderer.dirty = true;
                    _this.iconSprite = _this.renderer.fontIcon.create(_this.icon.text, _this.icon.family, _this.icon.size, 'normal', _this.icon.color);
                    if (_this.badgeSpriteContainer === undefined) {
                        // no badges - add to top of nodeContainer
                        _this.nodeContainer.addChild(_this.iconSprite);
                    }
                    else {
                        // badges - add below badges
                        _this.nodeContainer.addChildAt(_this.iconSprite, _this.nodeContainer.children.length - 1);
                    }
                });
            }
            else if (((_9 = this.icon) === null || _9 === void 0 ? void 0 : _9.type) === 'imageIcon') {
                this.iconLoader = this.renderer.imageLoader.load(this.icon.url)(function (url) {
                    var _a;
                    if (((_a = _this.icon) === null || _a === void 0 ? void 0 : _a.type) !== 'imageIcon' || _this.icon.url !== url)
                        return;
                    _this.renderer.dirty = true;
                    _this.iconSprite = _this.renderer.image.create(_this.icon.url, _this.icon.scale, _this.icon.offsetX, _this.icon.offsetY);
                    if (_this.badgeSpriteContainer === undefined) {
                        // no badges - add to top of nodeContainer
                        _this.nodeContainer.addChild(_this.iconSprite);
                    }
                    else {
                        // badges - add below badges
                        _this.nodeContainer.addChildAt(_this.iconSprite, _this.nodeContainer.children.length - 1);
                    }
                });
            }
        }
        /**
         * Subgraph Node
         */
        var subgraphNodes = {};
        if ((_10 = node.subgraph) === null || _10 === void 0 ? void 0 : _10.nodes) {
            try {
                for (var _17 = __values(node.subgraph.nodes), _18 = _17.next(); !_18.done; _18 = _17.next()) {
                    var subgraphNode = _18.value;
                    if (this.subgraphNodes[subgraphNode.id] === undefined) {
                        // enter subgraph node
                        subgraphNodes[subgraphNode.id] = new NodeRenderer(this.renderer, subgraphNode, 0, 0, subgraphNode.radius, this);
                    }
                    else {
                        // update subgraph node
                        subgraphNodes[subgraphNode.id] = this.subgraphNodes[subgraphNode.id].update(subgraphNode);
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_18 && !_18.done && (_d = _17.return)) _d.call(_17);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        for (var subgraphNodeId in this.subgraphNodes) {
            if (subgraphNodes[subgraphNodeId] === undefined) {
                // exit subgraph node
                this.subgraphNodes[subgraphNodeId].delete();
            }
        }
        this.subgraphNodes = subgraphNodes;
        return this;
    };
    NodeRenderer.prototype.render = function () {
        var e_5, _a, e_6, _b;
        var _this = this;
        /**
         * TODO - alternatively, if some node positions should interpolate when other nodes are dragged,
         * use the same strategy as zoom: record expected new position, and interpolate if update doesn't match
         * that position
         */
        if (this.renderer.animationPercent < 1 && !this.renderer.dragging) {
            this.x = this.interpolateX(this.renderer.animationPercent);
            this.y = this.interpolateY(this.renderer.animationPercent);
            this.radius = this.interpolateRadius(this.renderer.animationPercent);
        }
        else {
            this.x = this.startX = this.endX;
            this.y = this.startY = this.endY;
            this.radius = this.startRadius = this.endRadius;
            this.interpolateX = function () { return _this.x; };
            this.interpolateY = function () { return _this.y; };
            this.interpolateRadius = function () { return _this.radius; };
        }
        if (this.parent) {
            this.nodeContainer.x = this.labelContainer.x = this.x + this.parent.x;
            this.nodeContainer.y = this.labelContainer.y = this.y + this.parent.y;
        }
        else {
            this.nodeContainer.x = this.labelContainer.x = this.x;
            this.nodeContainer.y = this.labelContainer.y = this.y;
        }
        this.fillSprite.scale.set(this.radius / circleSprite_1.CircleSprite.radius);
        var strokeWidths = this.radius;
        if (this.stroke !== undefined) {
            try {
                for (var _c = __values(this.strokeSprites), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var _e = _d.value, sprite = _e.sprite, width = _e.width;
                    strokeWidths += width;
                    sprite.scale.set(strokeWidths / circleSprite_1.CircleSprite.radius);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
        if (this.badge !== undefined) {
            try {
                for (var _f = __values(this.badgeSprites), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var _h = _g.value, fill = _h.fill, stroke = _h.stroke, icon = _h.icon, angle = _h.angle;
                    var _j = __read(utils_1.movePoint(0, 0, angle, this.radius + this.strokeWidth), 2), x = _j[0], y = _j[1];
                    fill.position.set(x, y);
                    stroke.position.set(x, y);
                    icon !== undefined && icon.position.set(x, y);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
        this.nodeContainer.hitArea = new PIXI.Circle(0, 0, this.radius + this.strokeWidth);
        if (this.labelSprite) {
            this.labelSprite.y = this.radius + this.strokeWidth + LABEL_Y_PADDING;
        }
        if (this.labelBackgroundSprite) {
            this.labelBackgroundSprite.y = this.radius + this.strokeWidth + LABEL_Y_PADDING;
        }
        for (var subgraphNodeId in this.subgraphNodes) {
            this.subgraphNodes[subgraphNodeId].render();
        }
        return this;
    };
    NodeRenderer.prototype.delete = function () {
        for (var subgraphNodeId in this.subgraphNodes) {
            // exit subgraph node
            this.subgraphNodes[subgraphNodeId].delete();
        }
        this.nodeContainer.destroy();
        this.labelContainer.destroy();
        delete this.renderer.nodesById[this.node.id];
    };
    return NodeRenderer;
}());
exports.NodeRenderer = NodeRenderer;
//# sourceMappingURL=node.js.map
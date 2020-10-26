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
var FontLoader_1 = require("./FontLoader");
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
        this.doubleClick = false;
        this.nodeMoveXOffset = 0;
        this.nodeMoveYOffset = 0;
        this.pointerEnter = function (event) {
            var _a, _b;
            if (_this.renderer.clickedNode !== undefined)
                return;
            _this.renderer.hoveredNode = _this;
            if (_this.parent === undefined) {
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
            var _a, _b, _c, _d;
            if (_this.renderer.clickedNode === undefined)
                return;
            _this.renderer.clickedNode = undefined;
            _this.renderer.app.renderer.plugins.interaction.off('pointermove', _this.nodeMove);
            _this.renderer.zoomInteraction.resume();
            _this.renderer.dragInteraction.resume();
            _this.renderer.decelerateInteraction.resume();
            _this.nodeMoveXOffset = 0;
            _this.nodeMoveYOffset = 0;
            (_b = (_a = _this.renderer).onNodePointerUp) === null || _b === void 0 ? void 0 : _b.call(_a, event, _this.node, _this.x, _this.y);
            if (_this.doubleClick) {
                _this.doubleClick = false;
                (_d = (_c = _this.renderer).onNodeDoubleClick) === null || _d === void 0 ? void 0 : _d.call(_c, event, _this.node, _this.x, _this.y);
            }
        };
        this.nodeMove = function (event) {
            var _a, _b;
            if (_this.renderer.clickedNode === undefined)
                return;
            var position = _this.renderer.root.toLocal(event.data.global);
            (_b = (_a = _this.renderer).onNodeDrag) === null || _b === void 0 ? void 0 : _b.call(_a, event, _this.node, position.x - _this.nodeMoveXOffset, position.y - _this.nodeMoveYOffset);
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
        var _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13;
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
        if (node.label !== this.label ||
            labelFamily !== this.labelFamily ||
            labelColor !== this.labelColor ||
            labelSize !== this.labelSize ||
            labelWordWrap !== this.labelWordWrap) {
            this.label = node.label;
            this.labelFamily = labelFamily;
            this.labelColor = labelColor;
            this.labelSize = labelSize;
            this.labelContainer.removeChildren();
            (_s = this.labelSprite) === null || _s === void 0 ? void 0 : _s.destroy();
            this.labelSprite = undefined;
            this.labelWordWrap = labelWordWrap;
            if (this.label) {
                this.labelSprite = new PIXI.Text(this.label, {
                    fontFamily: this.labelFamily,
                    fontSize: this.labelSize * 2.5,
                    fill: this.labelColor,
                    lineJoin: 'round',
                    stroke: '#fff',
                    strokeThickness: 2.5 * 2.5,
                    align: 'center',
                    wordWrap: labelWordWrap !== undefined,
                    wordWrapWidth: labelWordWrap,
                });
                this.labelSprite.position.set(0, this.radius + LABEL_Y_PADDING);
                this.labelSprite.anchor.set(0.5, 0);
                this.labelSprite.scale.set(0.4);
                this.labelContainer.addChild(this.labelSprite);
            }
        }
        /**
         * Strokes
         */
        if (!utils_2.equals((_t = node.style) === null || _t === void 0 ? void 0 : _t.stroke, this.stroke)) {
            this.stroke = (_u = node.style) === null || _u === void 0 ? void 0 : _u.stroke;
            try {
                for (var _14 = __values(this.strokeSpriteContainer), _15 = _14.next(); !_15.done; _15 = _14.next()) {
                    var container = _15.value;
                    this.nodeContainer.removeChild(container);
                    container.destroy();
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_15 && !_15.done && (_a = _14.return)) _a.call(_14);
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
                    for (var _16 = __values(this.stroke), _17 = _16.next(); !_17.done; _17 = _16.next()) {
                        var stroke = _17.value;
                        var strokeSprite = this.renderer.circle.create();
                        strokeSprite.tint = stroke.color === undefined ? DEFAULT_NODE_STROKE : utils_1.colorToNumber(stroke.color);
                        this.strokeSprites.push({ sprite: strokeSprite, width: (_v = stroke.width) !== null && _v !== void 0 ? _v : DEFAULT_NODE_STROKE_WIDTH });
                        var container = new PIXI.Container();
                        container.addChild(strokeSprite);
                        this.strokeSpriteContainer.push(container);
                        this.nodeContainer.addChildAt(container, 0); // add to bottom
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_17 && !_17.done && (_b = _16.return)) _b.call(_16);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        /**
         * Icon
         */
        if (!utils_2.equals((_w = node.style) === null || _w === void 0 ? void 0 : _w.icon, this.icon)) {
            this.icon = (_x = node.style) === null || _x === void 0 ? void 0 : _x.icon;
            (_y = this.iconSprite) === null || _y === void 0 ? void 0 : _y.destroy();
            this.iconSprite = undefined;
            this.nodeContainer.removeChild(this.nodeContainer.getChildByName('icon'));
            if (((_z = this.icon) === null || _z === void 0 ? void 0 : _z.type) === 'textIcon') {
                (_0 = this.fontIconLoader) === null || _0 === void 0 ? void 0 : _0.cancel();
                this.fontIconLoader = FontLoader_1.FontLoader(this.icon.family);
                this.fontIconLoader.then(function (family) {
                    var _a;
                    if (((_a = _this.icon) === null || _a === void 0 ? void 0 : _a.type) !== 'textIcon' || _this.icon.family !== family)
                        return;
                    // TOOD - reuse icon textures
                    _this.iconSprite = new PIXI.Text(_this.icon.text, {
                        fontFamily: _this.icon.family,
                        fontSize: _this.icon.size * 2,
                        fill: _this.icon.color,
                    });
                    _this.iconSprite.name = 'icon';
                    _this.iconSprite.position.set(0, 0);
                    _this.iconSprite.anchor.set(0.5);
                    _this.iconSprite.scale.set(0.5);
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
            else if (((_1 = this.icon) === null || _1 === void 0 ? void 0 : _1.type) === 'imageIcon') {
                this.iconSprite = this.renderer.image.createSprite(this.icon.url);
                this.iconSprite.name = 'icon';
                this.iconSprite.position.set((_3 = (_2 = this.icon.offset) === null || _2 === void 0 ? void 0 : _2.x) !== null && _3 !== void 0 ? _3 : 0, (_5 = (_4 = this.icon.offset) === null || _4 === void 0 ? void 0 : _4.y) !== null && _5 !== void 0 ? _5 : 0);
                this.iconSprite.anchor.set(0.5);
                this.iconSprite.scale.set((_6 = this.icon.scale) !== null && _6 !== void 0 ? _6 : 1);
                if (this.badgeSpriteContainer === undefined) {
                    // no badges - add to top of nodeContainer
                    this.nodeContainer.addChild(this.iconSprite);
                }
                else {
                    // badges - add below badges
                    this.nodeContainer.addChildAt(this.iconSprite, this.nodeContainer.children.length - 1);
                }
            }
        }
        /**
         * Badges
         */
        if (!utils_2.equals((_7 = node.style) === null || _7 === void 0 ? void 0 : _7.badge, this.badge)) {
            this.badge = (_8 = node.style) === null || _8 === void 0 ? void 0 : _8.badge;
            (_9 = this.badgeSpriteContainer) === null || _9 === void 0 ? void 0 : _9.destroy();
            this.badgeSpriteContainer = undefined;
            this.badgeSprites = [];
            if (this.badge !== undefined) {
                this.badgeSpriteContainer = new PIXI.Container();
                try {
                    for (var _18 = __values(this.badge), _19 = _18.next(); !_19.done; _19 = _18.next()) {
                        var badge = _19.value;
                        var badgeRadius = (_10 = badge.radius) !== null && _10 !== void 0 ? _10 : DEFAULT_BADGE_RADIUS;
                        var badgeStrokeRadius = badgeRadius + ((_11 = badge.strokeWidth) !== null && _11 !== void 0 ? _11 : DEFAULT_BADGE_STROKE_WIDTH);
                        var badgeFillSprite = this.renderer.circle.create();
                        badgeFillSprite.tint = badge.color === undefined ? DEFAULT_NODE_FILL : utils_1.colorToNumber(badge.color);
                        badgeFillSprite.scale.set(badgeRadius / circleSprite_1.CircleSprite.radius);
                        var badgeStrokeSprite = this.renderer.circle.create();
                        badgeStrokeSprite.tint = badge.stroke === undefined ? DEFAULT_NODE_STROKE : utils_1.colorToNumber(badge.stroke);
                        badgeStrokeSprite.scale.set(badgeStrokeRadius / circleSprite_1.CircleSprite.radius);
                        var badgeIconSprite = void 0;
                        if (((_12 = badge.icon) === null || _12 === void 0 ? void 0 : _12.type) === 'textIcon') {
                            badgeIconSprite = new PIXI.Text(badge.icon.text, {
                                fontFamily: badge.icon.family,
                                fontSize: badge.icon.size * 2,
                                fontWeight: 'bold',
                                fill: badge.icon.color,
                            });
                            badgeIconSprite.position.set(0, 0);
                            badgeIconSprite.anchor.set(0.5);
                            badgeIconSprite.scale.set(0.5);
                        }
                        // } else if (badge.icon?.type === 'imageIcon') // TODO
                        this.badgeSprites.push({ fill: badgeFillSprite, stroke: badgeStrokeSprite, icon: badgeIconSprite, angle: (badge.position * utils_1.RADIANS_PER_DEGREE) - utils_1.HALF_PI });
                        this.badgeSpriteContainer.addChild(badgeStrokeSprite);
                        this.badgeSpriteContainer.addChild(badgeFillSprite);
                        badgeIconSprite !== undefined && this.badgeSpriteContainer.addChild(badgeIconSprite);
                        this.nodeContainer.addChild(this.badgeSpriteContainer); // add to top
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_19 && !_19.done && (_c = _18.return)) _c.call(_18);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
        }
        /**
         * Subgraph Node
         */
        var subgraphNodes = {};
        if ((_13 = node.subgraph) === null || _13 === void 0 ? void 0 : _13.nodes) {
            try {
                for (var _20 = __values(node.subgraph.nodes), _21 = _20.next(); !_21.done; _21 = _20.next()) {
                    var subgraphNode = _21.value;
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
                    if (_21 && !_21.done && (_d = _20.return)) _d.call(_20);
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
        var _c;
        if (this.renderer.animationPercent < 1 && ((_c = this.renderer.clickedNode) === null || _c === void 0 ? void 0 : _c.node.id) !== this.node.id) {
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
                for (var _d = __values(this.strokeSprites), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var _f = _e.value, sprite = _f.sprite, width = _f.width;
                    strokeWidths += width;
                    sprite.scale.set(strokeWidths / circleSprite_1.CircleSprite.radius);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
        if (this.badge !== undefined) {
            try {
                for (var _g = __values(this.badgeSprites), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var _j = _h.value, fill = _j.fill, stroke = _j.stroke, icon = _j.icon, angle = _j.angle;
                    var _k = __read(utils_1.movePoint(0, 0, angle, this.radius + this.strokeWidth), 2), x = _k[0], y = _k[1];
                    fill.position.set(x, y);
                    stroke.position.set(x, y);
                    icon !== undefined && icon.position.set(x, y);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
        this.nodeContainer.hitArea = new PIXI.Circle(0, 0, this.radius + this.strokeWidth);
        if (this.labelSprite) {
            this.labelSprite.y = this.radius + this.strokeWidth + LABEL_Y_PADDING;
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
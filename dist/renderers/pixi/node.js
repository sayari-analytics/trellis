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
Object.defineProperty(exports, "__esModule", { value: true });
var PIXI = __importStar(require("pixi.js"));
var d3_interpolate_1 = require("d3-interpolate");
var utils_1 = require("./utils");
var LABEL_Y_PADDING = 4;
var NODE_STYLES = {
    strokeWidth: 2,
    fill: '#ff4b4b',
    stroke: '#bb0000',
    fillOpacity: 1,
    strokeOpacity: 1,
};
var Node = /** @class */ (function () {
    function Node(renderer, node, x, y, parent) {
        var _this = this;
        this.radius = -1;
        this.strokeWidth = 0;
        this.stroke = 0;
        this.strokeOpacity = 0;
        this.fill = 0;
        this.fillOpacity = 0;
        this.subGraphNodes = {};
        this.startX = 0;
        this.startY = 0;
        this.startRadius = 0;
        this.endX = 0;
        this.endY = 0;
        this.endRadius = 0;
        this.interpolateX = function () { return _this.endX; };
        this.interpolateY = function () { return _this.endY; };
        this.interpolateRadius = function () { return _this.endRadius; };
        this.nodeContainer = new PIXI.Container();
        this.labelContainer = new PIXI.Container();
        this.nodeGfx = new PIXI.Graphics();
        this.doubleClick = false;
        this.nodeMoveXOffset = 0;
        this.nodeMoveYOffset = 0;
        this.nodePointerEnter = function (event) {
            if (_this.renderer.clickedNode !== undefined)
                return;
            _this.renderer.hoveredNode = _this;
            if (_this.parent === undefined) {
                _this.renderer.nodesLayer.removeChild(_this.nodeContainer);
                _this.renderer.labelsLayer.removeChild(_this.labelContainer);
                _this.renderer.frontNodeLayer.addChild(_this.nodeContainer);
                _this.renderer.frontLabelLayer.addChild(_this.labelContainer);
                for (var subGraphNodeId in _this.subGraphNodes) {
                    _this.renderer.nodesLayer.removeChild(_this.subGraphNodes[subGraphNodeId].nodeContainer);
                    _this.renderer.labelsLayer.removeChild(_this.subGraphNodes[subGraphNodeId].labelContainer);
                    _this.renderer.frontNodeLayer.addChild(_this.subGraphNodes[subGraphNodeId].nodeContainer);
                    _this.renderer.frontLabelLayer.addChild(_this.subGraphNodes[subGraphNodeId].labelContainer);
                }
            }
            _this.renderer.dirty = true;
            var position = _this.renderer.viewport.toWorld(event.data.global);
            _this.renderer.onNodePointerEnter(event, _this.node, position.x, position.y);
        };
        this.nodePointerLeave = function (event) {
            if (_this.renderer.clickedNode !== undefined || _this.renderer.hoveredNode !== _this)
                return;
            _this.renderer.hoveredNode = undefined;
            if (_this.parent === undefined) {
                _this.renderer.frontNodeLayer.removeChild(_this.nodeContainer);
                _this.renderer.frontLabelLayer.removeChild(_this.labelContainer);
                _this.renderer.nodesLayer.addChild(_this.nodeContainer);
                _this.renderer.labelsLayer.addChild(_this.labelContainer);
                for (var subGraphNodeId in _this.subGraphNodes) {
                    _this.renderer.frontNodeLayer.removeChild(_this.subGraphNodes[subGraphNodeId].nodeContainer);
                    _this.renderer.frontLabelLayer.removeChild(_this.subGraphNodes[subGraphNodeId].labelContainer);
                    _this.renderer.nodesLayer.addChild(_this.subGraphNodes[subGraphNodeId].nodeContainer);
                    _this.renderer.labelsLayer.addChild(_this.subGraphNodes[subGraphNodeId].labelContainer);
                }
            }
            _this.renderer.dirty = true;
            var position = _this.renderer.viewport.toWorld(event.data.global);
            _this.renderer.onNodePointerLeave(event, _this.node, position.x, position.y);
        };
        this.nodePointerDown = function (event) {
            if (_this.doubleClickTimeout === undefined) {
                _this.doubleClickTimeout = setTimeout(_this.clearDoubleClick, 500);
            }
            else {
                _this.doubleClick = true;
            }
            _this.renderer.clickedNode = _this;
            _this.renderer.app.renderer.plugins.interaction.on('pointermove', _this.nodeMove);
            _this.renderer.viewport.pause = true;
            _this.renderer.dirty = true;
            var position = _this.renderer.viewport.toWorld(event.data.global);
            _this.nodeMoveXOffset = position.x - _this.x;
            _this.nodeMoveYOffset = position.y - _this.y;
            _this.renderer.onNodePointerDown(event, _this.node, _this.x, _this.y);
        };
        this.nodePointerUp = function (event) {
            if (_this.renderer.clickedNode === undefined)
                return;
            _this.renderer.clickedNode = undefined;
            _this.renderer.app.renderer.plugins.interaction.off('pointermove', _this.nodeMove);
            _this.renderer.viewport.pause = false;
            _this.renderer.dirty = true;
            _this.nodeMoveXOffset = 0;
            _this.nodeMoveYOffset = 0;
            _this.renderer.onNodePointerUp(event, _this.node, _this.x, _this.y);
            if (_this.doubleClick) {
                _this.doubleClick = false;
                _this.renderer.onNodeDoubleClick(event, _this.node, _this.x, _this.y);
            }
        };
        this.nodeMove = function (event) {
            if (_this.renderer.clickedNode === undefined)
                return;
            var position = _this.renderer.viewport.toWorld(event.data.global);
            _this.startX = _this.endX = _this.x = position.x - _this.nodeMoveXOffset;
            _this.startY = _this.endY = _this.y = position.y - _this.nodeMoveYOffset;
            _this.renderer.dirty = true;
            _this.renderer.onNodeDrag(event, _this.node, _this.x, _this.y);
        };
        this.clearDoubleClick = function () {
            _this.doubleClickTimeout = undefined;
            _this.doubleClick = false;
        };
        this.renderer = renderer;
        this.parent = parent;
        this.depth = parent ? parent.depth + 1 : 0;
        this.nodeContainer.interactive = true;
        this.nodeContainer.buttonMode = true;
        this.nodeContainer
            .on('pointerover', this.nodePointerEnter)
            .on('pointerout', this.nodePointerLeave)
            .on('pointerdown', this.nodePointerDown)
            .on('pointerup', this.nodePointerUp)
            .on('pointerupoutside', this.nodePointerUp)
            .addChild(this.nodeGfx);
        this.nodeContainer.zIndex = this.depth;
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
        this.x = x;
        this.y = y;
        this.set(node);
    }
    Node.prototype.set = function (node) {
        var e_1, _a;
        var _this = this;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        /**
         * TODO - only interpolate movement if node is not being dragged
         */
        this.node = node;
        this.startX = this.x;
        this.startY = this.y;
        this.endX = node.x;
        this.endY = node.y;
        /**
         * Position Interpolation
         *
         * TODO - if node position is currently being interpolated, instead of reinterpolating from 0 velocity, smooth interpolation change
         */
        if (this.startX !== this.endX) {
            var interpolateXNumber = d3_interpolate_1.interpolateNumber(this.startX, this.endX);
            this.interpolateX = d3_interpolate_1.interpolateBasis([this.startX, interpolateXNumber(0.1), interpolateXNumber(0.8), interpolateXNumber(0.95), this.endX]);
        }
        else {
            this.interpolateX = function () { return _this.endX; };
        }
        if (this.startY !== this.endY) {
            var interpolateYNumber = d3_interpolate_1.interpolateNumber(this.startY, this.endY);
            this.interpolateY = d3_interpolate_1.interpolateBasis([this.startY, interpolateYNumber(0.1), interpolateYNumber(0.8), interpolateYNumber(0.95), this.endY]);
        }
        else {
            this.interpolateY = function () { return _this.endY; };
        }
        /**
         * Radius Interpolation
         */
        var radius = node.radius;
        this.startRadius = this.radius === -1 ? radius : this.radius;
        this.endRadius = radius;
        if (this.startRadius !== this.endRadius) {
            var interpolateRadiusNumber = d3_interpolate_1.interpolateNumber(this.startRadius, this.endRadius);
            this.interpolateRadius = d3_interpolate_1.interpolateBasis([this.startRadius, interpolateRadiusNumber(0.1), interpolateRadiusNumber(0.8), interpolateRadiusNumber(0.95), this.endRadius]);
        }
        else {
            this.interpolateRadius = function () { return _this.endRadius; };
        }
        /**
         * Styles
         */
        this.strokeWidth = (_c = (_b = this.node.style) === null || _b === void 0 ? void 0 : _b.strokeWidth) !== null && _c !== void 0 ? _c : NODE_STYLES.strokeWidth;
        this.stroke = utils_1.colorToNumber((_e = (_d = this.node.style) === null || _d === void 0 ? void 0 : _d.stroke) !== null && _e !== void 0 ? _e : NODE_STYLES.stroke);
        this.strokeOpacity = (_g = (_f = this.node.style) === null || _f === void 0 ? void 0 : _f.strokeOpacity) !== null && _g !== void 0 ? _g : NODE_STYLES.strokeOpacity;
        this.fill = utils_1.colorToNumber((_j = (_h = this.node.style) === null || _h === void 0 ? void 0 : _h.fill) !== null && _j !== void 0 ? _j : NODE_STYLES.fill);
        this.fillOpacity = (_l = (_k = this.node.style) === null || _k === void 0 ? void 0 : _k.fillOpacity) !== null && _l !== void 0 ? _l : NODE_STYLES.fillOpacity;
        /**
         * Label
         */
        if (node.label !== this.label) {
            this.label = node.label;
            if (node.label) {
                (_m = this.labelSprite) === null || _m === void 0 ? void 0 : _m.destroy();
                this.labelSprite = new PIXI.Text(node.label || '', {
                    fontFamily: 'Helvetica',
                    fontSize: 12 * 2.5,
                    fill: 0x333333,
                    lineJoin: 'round',
                    stroke: '#fafafaee',
                    strokeThickness: 2 * 2,
                    align: 'center',
                });
                this.labelSprite.position.set(0, radius + LABEL_Y_PADDING);
                this.labelSprite.scale.set(0.4);
                this.labelSprite.anchor.set(0.5, 0);
                this.labelContainer.addChild(this.labelSprite);
            }
            else {
                this.labelContainer.removeChildren();
            }
        }
        /**
         * Icon
         */
        if (node.style && node.style.icon !== this.icon) {
            this.icon = node.style.icon;
            if (node.style.icon) {
                var icon = new PIXI.Text(node.style.icon, {
                    fontFamily: 'Material Icons',
                    fontSize: radius / Math.SQRT2 * 1.7,
                    fill: 0xffffff
                });
                icon.name = 'icon';
                icon.position.set(0, 0);
                icon.anchor.set(0.5);
                this.nodeContainer.addChild(icon);
            }
            else {
                this.nodeContainer.removeChild(this.nodeContainer.getChildByName('icon'));
            }
        }
        /**
         * SubGraph Node
         */
        var subGraphNodes = {};
        if ((_o = node.subGraph) === null || _o === void 0 ? void 0 : _o.nodes) {
            try {
                for (var _p = __values(node.subGraph.nodes), _q = _p.next(); !_q.done; _q = _p.next()) {
                    var subGraphNode = _q.value;
                    if (this.subGraphNodes[subGraphNode.id] === undefined) {
                        // enter subGraph node
                        subGraphNodes[subGraphNode.id] = new Node(this.renderer, subGraphNode, 0, 0, this);
                    }
                    else {
                        // update subGraph node
                        subGraphNodes[subGraphNode.id] = this.subGraphNodes[subGraphNode.id].set(subGraphNode);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_q && !_q.done && (_a = _p.return)) _a.call(_p);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        for (var subGraphNodeId in this.subGraphNodes) {
            if (subGraphNodes[subGraphNodeId] === undefined) {
                // exit subGraph node
                this.subGraphNodes[subGraphNodeId].delete();
            }
        }
        this.subGraphNodes = subGraphNodes;
        return this;
    };
    /**
     * TODO - perf boost: render cheap version of things while still animating position
     */
    Node.prototype.render = function () {
        if (this.renderer.animationPercent < 1) {
            this.x = this.interpolateX(this.renderer.animationPercent);
            this.y = this.interpolateY(this.renderer.animationPercent);
            this.radius = this.interpolateRadius(this.renderer.animationDuration / 400);
        }
        else {
            this.x = this.endX;
            this.y = this.endY;
            this.radius = this.endRadius;
        }
        if (this.parent) {
            this.nodeContainer.x = this.labelContainer.x = this.x + this.parent.x;
            this.nodeContainer.y = this.labelContainer.y = this.y + this.parent.y;
        }
        else {
            this.nodeContainer.x = this.labelContainer.x = this.x;
            this.nodeContainer.y = this.labelContainer.y = this.y;
        }
        this.nodeGfx
            .clear()
            .lineStyle(this.strokeWidth, this.stroke, this.strokeOpacity, 0)
            .beginFill(this.fill, this.fillOpacity)
            .drawCircle(0, 0, this.radius);
        if (this.labelSprite) {
            this.labelSprite.y = this.radius + LABEL_Y_PADDING;
        }
        for (var subGraphNodeId in this.subGraphNodes) {
            this.subGraphNodes[subGraphNodeId].render();
        }
        return this;
    };
    Node.prototype.delete = function () {
        this.nodeContainer.destroy();
        this.labelContainer.destroy();
        for (var subGraphNodeId in this.subGraphNodes) {
            // exit subGraph node
            this.subGraphNodes[subGraphNodeId].delete();
        }
        delete this.renderer.nodesById[this.node.id];
    };
    return Node;
}());
exports.Node = Node;
//# sourceMappingURL=node.js.map
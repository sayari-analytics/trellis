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
exports.EdgeRenderer = void 0;
var PIXI = __importStar(require("pixi.js"));
var utils_1 = require("./utils");
var edgeArrow_1 = require("./edgeArrow");
var LINE_HOVER_RADIUS = 4;
var DEFAULT_EDGE_WIDTH = 1;
var DEFAULT_EDGE_COLOR = '#ccc';
var DEFAULT_EDGE_OPACITY = 1;
var DEFAULT_LABEL_FAMILY = 'Helvetica';
var DEFAULT_LABEL_COLOR = '#444';
var DEFAULT_LABEL_SIZE = 11;
var DEFAULT_ARROW = 'none';
var EdgeRenderer = /** @class */ (function () {
    function EdgeRenderer(renderer, edge, edgesLayer) {
        var _this = this;
        this.labelFamily = DEFAULT_LABEL_FAMILY;
        this.labelColor = DEFAULT_LABEL_COLOR;
        this.labelSize = DEFAULT_LABEL_SIZE;
        this.width = 0;
        this.stroke = 0;
        this.strokeOpacity = 0;
        this.line = new PIXI.ParticleContainer();
        this.arrowContainer = new PIXI.Container(); // why can't this be a ParticleContainer
        this.arrow = DEFAULT_ARROW;
        this.hoveredEdge = false;
        this.labelContainer = new PIXI.Container(); // TODO - can't use ParticleContainer.  lazily add label sprite directly to edgesLayer
        this.x0 = 0;
        this.y0 = 0;
        this.x1 = 0;
        this.y1 = 0;
        this.curve = 0;
        this.pointerEnter = function (event) {
            if (!_this.hoveredEdge) {
                _this.hoveredEdge = true;
                _this.renderer.dirty = true;
                var _a = _this.renderer.root.toLocal(event.data.global), x = _a.x, y = _a.y;
                _this.renderer.onEdgePointerEnter(event, _this.edge, x, y);
            }
        };
        this.pointerLeave = function (event) {
            if (_this.hoveredEdge) {
                _this.hoveredEdge = false;
                _this.renderer.dirty = true;
                var _a = _this.renderer.root.toLocal(event.data.global), x = _a.x, y = _a.y;
                _this.renderer.onEdgePointerLeave(event, _this.edge, x, y);
            }
        };
        this.pointerDown = function (event) {
            var _a = _this.renderer.root.toLocal(event.data.global), x = _a.x, y = _a.y;
            _this.renderer.onEdgePointerDown(event, _this.edge, x, y);
        };
        this.pointerUp = function (event) {
            var _a = _this.renderer.root.toLocal(event.data.global), x = _a.x, y = _a.y;
            _this.renderer.onEdgePointerUp(event, _this.edge, x, y);
        };
        this.renderer = renderer;
        this.edgesLayer = edgesLayer;
        this.line.interactive = true;
        this.line.buttonMode = true;
        this.line
            .on('pointerover', this.pointerEnter)
            .on('pointerout', this.pointerLeave)
            .on('pointerdown', this.pointerDown)
            .on('pointerup', this.pointerUp)
            .on('pointerupoutside', this.pointerUp);
        this.edgesLayer.addChild(this.line);
        /**
         * TODO - perf test adding label/arrow directly to edgesLayer container, vs. creating label/arrow containers
         */
        this.edgesLayer.addChild(this.arrowContainer);
        this.edgesLayer.addChild(this.labelContainer);
        this.edge = edge;
        this.update(edge);
    }
    EdgeRenderer.prototype.update = function (edge) {
        var e_1, _a;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        this.edge = edge;
        /**
         * Style
         */
        this.width = (_c = (_b = this.edge.style) === null || _b === void 0 ? void 0 : _b.width) !== null && _c !== void 0 ? _c : DEFAULT_EDGE_WIDTH;
        this.stroke = utils_1.colorToNumber((_e = (_d = edge.style) === null || _d === void 0 ? void 0 : _d.stroke) !== null && _e !== void 0 ? _e : DEFAULT_EDGE_COLOR);
        this.strokeOpacity = (_g = (_f = edge.style) === null || _f === void 0 ? void 0 : _f.strokeOpacity) !== null && _g !== void 0 ? _g : DEFAULT_EDGE_OPACITY;
        /**
         * Arrow
         */
        var arrow = (_j = (_h = edge.style) === null || _h === void 0 ? void 0 : _h.arrow) !== null && _j !== void 0 ? _j : DEFAULT_ARROW;
        if (this.arrow !== arrow) {
            this.arrow = arrow;
            this.arrowContainer.removeChildren();
            (_k = this.forwardArrow) === null || _k === void 0 ? void 0 : _k.destroy();
            (_l = this.reverseArrow) === null || _l === void 0 ? void 0 : _l.destroy();
            this.forwardArrow = undefined;
            this.reverseArrow = undefined;
            if (this.arrow === 'forward') {
                this.forwardArrow = this.renderer.arrow.createSprite();
                this.forwardArrow.tint = this.stroke;
                this.forwardArrow.alpha = this.strokeOpacity;
                this.arrowContainer.addChild(this.forwardArrow);
            }
            else if (this.arrow === 'reverse') {
                this.reverseArrow = this.renderer.arrow.createSprite();
                this.reverseArrow.tint = this.stroke;
                this.reverseArrow.alpha = this.strokeOpacity;
                this.arrowContainer.addChild(this.reverseArrow);
            }
            else if (this.arrow === 'both') {
                this.forwardArrow = this.renderer.arrow.createSprite();
                this.reverseArrow = this.renderer.arrow.createSprite();
                this.forwardArrow.tint = this.stroke;
                this.forwardArrow.alpha = this.strokeOpacity;
                this.reverseArrow.tint = this.stroke;
                this.reverseArrow.alpha = this.strokeOpacity;
                this.arrowContainer.addChild(this.forwardArrow);
                this.arrowContainer.addChild(this.reverseArrow);
            }
        }
        /**
         * Label
         */
        var labelFamily = (_o = (_m = edge.style) === null || _m === void 0 ? void 0 : _m.labelFamily) !== null && _o !== void 0 ? _o : DEFAULT_LABEL_FAMILY;
        var labelColor = (_q = (_p = edge.style) === null || _p === void 0 ? void 0 : _p.labelColor) !== null && _q !== void 0 ? _q : DEFAULT_LABEL_COLOR;
        var labelSize = (_s = (_r = edge.style) === null || _r === void 0 ? void 0 : _r.labelSize) !== null && _s !== void 0 ? _s : DEFAULT_LABEL_SIZE;
        if (edge.label !== this.label ||
            labelFamily !== this.labelFamily ||
            labelColor !== this.labelColor ||
            labelSize !== this.labelSize) {
            this.label = edge.label;
            this.labelFamily = labelFamily;
            this.labelColor = labelColor;
            this.labelSize = labelSize;
            this.labelContainer.removeChildren();
            (_t = this.labelSprite) === null || _t === void 0 ? void 0 : _t.destroy();
            this.labelSprite = undefined;
            if (this.label) {
                this.labelSprite = new PIXI.Text(this.label, {
                    fontFamily: this.labelFamily,
                    fontSize: this.labelSize * 2.5,
                    fill: this.labelColor,
                    lineJoin: 'round',
                    stroke: '#fafafa',
                    strokeThickness: 2 * 2.5,
                });
                this.labelSprite.name = 'text';
                this.labelSprite.scale.set(0.4);
                this.labelSprite.anchor.set(0.5, 0.5);
                this.labelContainer.addChild(this.labelSprite);
            }
        }
        /**
         * Curve
         * TODO - expose edge curve in style spec
         */
        var parallelEdges = this.renderer.edgeIndex[this.edge.source][this.edge.target];
        this.curve = parallelEdges.size - 1;
        try {
            for (var parallelEdges_1 = __values(parallelEdges), parallelEdges_1_1 = parallelEdges_1.next(); !parallelEdges_1_1.done; parallelEdges_1_1 = parallelEdges_1.next()) {
                var edgeId = parallelEdges_1_1.value;
                if (edgeId === this.edge.id) {
                    break;
                }
                this.curve -= 2;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (parallelEdges_1_1 && !parallelEdges_1_1.done && (_a = parallelEdges_1.return)) _a.call(parallelEdges_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return this;
    };
    /**
     * TODO - perf boost: render cheap version of things while still animating position or dragging
     */
    EdgeRenderer.prototype.render = function () {
        var sourceContainer = this.renderer.nodesById[this.edge.source], targetContainer = this.renderer.nodesById[this.edge.target], sourceRadius = sourceContainer.radius + sourceContainer.strokeWidth, targetRadius = targetContainer.radius + targetContainer.strokeWidth, theta = utils_1.angle(sourceContainer.x, sourceContainer.y, targetContainer.x, targetContainer.y), start = utils_1.movePoint(sourceContainer.x, sourceContainer.y, theta, -sourceRadius), end = utils_1.movePoint(targetContainer.x, targetContainer.y, theta, targetRadius), center = utils_1.midPoint(start[0], start[1], end[0], end[1]);
        if (this.curve === 0) {
            var startArrowOffset = this.reverseArrow ?
                utils_1.movePoint(sourceContainer.x, sourceContainer.y, theta, -sourceRadius - edgeArrow_1.ArrowRenderer.ARROW_HEIGHT) :
                start, endArrowOffset = this.forwardArrow ?
                utils_1.movePoint(targetContainer.x, targetContainer.y, theta, targetRadius + edgeArrow_1.ArrowRenderer.ARROW_HEIGHT) :
                end;
            /**
             * edge start/end is source/target node's center, offset by radius and, if rendered on edge source and/or target, arrow height
             * TODO - once arrows are encorporated into the style spec, add/remove arrowHeight offset
             */
            this.x0 = startArrowOffset[0];
            this.y0 = startArrowOffset[1];
            this.x1 = endArrowOffset[0];
            this.y1 = endArrowOffset[1];
            this.renderer.edgesGraphic
                .moveTo(this.x0, this.y0)
                .lineStyle(this.width, this.stroke, this.strokeOpacity)
                .lineTo(this.x1, this.y1);
            this.labelContainer.x = center[0];
            this.labelContainer.y = center[1];
            this.labelContainer.rotation = theta > utils_1.HALF_PI && theta < utils_1.THREE_HALF_PI ? theta - Math.PI : theta;
            if (this.forwardArrow) {
                this.forwardArrow.x = end[0];
                this.forwardArrow.y = end[1];
                this.forwardArrow.rotation = theta;
            }
            if (this.reverseArrow) {
                this.reverseArrow.x = start[0];
                this.reverseArrow.y = start[1];
                this.reverseArrow.rotation = theta + Math.PI;
            }
            // TODO - don't bother rendering hitArea when animating position or dragging
            var hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS);
            var perpendicular = theta + utils_1.HALF_PI;
            var hitAreaVerticies = new Array(8);
            var point = utils_1.movePoint(start[0], start[1], perpendicular, hoverRadius);
            hitAreaVerticies[0] = point[0];
            hitAreaVerticies[1] = point[1];
            point = utils_1.movePoint(end[0], end[1], perpendicular, hoverRadius);
            hitAreaVerticies[2] = point[0];
            hitAreaVerticies[3] = point[1];
            point = utils_1.movePoint(end[0], end[1], perpendicular, -hoverRadius);
            hitAreaVerticies[4] = point[0];
            hitAreaVerticies[5] = point[1];
            point = utils_1.movePoint(start[0], start[1], perpendicular, -hoverRadius);
            hitAreaVerticies[6] = point[0];
            hitAreaVerticies[7] = point[1];
            this.line.hitArea = new PIXI.Polygon(hitAreaVerticies);
            // this.renderer.edgesGraphic.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.line.hitArea as any)
        }
        else {
            this.curvePeak = utils_1.movePoint(center[0], center[1], theta > utils_1.TWO_PI || theta < 0 ? theta - utils_1.HALF_PI : theta + utils_1.HALF_PI, this.edge.source > this.edge.target ?
                this.curve * 10 :
                this.curve * -10);
            var thetaCurveStart = utils_1.angle(sourceContainer.x, sourceContainer.y, this.curvePeak[0], this.curvePeak[1]);
            var thetaCurveEnd = utils_1.angle(this.curvePeak[0], this.curvePeak[1], targetContainer.x, targetContainer.y);
            var curveStart = this.reverseArrow ?
                utils_1.movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceRadius - edgeArrow_1.ArrowRenderer.ARROW_HEIGHT) :
                utils_1.movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceRadius);
            var curveEnd = this.forwardArrow ?
                utils_1.movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetRadius + edgeArrow_1.ArrowRenderer.ARROW_HEIGHT) :
                utils_1.movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetRadius);
            this.x0 = curveStart[0];
            this.y0 = curveStart[1];
            this.x1 = curveEnd[0];
            this.y1 = curveEnd[1];
            var edgeLength = utils_1.length(this.x0, this.y0, this.x1, this.y1);
            this.curveControlPointA = utils_1.movePoint(this.curvePeak[0], this.curvePeak[1], theta, edgeLength / 4);
            this.curveControlPointB = utils_1.movePoint(this.curvePeak[0], this.curvePeak[1], theta, edgeLength / -4);
            this.renderer.edgesGraphic
                .moveTo(this.x0, this.y0)
                .lineStyle(this.width, this.stroke, this.strokeOpacity)
                .bezierCurveTo(this.x0, this.y0, this.curveControlPointA[0], this.curveControlPointA[1], this.curvePeak[0], this.curvePeak[1])
                .bezierCurveTo(this.curveControlPointB[0], this.curveControlPointB[1], this.x1, this.y1, this.x1, this.y1);
            this.labelContainer.x = this.curvePeak[0];
            this.labelContainer.y = this.curvePeak[1];
            this.labelContainer.rotation = theta > utils_1.HALF_PI && theta < utils_1.THREE_HALF_PI ? theta - Math.PI : theta;
            if (this.forwardArrow) {
                var _a = __read(utils_1.movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetRadius), 2), x = _a[0], y = _a[1];
                this.forwardArrow.x = x;
                this.forwardArrow.y = y;
                this.forwardArrow.rotation = thetaCurveEnd;
            }
            if (this.reverseArrow) {
                var _b = __read(utils_1.movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceRadius), 2), x = _b[0], y = _b[1];
                this.reverseArrow.x = x;
                this.reverseArrow.y = y;
                this.reverseArrow.rotation = thetaCurveStart + Math.PI;
            }
            var hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS);
            var hitAreaVerticies = new Array(12);
            var point = utils_1.movePoint(this.x0, this.y0, thetaCurveStart + utils_1.HALF_PI, hoverRadius);
            hitAreaVerticies[0] = point[0];
            hitAreaVerticies[1] = point[1];
            point = utils_1.movePoint(this.curvePeak[0], this.curvePeak[1], theta + utils_1.HALF_PI, hoverRadius);
            hitAreaVerticies[2] = point[0];
            hitAreaVerticies[3] = point[1];
            point = utils_1.movePoint(this.x1, this.y1, thetaCurveEnd + utils_1.HALF_PI, hoverRadius);
            hitAreaVerticies[4] = point[0];
            hitAreaVerticies[5] = point[1];
            point = utils_1.movePoint(this.x1, this.y1, theta + utils_1.HALF_PI, -hoverRadius);
            hitAreaVerticies[6] = point[0];
            hitAreaVerticies[7] = point[1];
            point = utils_1.movePoint(this.curvePeak[0], this.curvePeak[1], theta + utils_1.HALF_PI, -hoverRadius);
            hitAreaVerticies[8] = point[0];
            hitAreaVerticies[9] = point[1];
            point = utils_1.movePoint(this.x0, this.y0, thetaCurveStart + utils_1.HALF_PI, -hoverRadius);
            hitAreaVerticies[10] = point[0];
            hitAreaVerticies[11] = point[1];
            this.line.hitArea = new PIXI.Polygon(hitAreaVerticies);
            // this.renderer.edgesGraphic.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.line.hitArea as any)
        }
        /**
         * TODO
         * - only double text resolution at high zoom, using occlusion (edge can't be occluded, but edge label can)
         * - half text resolution at low zoom
         * - though dynamically changing font size has really bad performance... maybe separate text objects should be created on initialization, and they are swapped on zoom
         */
        // if (this.viewport.scale.x > 1) {
        //   text.style.fontSize *= 2
        //   text.style.strokeThickness *= 2
        //   text.scale.set(0.5)
        // } else {
        //   text.style.fontSize /= 2
        //   text.style.strokeThickness /= 2
        //   text.scale.set(1)
        // }
        /**
         * hide label if line is too long
         * TODO
         * - truncate text, rather than hiding, or shrink size
         * - improve text resolution at high zoom, and maybe decrease/hide at low zoom
         */
        if (this.label) {
            var edgeLength = utils_1.length(this.x0, this.y0, this.x1, this.y1);
            var text = this.labelContainer.getChildAt(0);
            if (text.width > edgeLength) {
                text.visible = false;
            }
            else {
                text.visible = true;
            }
        }
    };
    EdgeRenderer.prototype.delete = function () {
        var _a, _b;
        (_a = this.forwardArrow) === null || _a === void 0 ? void 0 : _a.destroy();
        (_b = this.reverseArrow) === null || _b === void 0 ? void 0 : _b.destroy();
        this.labelContainer.destroy();
        delete this.renderer.edgesById[this.edge.id];
        this.renderer.edgeIndex[this.edge.source][this.edge.target].delete(this.edge.id);
        this.renderer.edgeIndex[this.edge.target][this.edge.source].delete(this.edge.id);
    };
    return EdgeRenderer;
}());
exports.EdgeRenderer = EdgeRenderer;
//# sourceMappingURL=edge.js.map
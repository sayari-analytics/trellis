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
var _1 = require(".");
var utils_1 = require("./utils");
var movePoint = function (x, y, angle, distance) { return [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]; };
var midPoint = function (x0, y0, x1, y1) { return [(x0 + x1) / 2, (y0 + y1) / 2]; };
var length = function (x0, y0, x1, y1) { return Math.hypot(x1 - x0, y1 - y0); };
var angle = function (x0, y0, x1, y1) { return Math.atan2(y0 - y1, x0 - x1); };
var HALF_PI = Math.PI / 2;
var TWO_PI = Math.PI * 2;
var THREE_HALF_PI = HALF_PI * 3;
var LINE_HOVER_RADIUS = 4;
var ARROW_HEIGHT = 16;
var ARROW_WIDTH = 8;
var Edge = /** @class */ (function () {
    function Edge(renderer, edgesLayer) {
        var _this = this;
        this.width = 0;
        this.stroke = 0;
        this.strokeOpacity = 0;
        this.edgeGfx = new PIXI.Graphics();
        this.arrow = new PIXI.Graphics();
        this.hoveredEdge = false;
        this.labelContainer = new PIXI.Container();
        this.x0 = 0;
        this.y0 = 0;
        this.x1 = 0;
        this.y1 = 0;
        this.curve = 0;
        this.pointerEnter = function (event) {
            if (!_this.hoveredEdge) {
                _this.hoveredEdge = true;
                _this.renderer.dirty = true;
                var _a = _this.renderer.viewport.toWorld(event.data.global), x = _a.x, y = _a.y;
                _this.renderer.onEdgePointerEnter(event, _this.edge, x, y);
            }
        };
        this.pointerLeave = function (event) {
            if (_this.hoveredEdge) {
                _this.hoveredEdge = false;
                _this.renderer.dirty = true;
                var _a = _this.renderer.viewport.toWorld(event.data.global), x = _a.x, y = _a.y;
                _this.renderer.onEdgePointerLeave(event, _this.edge, x, y);
            }
        };
        this.pointerDown = function (event) {
            var _a = _this.renderer.viewport.toWorld(event.data.global), x = _a.x, y = _a.y;
            _this.renderer.onEdgePointerDown(event, _this.edge, x, y);
        };
        this.pointerUp = function (event) {
            var _a = _this.renderer.viewport.toWorld(event.data.global), x = _a.x, y = _a.y;
            _this.renderer.onEdgePointerUp(event, _this.edge, x, y);
        };
        this.renderer = renderer;
        this.edgeGfx.interactive = true;
        this.edgeGfx.buttonMode = true;
        this.edgeGfx
            .on('pointerover', this.pointerEnter)
            .on('pointerout', this.pointerLeave)
            .on('pointerdown', this.pointerDown)
            .on('pointerup', this.pointerUp)
            .on('pointerupoutside', this.pointerUp);
        edgesLayer.addChild(this.edgeGfx);
        edgesLayer.addChild(this.arrow);
        edgesLayer.addChild(this.labelContainer); // TODO - add labelsContainer to edgeLabelLayer
    }
    Edge.prototype.set = function (edge) {
        var e_1, _a;
        this.edge = edge;
        /**
         * Style
         */
        this.width = Edge.edgeStyleSelector(edge, 'width');
        this.stroke = utils_1.colorToNumber(Edge.edgeStyleSelector(edge, 'stroke'));
        this.strokeOpacity = Edge.edgeStyleSelector(edge, 'strokeOpacity');
        /**
         * Label
         */
        if (edge.label !== this.label) {
            this.label = edge.label;
            if (edge.label) {
                var labelText = new PIXI.Text(edge.label, {
                    fontFamily: 'Helvetica',
                    fontSize: 10 * 2.5,
                    fill: 0x444444,
                    lineJoin: 'round',
                    stroke: '#fafafaee',
                    strokeThickness: 2 * 2.5,
                });
                labelText.name = 'text';
                labelText.scale.set(0.4);
                labelText.anchor.set(0.5, 0.6);
                this.labelContainer.addChild(labelText);
            }
            else {
                this.labelContainer.removeChildren();
            }
        }
        /**
         * Curve
         * TODO - expose edge curve in style spec
         */
        this.curve = (this.renderer.forwardEdgeIndex[this.edge.source][this.edge.target].size - 1) * 0.5;
        try {
            for (var _b = __values(this.renderer.forwardEdgeIndex[this.edge.source][this.edge.target]), _c = _b.next(); !_c.done; _c = _b.next()) {
                var edgeId = _c.value;
                if (edgeId === this.edge.id) {
                    break;
                }
                this.curve--;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        /**
         * Arrow
         */
        this.arrow
            .beginFill(this.stroke, this.strokeOpacity)
            .lineTo(ARROW_HEIGHT, ARROW_WIDTH / 2)
            .lineTo(ARROW_HEIGHT, -ARROW_WIDTH / 2);
        return this;
    };
    /**
     * TODO - perf boost: render cheap version of things while still animating position
     */
    Edge.prototype.render = function () {
        var sourceContainer = this.renderer.nodesById[this.edge.source], targetContainer = this.renderer.nodesById[this.edge.target], theta = angle(sourceContainer.x, sourceContainer.y, targetContainer.x, targetContainer.y), start = movePoint(sourceContainer.x, sourceContainer.y, theta, -sourceContainer.radius), end = movePoint(targetContainer.x, targetContainer.y, theta, targetContainer.radius + ARROW_HEIGHT), center = midPoint(start[0], start[1], end[0], end[1]);
        if (this.curve === 0) {
            /**
             * edge start/end is source/target node's center, offset by radius and, if rendered on edge source and/or target, arrow height
             * TODO - once arrows are encorporated into the style spec, add/remove arrowHeight offset
             */
            this.x0 = start[0];
            this.y0 = start[1];
            this.x1 = end[0];
            this.y1 = end[1];
            this.edgeGfx
                .clear()
                .lineStyle(this.width, this.stroke, this.strokeOpacity)
                .moveTo(this.x0, this.y0)
                .lineTo(this.x1, this.y1)
                .endFill();
            this.labelContainer.x = center[0];
            this.labelContainer.y = center[1];
            this.labelContainer.rotation = theta > HALF_PI && theta < THREE_HALF_PI ? theta - Math.PI : theta;
            // TODO - don't bother rendering arrow when animating position
            var arrowPosition = movePoint(targetContainer.x, targetContainer.y, theta, targetContainer.radius);
            this.arrow.x = arrowPosition[0];
            this.arrow.y = arrowPosition[1];
            this.arrow.rotation = theta;
            // TODO - don't bother rendering hitArea when animating position
            var hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS);
            var perpendicular = theta + HALF_PI;
            var hitAreaVerticies = new Array(8);
            var point = movePoint(this.x0, this.y0, perpendicular, hoverRadius);
            hitAreaVerticies[0] = point[0];
            hitAreaVerticies[1] = point[1];
            point = movePoint(arrowPosition[0], arrowPosition[1], perpendicular, hoverRadius);
            hitAreaVerticies[2] = point[0];
            hitAreaVerticies[3] = point[1];
            point = movePoint(arrowPosition[0], arrowPosition[1], perpendicular, -hoverRadius);
            hitAreaVerticies[4] = point[0];
            hitAreaVerticies[5] = point[1];
            point = movePoint(this.x0, this.y0, perpendicular, -hoverRadius);
            hitAreaVerticies[6] = point[0];
            hitAreaVerticies[7] = point[1];
            this.edgeGfx.hitArea = new PIXI.Polygon(hitAreaVerticies);
            // this.edgeGfx.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.edgeGfx.hitArea as any)
        }
        else {
            this.curvePeak = movePoint(center[0], center[1], theta > TWO_PI || theta < 0 ? theta - HALF_PI : theta + HALF_PI, this.curve * 20);
            var thetaCurveStart = angle(sourceContainer.x, sourceContainer.y, this.curvePeak[0], this.curvePeak[1]);
            var thetaCurveEnd = angle(this.curvePeak[0], this.curvePeak[1], targetContainer.x, targetContainer.y);
            var curveStart = movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceContainer.radius);
            var curveEnd = movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetContainer.radius + ARROW_HEIGHT);
            this.x0 = curveStart[0];
            this.y0 = curveStart[1];
            this.x1 = curveEnd[0];
            this.y1 = curveEnd[1];
            var edgeLength = length(this.x0, this.y0, this.x1, this.y1);
            this.curveControlPointA = movePoint(this.curvePeak[0], this.curvePeak[1], theta, edgeLength / 4);
            this.curveControlPointB = movePoint(this.curvePeak[0], this.curvePeak[1], theta, edgeLength / -4);
            this.edgeGfx
                .clear()
                .lineStyle(this.width, this.stroke, this.strokeOpacity)
                .moveTo(this.x0, this.y0)
                .bezierCurveTo(this.x0, this.y0, this.curveControlPointA[0], this.curveControlPointA[1], this.curvePeak[0], this.curvePeak[1])
                .bezierCurveTo(this.curveControlPointB[0], this.curveControlPointB[1], this.x1, this.y1, this.x1, this.y1)
                .endFill();
            this.labelContainer.x = this.curvePeak[0];
            this.labelContainer.y = this.curvePeak[1];
            this.labelContainer.rotation = theta > HALF_PI && theta < THREE_HALF_PI ? theta - Math.PI : theta;
            var arrowPosition = movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetContainer.radius);
            this.arrow.x = arrowPosition[0];
            this.arrow.y = arrowPosition[1];
            this.arrow.rotation = thetaCurveEnd;
            var hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS);
            var hitAreaVerticies = new Array(12);
            var point = movePoint(this.x0, this.y0, thetaCurveStart + HALF_PI, hoverRadius);
            hitAreaVerticies[0] = point[0];
            hitAreaVerticies[1] = point[1];
            point = movePoint(this.curvePeak[0], this.curvePeak[1], theta + HALF_PI, hoverRadius);
            hitAreaVerticies[2] = point[0];
            hitAreaVerticies[3] = point[1];
            point = movePoint(arrowPosition[0], arrowPosition[1], thetaCurveEnd + HALF_PI, hoverRadius);
            hitAreaVerticies[4] = point[0];
            hitAreaVerticies[5] = point[1];
            point = movePoint(arrowPosition[0], arrowPosition[1], theta + HALF_PI, -hoverRadius);
            hitAreaVerticies[6] = point[0];
            hitAreaVerticies[7] = point[1];
            point = movePoint(this.curvePeak[0], this.curvePeak[1], theta + HALF_PI, -hoverRadius);
            hitAreaVerticies[8] = point[0];
            hitAreaVerticies[9] = point[1];
            point = movePoint(this.x0, this.y0, thetaCurveStart + HALF_PI, -hoverRadius);
            hitAreaVerticies[10] = point[0];
            hitAreaVerticies[11] = point[1];
            this.edgeGfx.hitArea = new PIXI.Polygon(hitAreaVerticies);
            // this.edgeGfx.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.edgeGfx.hitArea as any)
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
            var edgeLength = length(this.x0, this.y0, this.x1, this.y1);
            var text = this.labelContainer.getChildAt(0);
            if (text.width > edgeLength) {
                text.visible = false;
            }
            else {
                text.visible = true;
            }
        }
    };
    Edge.prototype.delete = function () {
        this.edgeGfx.destroy();
        this.arrow.destroy();
        this.labelContainer.destroy();
        delete this.renderer.edgesById[this.edge.id];
        this.renderer.forwardEdgeIndex[this.edge.source][this.edge.target].delete(this.edge.id);
        this.renderer.reverseEdgeIndex[this.edge.target][this.edge.source].delete(this.edge.id);
    };
    Edge.edgeStyleSelector = _1.edgeStyleSelector(_1.EDGE_STYLES);
    return Edge;
}());
exports.Edge = Edge;
//# sourceMappingURL=edge.js.map
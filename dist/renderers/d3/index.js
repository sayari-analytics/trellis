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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var d3_selection_1 = require("d3-selection");
var d3_zoom_1 = require("d3-zoom");
var d3_drag_1 = require("d3-drag");
var raf_1 = __importDefault(require("raf"));
var utils_1 = require("../../utils");
var d3_interpolate_1 = require("d3-interpolate");
var NODE_STYLES = {
    strokeWidth: 2,
    fill: '#ff4b4b',
    stroke: '#bb0000',
    fillOpacity: 1,
    strokeOpacity: 1,
};
var EDGE_STYLES = {
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
var ANIMATION_DURATION = 800;
exports.D3Renderer = function (_a) {
    var id = _a.id, _b = _a.nodeStyle, nodeStyle = _b === void 0 ? {} : _b, _c = _a.edgeStyle, edgeStyle = _c === void 0 ? {} : _c, _d = _a.onNodeMouseDown, onNodeMouseDown = _d === void 0 ? utils_1.noop : _d, _e = _a.onNodeDrag, onNodeDrag = _e === void 0 ? utils_1.noop : _e, _f = _a.onNodeMouseUp, onNodeMouseUp = _f === void 0 ? utils_1.noop : _f;
    var parent = d3_selection_1.select("#" + id);
    var parentElement = parent.node();
    if (parentElement === null) {
        throw new Error("Element with id " + id + " not found");
    }
    var svg = parent
        .append('svg')
        .attr('height', '100%')
        .attr('width', '100%')
        .style('cursor', 'move');
    var container = svg.append('g');
    var edgeContainer = container.append('g');
    var nodesContainer = container.append('g');
    var zoomBehavior = d3_zoom_1.zoom();
    svg.call(zoomBehavior.on('zoom', function () { return container.attr('transform', d3_selection_1.event.transform); }));
    zoomBehavior.translateBy(svg, parentElement.offsetWidth / 2, parentElement.offsetHeight / 2);
    var draggedNode;
    var currentNodes;
    var currentEdges;
    var currentOptions;
    var dragNode = d3_drag_1.drag()
        .on('start', function (d) { return (draggedNode = d.id, onNodeMouseDown(d, { x: d3_selection_1.event.x, y: d3_selection_1.event.y })); })
        .on('drag', function (d) {
        render({ nodes: currentNodes, edges: currentEdges, options: currentOptions });
        onNodeDrag(d, { x: d3_selection_1.event.x, y: d3_selection_1.event.y });
    })
        .on('end', function (d) { return (draggedNode = undefined, onNodeMouseUp(d, { x: d3_selection_1.event.x, y: d3_selection_1.event.y })); });
    var _nodeStyleSelector = exports.nodeStyleSelector(__assign(__assign({}, NODE_STYLES), nodeStyle));
    var _edgeStyleSelector = exports.edgeStyleSelector(__assign(__assign({}, EDGE_STYLES), edgeStyle));
    var nodeStrokeWidthSelector = function (node) { return _nodeStyleSelector(node, 'strokeWidth'); };
    var nodeFillSelector = function (node) { return _nodeStyleSelector(node, 'fill'); };
    var nodeStrokeSelector = function (node) { return _nodeStyleSelector(node, 'stroke'); };
    var nodeFillOpacitySelector = function (node) { return _nodeStyleSelector(node, 'fillOpacity'); };
    var nodeStrokeOpacitySelector = function (node) { return _nodeStyleSelector(node, 'strokeOpacity'); };
    var edgeStrokeSelector = function (edge) { return _edgeStyleSelector(edge, 'stroke'); };
    var edgeWidthSelector = function (edge) { return _edgeStyleSelector(edge, 'width'); };
    var edgeStrokeOpacitySelector = function (edge) { return _edgeStyleSelector(edge, 'strokeOpacity'); };
    // const nodeClickHandler = (d: PositionedNode) => console.log('click', d.id)
    // const nodeMouseEnterHandler = (d: PositionedNode) => console.log('mouseenter', d.id)
    // const nodeMouseLeaveHandler = (d: PositionedNode) => console.log('mouseleave', d.id)
    var interpolateLayout = utils_1.interpolateDuration(ANIMATION_DURATION);
    var synchronousLayout = function (cb) { return raf_1.default(function () { return cb(1); }); };
    var interpolatePosition = function (start, end, percent) {
        var interpolate = d3_interpolate_1.interpolateNumber(start, end);
        return d3_interpolate_1.interpolateBasis([interpolate(0), interpolate(0.1), interpolate(0.8), interpolate(0.95), interpolate(1)])(percent);
    };
    var render = function (_a) {
        var nodes = _a.nodes, edges = _a.edges, options = _a.options;
        Object.entries(nodes).forEach(function (_a) {
            var _b = __read(_a, 2), nodeId = _b[0], node = _b[1];
            if (currentNodes && currentNodes[nodeId]) {
                node.x0 = currentNodes[nodeId].x0;
                node.y0 = currentNodes[nodeId].y0;
            }
        });
        currentNodes = nodes;
        currentEdges = edges;
        currentOptions = options;
        /**
         * interpolation animations are disabled while dragging, which means adding new nodes while dragging is weirdly jerky
         * why does interpolating layout while dragging not really work? should node position interpolation be disabled only for the single node?
         * or should we split selection/rendering between dragged nodes and other nodes
         */
        (draggedNode !== undefined || options.tick === null ? synchronousLayout : interpolateLayout)(function (n) {
            nodesContainer
                .selectAll('circle')
                .data(Object.values(currentNodes), function (d) { return d.id; })
                .join('circle')
                .attr('cx', function (d) {
                d.x0 = interpolatePosition(d.x0 || 0, d.x, n);
                return d.x0;
            })
                .attr('cy', function (d) {
                d.y0 = interpolatePosition(d.y0 || 0, d.y, n);
                return d.y0;
            })
                // .attr('cx', (d) => d.id === draggedNode ? d.x! : interpolatePosition(d.x0 || 0, d.x!, n))
                // .attr('cy', (d) => d.id === draggedNode ? d.y! : interpolatePosition(d.y0 || 0, d.y!, n))
                .style('cursor', 'pointer')
                .attr('r', function (d) { return d.radius; })
                .style('stroke-width', nodeStrokeWidthSelector)
                .style('fill', nodeFillSelector)
                .style('stroke', nodeStrokeSelector)
                .style('fill-opacity', nodeFillOpacitySelector)
                .style('stroke-opacity', nodeStrokeOpacitySelector)
                // .on('click', nodeClickHandler)
                // .on('mouseenter', nodeMouseEnterHandler)
                // .on('mouseleave', nodeMouseLeaveHandler)
                .call(dragNode);
            edgeContainer
                .selectAll('line')
                .data(Object.values(currentEdges), function (d) { return d.id; })
                .join('line')
                .attr('x1', function (d) { return d.id === draggedNode ? d.source.x : interpolatePosition(d.source.x0 || 0, d.source.x, n); })
                .attr('y1', function (d) { return d.id === draggedNode ? d.source.y : interpolatePosition(d.source.y0 || 0, d.source.y, n); })
                .attr('x2', function (d) { return d.id === draggedNode ? d.target.x : interpolatePosition(d.target.x0 || 0, d.target.x, n); })
                .attr('y2', function (d) { return d.id === draggedNode ? d.target.y : interpolatePosition(d.target.y0 || 0, d.target.y, n); })
                .attr('x1', function (d) { return interpolatePosition(d.source.x0 || 0, d.source.x, n); })
                .attr('y1', function (d) { return interpolatePosition(d.source.y0 || 0, d.source.y, n); })
                .attr('x2', function (d) { return interpolatePosition(d.target.x0 || 0, d.target.x, n); })
                .attr('y2', function (d) { return interpolatePosition(d.target.y0 || 0, d.target.y, n); })
                .style('stroke', edgeStrokeSelector)
                .style('stroke-width', edgeWidthSelector)
                .style('stroke-opacity', edgeStrokeOpacitySelector);
        });
    };
    return render;
};
//# sourceMappingURL=index.js.map
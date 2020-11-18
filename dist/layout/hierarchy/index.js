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
exports.Layout = void 0;
var d3_hierarchy_1 = require("d3-hierarchy");
var DEFAULT_NODE_SIZE = [120, 240];
/**
 * utils
 */
var _graphToDFSHierarchy = function (edgeIndex, id, visited) {
    var e_1, _a;
    visited.add(id);
    var children = [];
    try {
        for (var _b = __values(edgeIndex[id]), _c = _b.next(); !_c.done; _c = _b.next()) {
            var child = _c.value;
            if (!visited.has(child)) {
                children.push(_graphToDFSHierarchy(edgeIndex, child, visited));
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return { id: id, children: children };
};
var graphToDFSHierarchy = function (edgeIndex, id) { return _graphToDFSHierarchy(edgeIndex, id, new Set()); };
var graphToBFSHierarchy = function (edgeIndex, id) {
    var e_2, _a;
    var children = [];
    var queue = [[id, children]];
    var visited = new Set([id]);
    while (queue.length > 0) {
        var _b = __read(queue.shift(), 2), id_1 = _b[0], children_1 = _b[1];
        try {
            for (var _c = (e_2 = void 0, __values(edgeIndex[id_1])), _d = _c.next(); !_d.done; _d = _c.next()) {
                var child = _d.value;
                if (!visited.has(child)) {
                    visited.add(child);
                    var grandChildren = [];
                    children_1.push({ id: child, children: grandChildren });
                    queue.push([child, grandChildren]);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    return {
        id: id,
        children: children
    };
};
var _hierarchyToGraph = function (hierarchy, nodesById) {
    var e_3, _a;
    nodesById[hierarchy.data.id] = hierarchy;
    if (hierarchy.children !== undefined) {
        try {
            for (var _b = __values(hierarchy.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                var child = _c.value;
                _hierarchyToGraph(child, nodesById);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    return nodesById;
};
var hierarchyToGraph = function (hierarchy) { return _hierarchyToGraph(hierarchy, {}); };
exports.Layout = function () {
    return function (root, graph) {
        var _a, _b, _c, _d, _e;
        var edgeIndex = graph.edges.reduce(function (edgeIndex, edge) {
            if (edgeIndex[edge.source] === undefined) {
                edgeIndex[edge.source] = [];
            }
            edgeIndex[edge.source].push(edge.target);
            if (edgeIndex[edge.target] === undefined) {
                edgeIndex[edge.target] = [];
            }
            edgeIndex[edge.target].push(edge.source);
            return edgeIndex;
        }, {});
        if (edgeIndex[root] === undefined) {
            return graph;
        }
        var layout = ((_a = graph.options) === null || _a === void 0 ? void 0 : _a.size) !== undefined ?
            d3_hierarchy_1.tree().size(graph.options.size) :
            d3_hierarchy_1.tree().nodeSize((_c = (_b = graph.options) === null || _b === void 0 ? void 0 : _b.nodeSize) !== null && _c !== void 0 ? _c : DEFAULT_NODE_SIZE);
        if (((_d = graph.options) === null || _d === void 0 ? void 0 : _d.separation) !== undefined) {
            layout.separation(graph.options.separation);
        }
        var positionedDataById = hierarchyToGraph(layout(d3_hierarchy_1.hierarchy(((_e = graph.options) === null || _e === void 0 ? void 0 : _e.bfs) !== false ?
            graphToBFSHierarchy(edgeIndex, root) :
            graphToDFSHierarchy(edgeIndex, root))));
        // const positionedDataById = compose(
        //   hierarchyToGraph,
        //   tree<Hierarchy>().nodeSize(graph.options?.nodeSize ?? DEFAULT_NODE_SIZE),
        //   hierarchy,
        //   graph.options?.bfs !== false ?
        //     graphToBFSHierarchy(edgeIndex, root) :
        //     graphToDFSHierarchy(edgeIndex, root)
        // )
        return __assign(__assign({}, graph), { nodes: graph.nodes.map(function (node) {
                var _a, _b, _c, _d;
                var positionedNode = positionedDataById[node.id];
                return positionedNode === undefined ?
                    node : __assign(__assign({}, node), { x: positionedNode.x + ((_b = (_a = graph.options) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 0), y: positionedNode.y - ((_d = (_c = graph.options) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : 0) });
            }) });
    };
};
//# sourceMappingURL=index.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layout = void 0;
var d3_hierarchy_1 = require("d3-hierarchy");
exports.Layout = function () {
    return function (nodes) {
        var _a;
        var positions = {};
        (_a = d3_hierarchy_1.pack()
            .padding(20)
            .radius(function (node) { return node.data.radius; })(d3_hierarchy_1.hierarchy({ id: '_root_', radius: 200, children: nodes.map(function (_a) {
                var id = _a.id, radius = _a.radius;
                return ({ id: id, radius: radius });
            }) }))
            .children) === null || _a === void 0 ? void 0 : _a.forEach(function (_a) {
            var x = _a.x, y = _a.y, id = _a.data.id;
            positions[id] = [x, y];
        });
        return nodes.map(function (node) { return (__assign(__assign({}, node), { x: positions[node.id][0], y: positions[node.id][1] })); });
    };
};
//# sourceMappingURL=index.js.map
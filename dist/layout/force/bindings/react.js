"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var __1 = require("..");
var Layout = /** @class */ (function (_super) {
    __extends(Layout, _super);
    function Layout() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = { nodes: [], edges: [] };
        _this.layout = new __1.ForceLayout(function (graph) {
            _this.setState(graph);
        });
        return _this;
    }
    // shouldComponentUpdate(_: Props<NodeProps, EdgeProps, NodeStyle, EdgeStyle>, prevState: State<NodeProps, EdgeProps, NodeStyle, EdgeStyle>) {
    //   return this.state !== prevState
    // }
    Layout.prototype.componentDidMount = function () {
        this.layout.apply({
            nodes: this.props.nodes,
            edges: this.props.edges,
            options: this.props.options,
        });
    };
    // componentWillReceiveProps() {
    Layout.prototype.UNSAFE_componentWillReceiveProps = function () {
        this.layout.apply({
            nodes: this.props.nodes,
            edges: this.props.edges,
            options: this.props.options,
        });
    };
    Layout.prototype.render = function () {
        return this.props.children({ nodes: this.state.nodes, edges: this.state.edges });
    };
    return Layout;
}(react_1.Component));
exports.Layout = Layout;
//# sourceMappingURL=react.js.map
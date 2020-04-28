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
var Renderer = /** @class */ (function (_super) {
    __extends(Renderer, _super);
    function Renderer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.container = react_1.createRef();
        return _this;
    }
    Renderer.prototype.componentDidMount = function () {
        this.renderer = new __1.PIXIRenderer({ container: this.container.current, debug: this.props.debug })
            .apply({
            nodes: this.props.nodes,
            edges: this.props.edges,
            options: this.props.options,
        });
    };
    Renderer.prototype.componentDidUpdate = function () {
        this.renderer.apply({
            nodes: this.props.nodes,
            edges: this.props.edges,
            options: this.props.options,
        });
    };
    Renderer.prototype.render = function () {
        return (react_1.createElement('canvas', { ref: this.container }));
    };
    return Renderer;
}(react_1.Component));
exports.Renderer = Renderer;
//# sourceMappingURL=react.js.map
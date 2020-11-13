"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Drag = void 0;
/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Drag Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/drag.js)
 */
var Drag = /** @class */ (function () {
    function Drag(renderer, onContainerDrag) {
        var _this = this;
        this.paused = false;
        this.moved = false;
        this.down = function (event) {
            if (_this.paused) {
                return;
            }
            // this.renderer.app.view.style.cursor = 'move'
            _this.last = { x: event.data.global.x, y: event.data.global.y };
            _this.current = event.data.pointerId;
        };
        this.move = function (event) {
            if (_this.paused) {
                return;
            }
            if (_this.last && _this.current === event.data.pointerId) {
                var x = event.data.global.x;
                var y = event.data.global.y;
                var distX = x - _this.last.x;
                var distY = y - _this.last.y;
                if (_this.moved || Math.abs(distX) >= 5 || Math.abs(distY) >= 5) {
                    // const centerX = this.renderer.root.x + (distX / this.renderer.root.scale.x)
                    // const centerY = this.renderer.root.y + (distY / this.renderer.root.scale.x)
                    var centerX = _this.renderer.x + (distX / _this.renderer.root.scale.x); // TODO - if position is interpolated, renderer.x is the target position.  need to use current position
                    var centerY = _this.renderer.y + (distY / _this.renderer.root.scale.y);
                    _this.last = { x: x, y: y };
                    _this.moved = true;
                    _this.onContainerDrag(event, centerX, centerY);
                }
            }
        };
        this.up = function () {
            if (_this.paused) {
                return;
            }
            // this.renderer.app.view.style.cursor = 'auto'
            _this.last = undefined;
            _this.moved = false;
        };
        this.renderer = renderer;
        this.onContainerDrag = onContainerDrag;
    }
    Drag.prototype.pause = function () {
        this.paused = true;
    };
    Drag.prototype.resume = function () {
        this.paused = false;
    };
    return Drag;
}());
exports.Drag = Drag;
//# sourceMappingURL=drag.js.map
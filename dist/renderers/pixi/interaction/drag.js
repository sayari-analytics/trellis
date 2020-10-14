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
            _this.renderer.app.view.style.cursor = 'move';
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
                    var centerX = _this.renderer.x + (x - _this.last.x);
                    var centerY = _this.renderer.y + (y - _this.last.y);
                    _this.last = { x: x, y: y };
                    _this.moved = true;
                    _this.onContainerDrag(event, centerX, centerY); // TODO - expose this as a more generic function
                }
            }
        };
        this.up = function () {
            if (_this.paused) {
                return;
            }
            _this.renderer.app.view.style.cursor = 'auto';
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
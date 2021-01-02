"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Drag = void 0;
var utils_1 = require("../utils");
/**
 * drag logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Drag Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/drag.js)
 */
var Drag = /** @class */ (function () {
    function Drag(renderer) {
        var _this = this;
        this.paused = false;
        this.moved = false;
        this.down = function (event) {
            if (_this.paused) {
                return;
            }
            _this.renderer.container.style.cursor = 'move';
            _this.last = { x: event.data.global.x, y: event.data.global.y };
            _this.current = event.data.pointerId;
        };
        this.move = function (event) {
            var _a, _b, _c, _d;
            if (_this.paused) {
                return;
            }
            if (_this.last && _this.current === event.data.pointerId) {
                var x = event.data.global.x;
                var y = event.data.global.y;
                var dx = x - _this.last.x;
                var dy = y - _this.last.y;
                if (_this.moved || Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
                    var viewportX = _this.renderer.x + (dx / _this.renderer.zoom);
                    var viewportY = _this.renderer.y + (dy / _this.renderer.zoom);
                    _this.last = { x: x, y: y };
                    _this.moved = true;
                    _this.renderer.expectedViewportXPosition = viewportX;
                    _this.renderer.expectedViewportYPosition = viewportY;
                    var local = _this.renderer.root.toLocal(event.data.global);
                    var client = utils_1.clientPositionFromEvent(event.data.originalEvent);
                    if (!_this.renderer.dragging) {
                        _this.renderer.dragging = true;
                        (_b = (_a = _this.renderer).onViewportDragStart) === null || _b === void 0 ? void 0 : _b.call(_a, {
                            type: 'viewportDrag',
                            x: x,
                            y: y,
                            clientX: client.x,
                            clientY: client.y,
                            viewportX: viewportX,
                            viewportY: viewportY,
                            target: { x: _this.renderer.x, y: _this.renderer.y, zoom: _this.renderer.zoom }
                        });
                    }
                    (_d = (_c = _this.renderer).onViewportDrag) === null || _d === void 0 ? void 0 : _d.call(_c, {
                        type: 'viewportDrag',
                        x: local.x,
                        y: local.y,
                        clientX: client.x,
                        clientY: client.y,
                        viewportX: viewportX,
                        viewportY: viewportY,
                        target: { x: _this.renderer.x, y: _this.renderer.y, zoom: _this.renderer.zoom }
                    });
                }
            }
        };
        this.up = function () {
            if (_this.paused) {
                return;
            }
            _this.renderer.container.style.cursor = 'auto';
            _this.last = undefined;
            _this.moved = false;
        };
        this.renderer = renderer;
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
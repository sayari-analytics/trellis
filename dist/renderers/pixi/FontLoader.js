"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FontLoader = exports.CancellablePromise = void 0;
var fontfaceobserver_1 = __importDefault(require("fontfaceobserver"));
var cache = {};
var CancellablePromise = /** @class */ (function () {
    function CancellablePromise(resolver) {
        var _this = this;
        this.cancelled = false;
        resolver(function (result) {
            _this.result = result;
            if (_this.thenCallback && !_this.cancelled) {
                _this.thenCallback(result);
            }
        });
    }
    CancellablePromise.prototype.then = function (cb) {
        if (!this.cancelled) {
            if (this.result) {
                cb(this.result);
            }
            else {
                this.thenCallback = cb;
            }
        }
    };
    CancellablePromise.prototype.cancel = function () {
        this.cancelled = true;
        this.thenCallback = undefined;
    };
    return CancellablePromise;
}());
exports.CancellablePromise = CancellablePromise;
exports.FontLoader = function (family) {
    var _a, _b;
    if (cache[family]) {
        return new CancellablePromise(function (resolve) { return resolve(family); });
    }
    else if ((_b = (_a = document) === null || _a === void 0 ? void 0 : _a.fonts) === null || _b === void 0 ? void 0 : _b.load) {
        return new CancellablePromise(function (resolve) {
            document.fonts.load("1em " + family).then(function () {
                cache[family] = true;
                resolve(family);
            });
        });
    }
    else {
        return new CancellablePromise(function (resolve) {
            new fontfaceobserver_1.default(family).load().then(function () {
                cache[family] = true;
                resolve(family);
            });
        });
    }
};
//# sourceMappingURL=FontLoader.js.map
"use strict";
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var raf_1 = __importDefault(require("raf"));
exports.noop = function () { };
exports.throttle = function (cb, duration) {
    var clear = true;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (clear) {
            setTimeout(function () {
                cb.apply(void 0, __spread(args));
                clear = true;
            }, duration);
            clear = false;
        }
    };
};
exports.batch = function (cb, duration) {
    var values = [];
    var clear = true;
    return function (arg) {
        if (clear) {
            setTimeout(function () {
                cb(values);
                values = [];
                clear = true;
            }, duration);
            clear = false;
        }
        values.push(arg);
    };
};
exports.animationFrameLoop = function (cb) {
    var frame;
    var tick = function () {
        cb();
        frame = raf_1.default(tick);
    };
    frame = raf_1.default(tick);
    return function () { return raf_1.default.cancel(frame); };
};
exports.throttleAnimationFrame = function (cb) {
    var tailArgs;
    var clear = true;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (clear) {
            clear = false;
            cb.apply(void 0, __spread(args));
            raf_1.default(function () {
                if (tailArgs) {
                    cb.apply(void 0, __spread(tailArgs));
                }
                tailArgs = undefined;
                clear = true;
            });
        }
        else {
            tailArgs = args;
        }
    };
};
exports.identity = function (value) { return value; };
exports.interpolateInterval = function (count, duration) {
    var i = 0;
    var interval = undefined;
    return function (cb) {
        if (interval !== undefined) {
            clearInterval(interval);
            i = 0;
        }
        interval = setInterval(function () {
            if (i++ >= count - 1) {
                clearInterval(interval);
                interval = undefined;
            }
            cb(i / count);
        }, duration / count);
    };
};
exports.interpolateDuration = function (duration) {
    var start;
    var end;
    var frame;
    return function (cb) {
        if (frame !== undefined) {
            raf_1.default.cancel(frame);
        }
        start = Date.now();
        end = start + duration;
        var rafCallback = function () {
            var now = Date.now();
            if (now > end) {
                raf_1.default.cancel(frame);
                frame = undefined;
                cb(1);
                return;
            }
            cb((now - start) / (end - start));
            frame = raf_1.default(rafCallback);
        };
        frame = raf_1.default(rafCallback);
    };
};
//# sourceMappingURL=utils.js.map
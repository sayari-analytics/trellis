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
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolate = exports.equals = exports.interpolateDuration = exports.interpolateInterval = exports.identity = exports.throttleAnimationFrame = exports.animationFrameLoop = exports.batch = exports.throttle = exports.noop = void 0;
var d3_interpolate_1 = require("d3-interpolate");
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
    var tick = function (time) {
        frame = requestAnimationFrame(tick);
        cb(time);
    };
    frame = requestAnimationFrame(tick);
    return function () { return cancelAnimationFrame(frame); };
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
            requestAnimationFrame(function () {
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
            cancelAnimationFrame(frame);
        }
        start = performance.now();
        end = start + duration;
        var rafCallback = function () {
            var now = performance.now();
            if (now > end) {
                cancelAnimationFrame(frame);
                frame = undefined;
                cb(1);
                return;
            }
            cb((now - start) / (end - start));
            frame = requestAnimationFrame(rafCallback);
        };
        frame = requestAnimationFrame(rafCallback);
    };
};
exports.equals = function (a, b) {
    if (a === b) {
        return true;
    }
    else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (var i = 0; i < a.length; i++) {
            if (!exports.equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    else if (typeof a === 'object' && typeof b === 'object') {
        if (Object.keys(a).length !== Object.keys(b).length) {
            return false;
        }
        for (var key in a) {
            if (!exports.equals(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
};
exports.interpolate = function (from, to, duration) {
    var elapsed = 0;
    var t1 = performance.now();
    var interpolator = d3_interpolate_1.interpolateNumber(from, to);
    var ease = d3_interpolate_1.interpolateBasis([from, interpolator(0.7), interpolator(0.95), to]);
    return function () {
        var t2 = performance.now();
        var diff = Math.max(20, t2 - t1);
        elapsed += diff;
        t1 = t2;
        if (elapsed >= duration) {
            return { done: true, value: to };
        }
        return { done: false, value: ease(elapsed / duration) };
    };
};
//# sourceMappingURL=utils.js.map
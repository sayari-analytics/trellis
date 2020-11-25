"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageLoader = exports.FontLoader = exports.Async = void 0;
var PIXI = __importStar(require("pixi.js-legacy"));
var fontfaceobserver_1 = __importDefault(require("fontfaceobserver"));
var utils_1 = require("../../utils");
var warn = utils_1.throttle(function (err) { return console.warn(err); }, 0);
/**
 * generic function for representing a value that is possibly asynchronous
 * think of this as a promise, except that
 * - it can resolve synchronously
 * - it can be cancelled
 * - it is lazy
 * - it doesn't handle error conditions
 * - it can't be chained
 *
 * const delay = Async((resolve) => setTimeout(() => resolve('done'), 1000))
 * const cancel = delay((message) => console.log(message))
 * cancel()
 *
 * // compare to the promise equivlanet
 * const delay = new Promise((resolve) => setTimeout(() => resolve('done'), 1000))
 * delay.then((message) => console.log(message))
 */
exports.Async = function (executor) { return function (onfulfilled) {
    var cancelled = false;
    executor(function (result) {
        if (!cancelled) {
            onfulfilled(result);
        }
    });
    return function () {
        cancelled = true;
    };
}; };
exports.FontLoader = function () {
    var fontCache = {};
    var loadId = 0;
    var loading = new Set();
    return {
        load: function (family) {
            var _a, _b;
            if (fontCache[family]) {
                return exports.Async(function (resolve) { return resolve(family); });
            }
            else if ((_b = (_a = document) === null || _a === void 0 ? void 0 : _a.fonts) === null || _b === void 0 ? void 0 : _b.load) {
                var _loadId_1 = loadId++;
                loading.add(_loadId_1);
                return exports.Async(function (resolve) {
                    document.fonts.load("1em " + family).then(function () {
                        fontCache[family] = true;
                        loading.delete(_loadId_1);
                        resolve(family);
                    });
                });
            }
            else {
                return exports.Async(function (resolve) {
                    var _loadId = loadId++;
                    loading.add(_loadId);
                    new fontfaceobserver_1.default(family)
                        .load()
                        .then(function () {
                        fontCache[family] = true;
                        loading.delete(_loadId);
                        resolve(family);
                    })
                        .catch(function (err) {
                        warn(err);
                        fontCache[family] = true;
                        loading.delete(_loadId);
                        resolve(family);
                    });
                });
            }
        },
        loading: function () { return loading.size > 0; }
    };
};
exports.ImageLoader = function () {
    var image_cache = {};
    var loadId = 0;
    var loading = new Set();
    return {
        load: function (url) {
            if (/^data:/.test(url)) {
                return exports.Async(function (resolve) { return resolve(url); });
            }
            if (image_cache[url] === undefined) {
                image_cache[url] = new PIXI.Loader().add(url);
            }
            return exports.Async(function (resolve) {
                var _loadId = loadId++;
                loading.add(_loadId);
                image_cache[url].load(function () {
                    loading.delete(_loadId);
                    resolve(url);
                });
            });
        },
        loading: function () { return loading.size > 0; }
    };
};
//# sourceMappingURL=Loader.js.map
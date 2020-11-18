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
var PIXI = __importStar(require("pixi.js"));
var fontfaceobserver_1 = __importDefault(require("fontfaceobserver"));
var font_cache = {};
var image_cache = {};
/**
 * generic function for representing a value that is possibly asynchronous
 * this of this as a promise, except that
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
exports.FontLoader = function (family) {
    var _a, _b;
    if (font_cache[family]) {
        return exports.Async(function (resolve) { return resolve(family); });
    }
    else if ((_b = (_a = document) === null || _a === void 0 ? void 0 : _a.fonts) === null || _b === void 0 ? void 0 : _b.load) {
        return exports.Async(function (resolve) {
            document.fonts.load("1em " + family).then(function () {
                font_cache[family] = true;
                resolve(family);
            });
        });
    }
    else {
        return exports.Async(function (resolve) {
            new fontfaceobserver_1.default(family).load().then(function () {
                font_cache[family] = true;
                resolve(family);
            });
        });
    }
};
exports.ImageLoader = function (url) {
    if (/^data:/.test(url) || image_cache[url] === true) {
        return exports.Async(function (resolve) { return resolve(url); });
    }
    else if (image_cache[url] instanceof PIXI.Loader) {
        return exports.Async(function (resolve) {
            image_cache[url].load(function () {
                image_cache[url] = true;
                resolve(url);
            });
        });
    }
    return exports.Async(function (resolve) {
        image_cache[url] = new PIXI.Loader().add(url);
        image_cache[url].load(function () {
            image_cache[url] = true;
            resolve(url);
        });
    });
};
//# sourceMappingURL=Loader.js.map
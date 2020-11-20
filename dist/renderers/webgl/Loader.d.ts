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
export declare const Async: <T>(executor: (resolve: (result: T) => void) => void) => (onfulfilled: (result: T) => void) => () => void;
export declare const FontLoader: () => {
    load: (family: string) => (onfulfilled: (result: string) => void) => () => void;
    loading: () => boolean;
};
export declare const ImageLoader: () => {
    load: (url: string) => (onfulfilled: (result: string) => void) => () => void;
    loading: () => boolean;
};

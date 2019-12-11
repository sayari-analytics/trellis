import raf from 'raf';


export const throttleAnimationFrame = <T extends unknown[]>(cb: (...args: T) => void) => {
  let clear = true;

  return (...args: T) => {
    if (clear) {
      raf(() => {
        cb(...args);
        clear = true;
      });

      clear = false;
    }
  };
};

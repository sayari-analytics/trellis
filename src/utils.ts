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


export const identity = <T>(value: T) => value


export const interpolateInterval = (count: number, duration: number) => {
  let i = 0
  let interval: number | undefined = undefined

  return (cb: (n: number) => void) => {
    if (interval !== undefined) {
      clearInterval(interval)
      i = 0
    }

    interval = setInterval(() => {
      if (i++ >= count - 1) {
        clearInterval(interval)
        interval = undefined
      }

      cb(i / count)
    }, duration / count)
  }
}


export const interpolateDuration = (duration: number) => {
  let start: number | undefined
  let end: number | undefined
  let frame: number | undefined

  return (cb: (n: number) => void) => {
    if (frame !== undefined) {
      raf.cancel(frame)
    }

    start = Date.now()
    end = start + duration

    const rafCallback = () => {
      const now = Date.now()
      if (now > end!) {
        raf.cancel(frame!)
        frame = undefined
        cb(1)
        return
      }

      cb((now - start!) / (end! - start!))
      frame = raf(rafCallback)
    }

    frame = raf(rafCallback)
  }
}

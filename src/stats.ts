import Stats from 'stats.js'


(window as any).Stats = Stats

export const stats = new Stats()

stats.showPanel(1) // 0: fps, 1: ms, 2: mb, 3+: custom

const animate = () => {
  stats.update()
  // stats.begin();
  // monitored code goes here
  // stats.end();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

document.body.appendChild(stats.dom)

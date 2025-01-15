// Import required PIXI extensions
import 'pixi.js/events' // For event handling
import 'pixi.js/text' // For text rendering
import 'pixi.js/text-bitmap' // For bitmap text
import 'pixi.js/graphics' // For graphics rendering
import 'pixi.js/sprite' // For sprite rendering
import 'pixi.js/rendering' // For WebGL/WebGPU rendering

// Export a function to ensure extensions are loaded
export function initializePixiExtensions() {
  // Extensions are loaded when imported
  // This function exists to ensure the imports are not tree-shaken
}

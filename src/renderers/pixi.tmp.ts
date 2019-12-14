import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { Options, DEFAULT_OPTIONS } from './options'
import { Edge, Node, Graph, PositionedNode, PositionedEdge } from '..'
import { throttleAnimationFrame } from '../utils'


export const PixiRenderer = ({
  id,
  tick = DEFAULT_OPTIONS.tick,
  nodeStyles = {},
  edgeStyles = {},
}: Options) => {
  const container = document.getElementById(id)
  if (container === null) {
    throw new Error(`Element #${id} not found`)
  }

  const RESOLUTION = window.devicePixelRatio
  const SCREEN_WIDTH = container.offsetWidth / RESOLUTION
  const SCREEN_HEIGHT = container.offsetHeight / RESOLUTION
  const WORLD_WIDTH = SCREEN_WIDTH
  const WORLD_HEIGHT = SCREEN_HEIGHT
  const NODE_RADIUS = 15
  const NODE_HIT_RADIUS = NODE_RADIUS + 5
  const ICON_FONT_FAMILY = 'Material Icons'
  const ICON_FONT_SIZE = NODE_RADIUS / Math.SQRT2 * 2
  const ICON_TEXT = 'person'
  const LABEL_FONT_FAMILY = 'Helvetica'
  const LABEL_FONT_SIZE = 12
  const LABEL_TEXT = (nodeData: Node) => nodeData.id
  const LABEL_X_PADDING = 2
  const LABEL_Y_PADDING = 1

  const app = new PIXI.Application({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resolution: RESOLUTION,
    transparent: true,
    antialias: true,
    autoStart: false // disable automatic rendering by ticker, render manually instead, only when needed
  })

  // TODO -
  // let renderRequestId: number | undefined
  // const requestRender = () => {
  //   if (renderRequestId !== undefined) {
  //     return;
  //   }
  //   renderRequestId = requestAnimationFrame(() => {
  //     app.render();
  //     renderRequestId = undefined;
  //   });
  // }
  const requestRender = throttleAnimationFrame(() => app.render())

  const viewport = new Viewport({
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    interaction: app.renderer.plugins.interaction
  })

  const zoomIn = () => {
    viewport.zoom(-WORLD_WIDTH / 10, true);
  };
  const zoomOut = () => {
    viewport.zoom(WORLD_WIDTH / 10, true);
  };
  const resetViewport = () => {
    viewport.center = new PIXI.Point(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    viewport.setZoom(0.5, true);
  };

  // app.stage.addChild(viewport);
  // viewport
  //   .drag()
  //   .pinch()
  //   .wheel()
  //   .decelerate()
  app.stage.addChild(viewport
    .drag()
    .pinch()
    .wheel()
    .decelerate())

  viewport.on('frame-end' as any, () => { // TODO - typings?
    if (viewport.dirty) {
      requestRender();
      viewport.dirty = false;
    }
  });

  const linksLayer = new PIXI.Graphics();
  viewport.addChild(linksLayer);
  const nodesLayer = new PIXI.Container();
  viewport.addChild(nodesLayer);
  const labelsLayer = new PIXI.Container();
  viewport.addChild(labelsLayer);
  const frontLayer = new PIXI.Container();
  viewport.addChild(frontLayer);

  let nodeDataToNodeGfx = new WeakMap();
  let nodeGfxToNodeData = new WeakMap();
  let nodeDataToLabelGfx = new WeakMap();
  let labelGfxToNodeData = new WeakMap();
  let hoveredNodeData = undefined;
  let hoveredNodeGfxOriginalChildren = undefined;
  let hoveredLabelGfxOriginalChildren = undefined;
  let clickedNodeData = undefined;


  const updatePositions = (nodes: PositionedNode[], links: PositionedEdge[]) => {
    linksLayer.clear();
    linksLayer.alpha = 0.6;
    links.forEach((linkData) => {
      // TODO - styles
      // linksLayer.lineStyle(Math.sqrt(linkData.value), 0x999999);
      linksLayer.moveTo(linkData.source.x!, linkData.source.y!);
      linksLayer.lineTo(linkData.target.x!, linkData.target.y!);
    });
    linksLayer.endFill();

    nodes.forEach((nodeData) => {
      const nodeGfx = nodeDataToNodeGfx.get(nodeData);
      const labelGfx = nodeDataToLabelGfx.get(nodeData);
      nodeGfx.position = new PIXI.Point(nodeData.x, nodeData.y);
      labelGfx.position = new PIXI.Point(nodeData.x, nodeData.y);
    });
    
    requestRender();
  };
  
  // event handlers
  // const hoverNode = (nodeData) => {
  //   if (clickedNodeData) {
  //     return;
  //   }
  //   if (hoveredNodeData === nodeData) {
  //     return;
  //   }
    
  //   hoveredNodeData = nodeData;
    
  //   const nodeGfx = nodeDataToNodeGfx.get(nodeData);
  //   const labelGfx = nodeDataToLabelGfx.get(nodeData);

  //   // move to front layer
  //   nodesLayer.removeChild(nodeGfx);
  //   frontLayer.addChild(nodeGfx);
  //   labelsLayer.removeChild(labelGfx);
  //   frontLayer.addChild(labelGfx);
    
  //   // add hover effect
  //   hoveredNodeGfxOriginalChildren = [...nodeGfx.children];
  //   hoveredLabelGfxOriginalChildren = [...labelGfx.children];

  //   // circle border
  //   const circleBorder = new PIXI.Graphics();
  //   circleBorder.x = 0;
  //   circleBorder.y = 0;
  //   circleBorder.lineStyle(1.5, 0x000000);
  //   circleBorder.drawCircle(0, 0, NODE_RADIUS);
  //   nodeGfx.addChild(circleBorder);

  //   // text with background
  //   const labelText = new PIXI.Text(LABEL_TEXT(nodeData), {
  //     fontFamily: LABEL_FONT_FAMILY,
  //     fontSize: LABEL_FONT_SIZE,
  //     fill: 0x333333
  //   });
  //   labelText.x = 0;
  //   labelText.y = NODE_HIT_RADIUS + LABEL_Y_PADDING;
  //   labelText.anchor.set(0.5, 0);
  //   const labelBackground = new PIXI.Sprite(PIXI.Texture.WHITE);
  //   labelBackground.x = -(labelText.width + LABEL_X_PADDING * 2) / 2;
  //   labelBackground.y = NODE_HIT_RADIUS;
  //   labelBackground.width = labelText.width + LABEL_X_PADDING * 2;
  //   labelBackground.height = labelText.height + LABEL_Y_PADDING * 2;
  //   labelBackground.tint = 0xeeeeee;
  //   labelGfx.addChild(labelBackground);
  //   labelGfx.addChild(labelText);
    
  //   requestRender();
  // };
  // const unhoverNode = nodeData => {
  //   if (clickedNodeData) {
  //     return;
  //   }
  //   if (hoveredNodeData !== nodeData) {
  //     return;
  //   }
    
  //   hoveredNodeData = undefined;
    
  //   const nodeGfx = nodeDataToNodeGfx.get(nodeData);
  //   const labelGfx = nodeDataToLabelGfx.get(nodeData);
    
  //   // move back from front layer
  //   frontLayer.removeChild(nodeGfx);
  //   nodesLayer.addChild(nodeGfx);
  //   frontLayer.removeChild(labelGfx);
  //   labelsLayer.addChild(labelGfx);

  //   // clear hover effect
  //   const nodeGfxChildren = [...nodeGfx.children];
  //   for (let child of nodeGfxChildren) {
  //     if (!hoveredNodeGfxOriginalChildren.includes(child)) {
  //       nodeGfx.removeChild(child);
  //     }
  //   }
  //   hoveredNodeGfxOriginalChildren = undefined;
  //   const labelGfxChildren = [...labelGfx.children];
  //   for (let child of labelGfxChildren) {
  //     if (!hoveredLabelGfxOriginalChildren.includes(child)) {
  //       labelGfx.removeChild(child);
  //     }
  //   }
  //   hoveredLabelGfxOriginalChildren = undefined;
    
  //   requestRender();
  // };
  // const moveNode = (nodeData, point) => {
  //   const nodeGfx = nodeDataToNodeGfx.get(nodeData);
    
  //   nodeData.x = point.x;
  //   nodeData.y = point.y;
    
  //   updatePositions();
  // };
  // const appMouseMove = event => {
  //   if (!clickedNodeData) {
  //     return;
  //   }
    
  //   moveNode(clickedNodeData, viewport.toWorld(event.data.global));
  // };
  // const clickNode = (nodeData) => {
  //   clickedNodeData = nodeData;
    
  //   // enable node dragging
  //   app.renderer.plugins.interaction.on('mousemove', appMouseMove);
  //   // disable viewport dragging
  //   viewport.pause = true;
  // };

  // const unclickNode = () => {
  //   clickedNodeData = undefined;
    
  //   // disable node dragging
  //   app.renderer.plugins.interaction.off('mousemove', appMouseMove);
  //   // enable viewport dragging
  //   viewport.pause = false;
  // };


  // initial draw
  resetViewport();


  // TODO - allow app to be destroyed
  // app.destroy(true, true);


  // prevent body scrolling
  app.view.addEventListener('wheel', (event) => { event.preventDefault(); });

  container.appendChild(app.view)

  const graph = new Graph(({ nodes: nodeMap, edges: edgeMap }) => {
    const nodes = Object.values(nodeMap)
    const edges = Object.values(edgeMap)

    // create node graphics
    const nodeDataGfxPairs = nodes.map((nodeData) => {
      const nodeGfx = new PIXI.Container();
      nodeGfx.x = nodeData.x!;
      nodeGfx.y = nodeData.y!;
      nodeGfx.interactive = true;
      nodeGfx.buttonMode = true;
      nodeGfx.hitArea = new PIXI.Circle(0, 0, NODE_HIT_RADIUS);
      // nodeGfx.on('mouseover', (event) => hoverNode(nodeGfxToNodeData.get(event.currentTarget)));
      // nodeGfx.on('mouseout', (event) => unhoverNode(nodeGfxToNodeData.get(event.currentTarget)));
      // nodeGfx.on('mousedown', (event) => clickNode(nodeGfxToNodeData.get(event.currentTarget)));
      // nodeGfx.on('mouseup', () => unclickNode());
      // nodeGfx.on('mouseupoutside', () => unclickNode());
      
      const circle = new PIXI.Graphics();
      circle.x = 0;
      circle.y = 0;
      // circle.beginFill(colorToNumber(color(nodeData)));
      circle.drawCircle(0, 0, NODE_RADIUS);
      nodeGfx.addChild(circle);
      
      const circleBorder = new PIXI.Graphics();
      circle.x = 0;
      circle.y = 0;
      circleBorder.lineStyle(1.5, 0xffffff);
      circleBorder.drawCircle(0, 0, NODE_RADIUS);
      nodeGfx.addChild(circleBorder);

      const icon = new PIXI.Text(ICON_TEXT, {
        fontFamily: ICON_FONT_FAMILY,
        fontSize: ICON_FONT_SIZE,
        fill: 0xffffff
      });
      icon.x = 0;
      icon.y = 0;
      icon.anchor.set(0.5);
      nodeGfx.addChild(icon);
      
      const labelGfx = new PIXI.Container();
      labelGfx.x = nodeData.x!;
      labelGfx.y = nodeData.y!;
      labelGfx.interactive = true;
      labelGfx.buttonMode = true;
      // labelGfx.on('mouseover', event => hoverNode(labelGfxToNodeData.get(event.currentTarget)));
      // labelGfx.on('mouseout', event => unhoverNode(labelGfxToNodeData.get(event.currentTarget)));
      // labelGfx.on('mousedown', event => clickNode(labelGfxToNodeData.get(event.currentTarget)));
      // labelGfx.on('mouseup', () => unclickNode());
      // labelGfx.on('mouseupoutside', () => unclickNode());
      
      const labelText = new PIXI.Text(LABEL_TEXT(nodeData), {
        fontFamily: LABEL_FONT_FAMILY,
        fontSize: LABEL_FONT_SIZE,
        fill: 0x333333
      });
      labelText.x = 0;
      labelText.y = NODE_HIT_RADIUS + LABEL_Y_PADDING;
      labelText.anchor.set(0.5, 0);
      const labelBackground = new PIXI.Sprite(PIXI.Texture.WHITE);
      labelBackground.x = -(labelText.width + LABEL_X_PADDING * 2) / 2;
      labelBackground.y = NODE_HIT_RADIUS;
      labelBackground.width = labelText.width + LABEL_X_PADDING * 2;
      labelBackground.height = labelText.height + LABEL_Y_PADDING * 2;
      labelBackground.tint = 0xffffff;
      labelBackground.alpha = 0.5;
      labelGfx.addChild(labelBackground);
      labelGfx.addChild(labelText);
      
      nodesLayer.addChild(nodeGfx);
      labelsLayer.addChild(labelGfx);

      return [nodeData, nodeGfx, labelGfx];
    });
    
    // create lookup tables
    nodeDataToNodeGfx = new WeakMap(nodeDataGfxPairs.map(([nodeData, nodeGfx, labelGfx]) => [nodeData, nodeGfx]));
    nodeGfxToNodeData = new WeakMap(nodeDataGfxPairs.map(([nodeData, nodeGfx, labelGfx]) => [nodeGfx, nodeData]));
    nodeDataToLabelGfx = new WeakMap(nodeDataGfxPairs.map(([nodeData, nodeGfx, labelGfx]) => [nodeData, labelGfx]));
    labelGfxToNodeData = new WeakMap(nodeDataGfxPairs.map(([nodeData, nodeGfx, labelGfx]) => [labelGfx, nodeData]));

    updatePositions(nodes, edges)
  })


  return (nodes: { [key: string]: Node }, edges: { [key: string]: Edge }) => {
    graph.layout({ nodes, edges, options: { tick } })
  }
}

import { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import { LayoutOptions } from '.';
import { Node, Edge, PositionedNode } from '../../types';
export declare const LAYOUT_OPTIONS: LayoutOptions;
export declare type SimulationNode = {
    id: string;
    radius: number;
} & SimulationNodeDatum;
export declare type SimulationEdge = SimulationLinkDatum<SimulationNode>;
export declare type TypedMessageEvent<T = unknown> = {
    [K in keyof MessageEvent]: K extends 'data' ? T : MessageEvent[K];
};
export declare type RunEvent<N extends Node<E>, E extends Edge> = {
    type: 'run';
    nodes: N[];
    edges: E[];
    options?: Partial<LayoutOptions>;
};
export declare type UpdateEvent<N extends PositionedNode<E>, E extends Edge> = {
    type: 'update';
    nodes: N[];
};
export declare type LayoutResultEvent<N extends PositionedNode<E>, E extends Edge> = {
    nodes: N[];
};
export declare const Simulation: () => {
    worker: Worker;
    dispose: () => void;
};

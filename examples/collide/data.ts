import { Node, Edge } from '../../src/'

const graph: { nodes: Record<string, Node & { type: string }>; edges: Record<string, Edge> } = {
  nodes: {
    CDD2rgijLQ4cViDQ_AR1zA: {
      id: 'CDD2rgijLQ4cViDQ_AR1zA',
      label: 'A',
      type: 'company',
      x: 0,
      y: 0,
      radius: 18,
    },
    '309237672349': {
      id: '309237672349',
      label: 'B',
      type: 'person',
      x: -0.3029525749161621,
      y: 0.6897005428946841,
      radius: 18,
    },
    Fl7N9OvAJ3AkOwHphEBapA: {
      id: 'Fl7N9OvAJ3AkOwHphEBapA',
      label: 'C',
      type: 'company',
      x: -60,
      y: 240,
      radius: 18,
    },
    Aia8q6eqCH9ZH3NYS6KCIg: {
      id: 'Aia8q6eqCH9ZH3NYS6KCIg',
      label: 'D',
      type: 'company',
      x: 60,
      y: 240,
      radius: 18,
    },
  },
  edges: {
    'YLFBpXkSBsRWKDXtPT86AQ::shareholder_of::Fl7N9OvAJ3AkOwHphEBapA': {
      id: 'YLFBpXkSBsRWKDXtPT86AQ::shareholder_of::Fl7N9OvAJ3AkOwHphEBapA',
      source: '309237672349',
      target: 'Fl7N9OvAJ3AkOwHphEBapA',
    },
    'YLFBpXkSBsRWKDXtPT86AQ::shareholder_of::Aia8q6eqCH9ZH3NYS6KCIg': {
      id: 'YLFBpXkSBsRWKDXtPT86AQ::shareholder_of::Aia8q6eqCH9ZH3NYS6KCIg',
      source: '309237672349',
      target: 'Aia8q6eqCH9ZH3NYS6KCIg',
    },
  },
}

export default graph

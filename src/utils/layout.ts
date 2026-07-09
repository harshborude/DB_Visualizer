import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure the layout algorithm
  dagreGraph.setGraph({ 
    rankdir: direction, // 'LR' (left-to-right)
    nodesep: 300, // Vertical spacing between nodes in the same column
    ranksep: 500, // Horizontal spacing between different columns
    edgesep: 100
  });

  nodes.forEach((node) => {
    // We estimate the node size since we don't have exact DOM measurements yet.
    // Width is roughly minWidth 280px + padding. Let's say 320px.
    // Height varies wildly based on columns. Let's estimate 150px + 30px per column + 50px per relationship.
    const columnsCount = node.data?.table?.columns?.length || 0;
    const relsCount = node.data?.table?.foreignKeys?.length || 0;
    const estimatedHeight = 150 + (columnsCount * 30) + (relsCount * 50);

    dagreGraph.setNode(node.id, { width: 320, height: estimatedHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 320 / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

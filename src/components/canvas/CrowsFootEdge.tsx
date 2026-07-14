import React from 'react';
import { getSmoothStepPath, BaseEdge, EdgeLabelRenderer, type EdgeProps } from 'reactflow';

export function CrowsFootEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  label,
  data,
  markerEnd: _markerEnd, // ignore default marker
  markerStart: _markerStart
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16
  });

  const relationType = data?.relationType || '1:n';
  const isOneToOne = relationType === '1:1';

  // Marker colors match the line color
  const color = style.stroke || '#94a3b8';
  const strokeWidth = style.strokeWidth || 3;

  return (
    <>
      {/* Define the SVG Markers for Crow's Foot */}
      <defs>
        {/* Source Side (The "One") - Always Exactly One for standard FKs */}
        <marker
          id={`one-marker-${color.toString().replace('#', '')}`}
          markerWidth="20"
          markerHeight="20"
          viewBox="0 0 20 20"
          refX="10"
          refY="10"
          orient="auto-start-reverse"
        >
          <line x1="10" y1="2" x2="10" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <line x1="5" y1="2" x2="5" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </marker>

        {/* Target Side (The "Many") */}
        <marker
          id={`many-marker-${color.toString().replace('#', '')}`}
          markerWidth="20"
          markerHeight="20"
          viewBox="0 0 20 20"
          refX="5"
          refY="10"
          orient="auto"
        >
          {/* Vertical line */}
          <line x1="15" y1="2" x2="15" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          {/* Crow's Foot Prongs */}
          <line x1="15" y1="10" x2="0" y2="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <line x1="15" y1="10" x2="0" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <line x1="15" y1="10" x2="0" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </marker>
      </defs>

      <BaseEdge 
        path={edgePath} 
        style={style}
        markerEnd={isOneToOne ? `url(#one-marker-${color.toString().replace('#', '')})` : `url(#one-marker-${color.toString().replace('#', '')})`} 
        // Wait, the "source" table has the FK, meaning it is the "Many" side.
        // E.g., `orders.user_id` points to `users.id`.
        // The foreign key is defined on `orders` (source), pointing to `users` (target).
        // So `orders` is the N side, `users` is the 1 side.
        // Therefore, source gets Many, target gets One.
        markerStart={`url(#${isOneToOne ? 'one' : 'many'}-marker-${color.toString().replace('#', '')})`}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#1e293b',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 500,
              fontFamily: 'monospace',
              color: '#cbd5e1',
              border: '1px solid #334155',
              pointerEvents: 'all',
              opacity: style.opacity
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

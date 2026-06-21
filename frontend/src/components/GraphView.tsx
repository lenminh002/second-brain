import { PointerEvent, WheelEvent, useMemo, useState } from "react";
import { GitBranch, RefreshCcw, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DragState, GraphEdge, GraphTransform, KnowledgeGraph, PositionedGraphNode } from "@/types";

export function GraphView({
  graph,
  onRefresh,
}: {
  graph: KnowledgeGraph;
  onRefresh: () => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [transform, setTransform] = useState<GraphTransform>({ x: 0, y: 0, scale: 1 });
  const [dragState, setDragState] = useState<DragState | null>(null);

  const adjacency = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();
    const edgeKeys = new Set<string>();
    for (const edge of graph.edges) {
      if (!neighbors.has(edge.source)) neighbors.set(edge.source, new Set());
      if (!neighbors.has(edge.target)) neighbors.set(edge.target, new Set());
      neighbors.get(edge.source)?.add(edge.target);
      neighbors.get(edge.target)?.add(edge.source);
      edgeKeys.add(`${edge.source}->${edge.target}`);
      edgeKeys.add(`${edge.target}->${edge.source}`);
    }
    return { neighbors, edgeKeys };
  }, [graph.edges]);

  const positioned = useMemo<PositionedGraphNode[]>(() => {
    const nodes = graph.nodes || [];
    const sourceNodes = nodes.filter((node) => node.type === "source");
    const conceptNodes = nodes.filter((node) => node.type === "concept");
    const centerX = 520;
    const centerY = 340;
    const sourceRadius = Math.max(88, sourceNodes.length * 16);
    const conceptRadius = Math.max(210, conceptNodes.length * 11);

    const sourcePositions = sourceNodes.map((node, index) => {
      const angle = (index / Math.max(sourceNodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return {
        ...node,
        x: centerX + Math.cos(angle) * sourceRadius,
        y: centerY + Math.sin(angle) * sourceRadius,
      };
    });

    const conceptPositions = conceptNodes.map((node, index) => {
      const degree = adjacency.neighbors.get(node.id)?.size || 1;
      const ring = conceptRadius + (index % 3) * 46 + Math.min(degree, 4) * 8;
      const angle = (index / Math.max(conceptNodes.length, 1)) * Math.PI * 2 + Math.PI / 8;
      return {
        ...node,
        x: centerX + Math.cos(angle) * ring,
        y: centerY + Math.sin(angle) * ring,
      };
    });

    return [...sourcePositions, ...conceptPositions];
  }, [adjacency.neighbors, graph.nodes]);
  const byId = Object.fromEntries(positioned.map((node) => [node.id, node]));
  const activeNodeId = selectedNodeId || hoveredNodeId;
  const activeNeighbors = activeNodeId ? adjacency.neighbors.get(activeNodeId) || new Set<string>() : new Set<string>();
  const selectedNode = activeNodeId ? byId[activeNodeId] : null;
  const connectedNodes = [...activeNeighbors].map((id) => byId[id]).filter(Boolean);

  function isConnectedNode(nodeId: string) {
    return !activeNodeId || nodeId === activeNodeId || activeNeighbors.has(nodeId);
  }

  function isConnectedEdge(edge: GraphEdge) {
    return !activeNodeId || edge.source === activeNodeId || edge.target === activeNodeId;
  }

  function resetView() {
    setTransform({ x: 0, y: 0, scale: 1 });
    setSelectedNodeId(null);
  }

  function fitGraph() {
    if (!positioned.length) return;
    const minX = Math.min(...positioned.map((node) => node.x));
    const maxX = Math.max(...positioned.map((node) => node.x));
    const minY = Math.min(...positioned.map((node) => node.y));
    const maxY = Math.max(...positioned.map((node) => node.y));
    const graphWidth = Math.max(maxX - minX, 1);
    const graphHeight = Math.max(maxY - minY, 1);
    const scale = Math.min(1.25, Math.max(0.55, Math.min(900 / graphWidth, 560 / graphHeight) * 0.75));
    setTransform({
      scale,
      x: 520 - ((minX + maxX) / 2) * scale,
      y: 340 - ((minY + maxY) / 2) * scale,
    });
  }

  function zoomBy(delta: number) {
    setTransform((current) => ({
      ...current,
      scale: Math.min(2.4, Math.max(0.35, current.scale + delta)),
    }));
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.08 : 0.08;
    zoomBy(direction);
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.target instanceof SVGElement && event.target.closest("[data-graph-node='true']")) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    });
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    setTransform((current) => ({
      ...current,
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    }));
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
    }
  }

  if (!graph.nodes.length) {
    return (
      <Card className="grid min-h-[420px] place-items-center border-dashed">
        <CardContent className="pt-6 text-center">
          <GitBranch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No graph nodes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Digest a source, then graphify the knowledge base.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-950" />
            Source
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Concept
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onRefresh} size="sm" variant="outline">
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button onClick={fitGraph} size="sm" variant="outline">Fit Graph</Button>
          <Button onClick={() => zoomBy(0.12)} size="icon" variant="outline">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button onClick={() => zoomBy(-0.12)} size="icon" variant="outline">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button onClick={resetView} size="icon" variant="outline">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative">
        <svg
          className={cn("graph-canvas graph-stage", dragState && "cursor-grabbing")}
          onDoubleClick={resetView}
          onPointerDown={onPointerDown}
          onPointerLeave={() => setHoveredNodeId(null)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          role="img"
          viewBox="0 0 1040 680"
          aria-label="Interactive knowledge graph"
        >
          <defs>
            <pattern id="graph-dots" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.2" fill="currentColor" className="text-slate-300" />
            </pattern>
          </defs>
          <rect width="1040" height="680" fill="url(#graph-dots)" />
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
            {graph.edges.map((edge) => {
              const source = byId[edge.source];
              const target = byId[edge.target];
              if (!source || !target) return null;
              const active = isConnectedEdge(edge);
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              return (
                <g className={cn("graph-edge", active ? "is-active" : "is-dimmed")} key={`${edge.source}-${edge.target}-${edge.relation}`}>
                  <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                  {active && (
                    <text className="graph-edge-label" x={midX} y={midY - 6}>
                      {edge.relation}
                    </text>
                  )}
                </g>
              );
            })}
            {positioned.map((node) => {
              const active = isConnectedNode(node.id);
              const selected = activeNodeId === node.id;
              const radius = node.type === "source" ? 24 : 15;
              return (
                <g
                  className={cn("graph-node", node.type, active ? "is-active" : "is-dimmed", selected && "is-selected")}
                  data-graph-node="true"
                  key={node.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedNodeId((current) => (current === node.id ? null : node.id));
                  }}
                  onPointerEnter={() => setHoveredNodeId(node.id)}
                  onPointerLeave={() => setHoveredNodeId(null)}
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  <circle r={radius} />
                  <text y={radius + 20}>{node.label.slice(0, 26)}</text>
                </g>
              );
            })}
          </g>
        </svg>
        {selectedNode && (
          <div className="absolute right-4 top-4 w-72 rounded-xl border bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{selectedNode.type}</div>
                <div className="mt-1 font-bold">{selectedNode.label}</div>
              </div>
              <Badge variant={selectedNode.type === "source" ? "default" : "secondary"}>{activeNeighbors.size} links</Badge>
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connected nodes</div>
              {connectedNodes.length ? (
                <div className="max-h-44 space-y-1 overflow-auto pr-1">
                  {connectedNodes.map((node) => (
                    <button
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      type="button"
                    >
                      <span className="truncate">{node.label}</span>
                      <span className="text-xs capitalize text-muted-foreground">{node.type}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No direct connections.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

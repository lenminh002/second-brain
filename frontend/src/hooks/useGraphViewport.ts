import { Dispatch, SetStateAction, useRef, useState, WheelEvent } from "react";

import { CENTER_X, CENTER_Y, VIEWBOX_H, VIEWBOX_W } from "@/lib/graph-layout";
import type { GraphTransform, SimNode } from "@/types";

export type GraphViewport = {
  svgRef: React.RefObject<SVGSVGElement | null>;
  transform: GraphTransform;
  setTransform: Dispatch<SetStateAction<GraphTransform>>;
  resetTransform: () => void;
  fitGraph: (nodes: SimNode[]) => void;
  zoomBy: (factor: number) => void;
  onWheel: (event: WheelEvent<SVGSVGElement>) => void;
  clientToSim: (clientX: number, clientY: number) => { x: number; y: number };
};

export function useGraphViewport(): GraphViewport {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<GraphTransform>({ x: 0, y: 0, scale: 1 });

  function resetTransform() {
    setTransform({ x: 0, y: 0, scale: 1 });
  }

  function fitGraph(nodes: SimNode[]) {
    if (!nodes.length) return;
    const xs = nodes.map((n) => n.x ?? 0);
    const ys = nodes.map((n) => n.y ?? 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const graphWidth = Math.max(maxX - minX, 1);
    const graphHeight = Math.max(maxY - minY, 1);
    const scale = Math.min(1.25, Math.max(0.55, Math.min(900 / graphWidth, 560 / graphHeight) * 0.75));
    setTransform({
      scale,
      x: CENTER_X - ((minX + maxX) / 2) * scale,
      y: CENTER_Y - ((minY + maxY) / 2) * scale,
    });
  }

  function zoomBy(factor: number) {
    setTransform((current) => ({
      ...current,
      scale: Math.min(2.4, Math.max(0.35, current.scale * factor)),
    }));
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? 0.98 : 1.02);
  }

  // Recreated each render so it always reads the current transform.
  function clientToSim(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    const vbX = (clientX - rect.left) * (VIEWBOX_W / rect.width);
    const vbY = (clientY - rect.top) * (VIEWBOX_H / rect.height);
    return {
      x: (vbX - transform.x) / transform.scale,
      y: (vbY - transform.y) / transform.scale,
    };
  }

  return { svgRef, transform, setTransform, resetTransform, fitGraph, zoomBy, onWheel, clientToSim };
}

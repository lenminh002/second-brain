import { Dispatch, MouseEvent, PointerEvent, SetStateAction, useState } from "react";

import type { DragState, SimNode } from "@/types";
import type { GraphSimulationControls } from "./useGraphSimulation";
import type { GraphViewport } from "./useGraphViewport";

export type GraphInteractions = {
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
  dragState: DragState | null;
  setHovered: (id: string | null) => void;
  onBackgroundPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onBackgroundPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onBackgroundPointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  onNodePointerDown: (event: PointerEvent<SVGGElement>, node: SimNode) => void;
  onNodeClick: (event: MouseEvent<SVGGElement>, nodeId: string) => void;
};

type Args = {
  viewport: GraphViewport;
  simulation: GraphSimulationControls;
};

export function useGraphInteractions({ viewport, simulation }: Args): GraphInteractions {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [suppressClickNodeId, setSuppressClickNodeId] = useState<string | null>(null);

  function setHovered(id: string | null) {
    setHoveredNodeId(id);
  }

  function onBackgroundPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.target instanceof SVGElement && event.target.closest("[data-graph-node='true']")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      mode: "pan",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.transform.x,
      originY: viewport.transform.y,
    });
  }

  function onBackgroundPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (dragState.mode === "pan") {
      viewport.setTransform((current) => ({
        ...current,
        x: dragState.originX + event.clientX - dragState.startX,
        y: dragState.originY + event.clientY - dragState.startY,
      }));
      return;
    }

    const simPos = viewport.clientToSim(event.clientX, event.clientY);
    simulation.dragNode(dragState.nodeId, simPos.x, simPos.y);
    const moved = dragState.moved || Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY) > 4;
    if (moved !== dragState.moved) {
      setDragState({ ...dragState, moved });
    }
  }

  function onBackgroundPointerUp(event: PointerEvent<SVGSVGElement>) {
    if (dragState?.pointerId !== event.pointerId) return;
    if (dragState.mode === "pan") {
      const moved = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY) > 4;
      if (!moved) setSelectedNodeId(null);
    } else if (dragState.mode === "node") {
      if (dragState.moved) {
        setSuppressClickNodeId(dragState.nodeId);
        setSelectedNodeId(dragState.nodeId);
      }
      simulation.releaseNode(dragState.nodeId);
    }
    setDragState(null);
  }

  function onNodePointerDown(event: PointerEvent<SVGGElement>, node: SimNode) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    simulation.pinNode(node.id);
    setDragState({
      mode: "node",
      pointerId: event.pointerId,
      nodeId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    });
  }

  function onNodeClick(event: MouseEvent<SVGGElement>, nodeId: string) {
    event.stopPropagation();
    if (suppressClickNodeId === nodeId) {
      setSuppressClickNodeId(null);
      return;
    }
    setSelectedNodeId((current) => (current === nodeId ? null : nodeId));
  }

  return {
    hoveredNodeId,
    selectedNodeId,
    setSelectedNodeId,
    dragState,
    setHovered,
    onBackgroundPointerDown,
    onBackgroundPointerMove,
    onBackgroundPointerUp,
    onNodePointerDown,
    onNodeClick,
  };
}

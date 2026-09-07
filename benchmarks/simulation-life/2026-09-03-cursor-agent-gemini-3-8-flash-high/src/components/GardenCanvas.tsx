import React, { useEffect, useRef } from 'react';
import { GardenScene } from '../renderer/GardenScene';
import { SimulationEngine } from '../simulation/engine';
import { BlobEntity, InteractiveTool } from '../types/simulation';

interface GardenCanvasProps {
  engine: SimulationEngine;
  onBlobSelect: (blob: BlobEntity | null) => void;
  onGroundInteract?: (x: number, z: number, tool: InteractiveTool) => void;
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({
  engine,
  onBlobSelect,
  onGroundInteract,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<GardenScene | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new GardenScene(containerRef.current, engine);
    sceneRef.current = scene;

    scene.onBlobClick = (blob) => {
      onBlobSelect(blob);
    };

    scene.onGroundClick = (x, z, tool) => {
      onGroundInteract?.(x, z, tool);
    };

    // Attach scene resetCamera method to window for easy access
    (window as any).__resetGardenCamera = () => {
      scene.resetCamera();
    };

    return () => {
      scene.destroy();
      sceneRef.current = null;
      delete (window as any).__resetGardenCamera;
    };
  }, [engine]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden outline-none select-none"
    />
  );
};

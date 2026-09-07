import React, { useEffect, useRef, useState } from 'react';
import { GardenScene } from '../renderer/GardenScene';
import { SimulationEngine } from '../simulation/engine';
import { BlobEntity, InteractiveTool } from '../types/simulation';
import { ToolsOverlay } from './ToolsOverlay';
import { Move3d, MousePointerClick } from 'lucide-react';

interface GardenCanvasProps {
  engine: SimulationEngine;
  activeTool: InteractiveTool;
  onSelectTool: (tool: InteractiveTool) => void;
  onSelectBlob: (blob: BlobEntity | null) => void;
  sceneRef: React.MutableRefObject<GardenScene | null>;
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({
  engine,
  activeTool,
  onSelectTool,
  onSelectBlob,
  sceneRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [clickNotice, setClickNotice] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new GardenScene(containerRef.current, engine);
    sceneRef.current = scene;

    scene.onBlobClick = (blob) => {
      onSelectBlob(blob);
    };

    scene.onGroundClick = (x, z, tool) => {
      if (tool === 'feed') {
        // Drop food / spawn extra fruit tree or boost nearby
        engine.plantTreeAt(x, z);
      } else if (tool === 'spawn_blue') {
        engine.spawnBlob('blue', x, z);
      } else if (tool === 'spawn_red') {
        engine.spawnBlob('red', x, z);
      } else if (tool === 'plant_tree') {
        engine.plantTreeAt(x, z);
      }
    };

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, [engine]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Interactive Tool Palette Overlay */}
      <ToolsOverlay activeTool={activeTool} onSelectTool={onSelectTool} />

      {/* 3D Navigation Hint */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-400 pointer-events-none shadow-lg">
        <Move3d className="w-3.5 h-3.5 text-blue-400" />
        <span>Drag to rotate · Scroll to zoom · Click blob to inspect</span>
      </div>
    </div>
  );
};

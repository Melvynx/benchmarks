import React from 'react';
import {
  MousePointer2,
  Apple,
  CircleDot,
  Flame,
  TreePine,
  Zap,
} from 'lucide-react';
import { InteractiveTool } from '../types/simulation';

interface ToolsOverlayProps {
  activeTool: InteractiveTool;
  onSelectTool: (tool: InteractiveTool) => void;
}

export const ToolsOverlay: React.FC<ToolsOverlayProps> = ({
  activeTool,
  onSelectTool,
}) => {
  const tools: { id: InteractiveTool; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
    {
      id: 'inspect',
      label: 'Inspect',
      icon: <MousePointer2 className="w-4 h-4" />,
      desc: 'Click on any blob to inspect vitals & traits, or drag to rotate view',
      color: 'hover:bg-slate-700 text-slate-300',
    },
    {
      id: 'feed',
      label: 'Drop Fruit',
      icon: <Apple className="w-4 h-4" />,
      desc: 'Click on the garden dish or a blob to feed extra energy',
      color: 'hover:bg-emerald-600/30 text-emerald-400',
    },
    {
      id: 'spawn_blue',
      label: 'Add Blue',
      icon: <CircleDot className="w-4 h-4" />,
      desc: 'Click on the garden to spawn a new blue herbivore blob',
      color: 'hover:bg-blue-600/30 text-blue-400',
    },
    {
      id: 'spawn_red',
      label: 'Add Red',
      icon: <Flame className="w-4 h-4" />,
      desc: 'Click on the garden to spawn a new red predator blob',
      color: 'hover:bg-rose-600/30 text-rose-400',
    },
    {
      id: 'plant_tree',
      label: 'Plant Tree',
      icon: <TreePine className="w-4 h-4" />,
      desc: 'Click on the dish to plant a new fruit-bearing tree',
      color: 'hover:bg-emerald-600/30 text-emerald-300',
    },
    {
      id: 'poke',
      label: 'Poke / Scare',
      icon: <Zap className="w-4 h-4" />,
      desc: 'Click on a blob to startle it and scatter nearby creatures',
      color: 'hover:bg-amber-600/30 text-amber-400',
    },
  ];

  const currentToolObj = tools.find((t) => t.id === activeTool) || tools[0];

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
      {/* Tool Bar Buttons */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl pointer-events-auto">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25 scale-105'
                  : `text-slate-400 hover:text-slate-200 ${tool.color}`
              }`}
              title={tool.desc}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tool Tip Hint Banner */}
      <div className="px-3 py-1 bg-slate-950/80 backdrop-blur-sm border border-slate-800/80 rounded-lg text-[11px] text-slate-300 shadow-md max-w-sm pointer-events-none animate-fade-in flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        <span>{currentToolObj.desc}</span>
      </div>
    </div>
  );
};

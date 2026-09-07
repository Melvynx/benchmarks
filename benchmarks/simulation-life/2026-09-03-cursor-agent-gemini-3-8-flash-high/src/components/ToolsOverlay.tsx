import React from 'react';
import {
  MousePointer,
  PlusCircle,
  TreePine,
  Apple,
  Compass,
} from 'lucide-react';
import { InteractiveTool } from '../types/simulation';

interface ToolsOverlayProps {
  activeTool: InteractiveTool;
  onSelectTool: (tool: InteractiveTool) => void;
  onResetCamera: () => void;
}

export const ToolsOverlay: React.FC<ToolsOverlayProps> = ({
  activeTool,
  onSelectTool,
  onResetCamera,
}) => {
  const tools: { id: InteractiveTool; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'inspect',
      label: 'Inspect Blob',
      icon: <MousePointer className="w-4 h-4" />,
      color: 'hover:text-amber-300',
    },
    {
      id: 'spawn_blue',
      label: 'Spawn Blue Blob',
      icon: <PlusCircle className="w-4 h-4 text-sky-400" />,
      color: 'hover:text-sky-300',
    },
    {
      id: 'spawn_red',
      label: 'Spawn Red Blob',
      icon: <PlusCircle className="w-4 h-4 text-rose-400" />,
      color: 'hover:text-rose-300',
    },
    {
      id: 'plant_tree',
      label: 'Plant Fruit Tree',
      icon: <TreePine className="w-4 h-4 text-emerald-400" />,
      color: 'hover:text-emerald-300',
    },
    {
      id: 'drop_fruit',
      label: 'Drop Snack / Berry',
      icon: <Apple className="w-4 h-4 text-lime-400" />,
      color: 'hover:text-lime-300',
    },
  ];

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectTool(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTool === t.id
              ? 'bg-slate-800 text-white shadow-md border border-slate-700 font-semibold'
              : `text-slate-400 ${t.color} hover:bg-slate-800/60`
          }`}
          title={t.label}
        >
          {t.icon}
          <span className="hidden md:inline">{t.label}</span>
        </button>
      ))}

      <div className="h-4 w-px bg-slate-800 mx-1" />

      <button
        onClick={onResetCamera}
        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        title="Reset Camera View"
      >
        <Compass className="w-4 h-4" />
      </button>
    </div>
  );
};

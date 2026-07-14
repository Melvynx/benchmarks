import type { ToolId } from '../../state/types';
import type { Tool } from '../input/types';
import { createHandTool } from './handTool';
import { createSelectTool } from './selectTool';
import { createShapeTool, createTextTool, createLineTool } from './shapeTool';
import { createImageTool } from './imageTool';

export const buildToolbox = (): Record<ToolId, Tool> => ({
  select: createSelectTool(),
  hand: createHandTool(),
  rectangle: createShapeTool('rectangle'),
  ellipse: createShapeTool('ellipse'),
  frame: createShapeTool('frame'),
  polygon: createShapeTool('polygon'),
  line: createLineTool(),
  text: createTextTool(),
  image: createImageTool(),
  pen: createShapeTool('polygon'), // Fallback: pen tool is not implemented fully, degrade to polygon.
});

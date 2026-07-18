import type { SceneDocument } from '../model';
import { applyScenePatches, cloneScenePatch, type ScenePatch } from './patches';

let commandCounter = 0;

function createCommandId(): string {
  commandCounter += 1;
  let suffix: string;
  try {
    suffix = globalThis.crypto.randomUUID();
  } catch {
    suffix = `${Date.now().toString(36)}-${commandCounter}`;
  }
  return `command:${suffix}`;
}

export interface SceneCommand {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
  readonly patches: readonly ScenePatch[];
  execute(scene: SceneDocument): SceneDocument;
  undo(scene: SceneDocument): SceneDocument;
}

export class PatchCommand implements SceneCommand {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
  readonly patches: readonly ScenePatch[];

  constructor(label: string, patches: readonly ScenePatch[]) {
    if (patches.length === 0) {
      throw new Error('A command must contain at least one operation patch');
    }
    this.id = createCommandId();
    this.label = label;
    this.createdAt = new Date().toISOString();
    this.patches = patches.map(cloneScenePatch);
  }

  execute(scene: SceneDocument): SceneDocument {
    return applyScenePatches(scene, this.patches, 'forward');
  }

  undo(scene: SceneDocument): SceneDocument {
    return applyScenePatches(scene, this.patches, 'backward');
  }
}

export class BatchCommand implements SceneCommand {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
  readonly commands: readonly SceneCommand[];
  readonly patches: readonly ScenePatch[];

  constructor(label: string, commands: readonly SceneCommand[]) {
    if (commands.length === 0) {
      throw new Error('A batch command must contain at least one command');
    }
    this.id = createCommandId();
    this.label = label;
    this.createdAt = new Date().toISOString();
    this.commands = [...commands];
    this.patches = commands.flatMap((command) => command.patches.map(cloneScenePatch));
  }

  execute(scene: SceneDocument): SceneDocument {
    return applyScenePatches(scene, this.patches, 'forward');
  }

  undo(scene: SceneDocument): SceneDocument {
    return applyScenePatches(scene, this.patches, 'backward');
  }
}

export function createBatchCommand(label: string, commands: readonly SceneCommand[]): BatchCommand {
  return new BatchCommand(label, commands);
}

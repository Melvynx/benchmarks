import type { SceneDocument } from '../model';
import type { SceneCommand } from './command';

export const MINIMUM_HISTORY_LIMIT = 200;
export const DEFAULT_HISTORY_LIMIT = 300;

export interface HistoryState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoDepth: number;
  readonly redoDepth: number;
  readonly nextUndoLabel: string | null;
  readonly nextRedoLabel: string | null;
}

export class CommandHistory {
  readonly limit: number;
  private undoStack: SceneCommand[] = [];
  private redoStack: SceneCommand[] = [];

  constructor(limit = DEFAULT_HISTORY_LIMIT) {
    if (!Number.isInteger(limit) || limit < MINIMUM_HISTORY_LIMIT) {
      throw new Error(`History limit must be an integer of at least ${MINIMUM_HISTORY_LIMIT}`);
    }
    this.limit = limit;
  }

  execute(scene: SceneDocument, command: SceneCommand): SceneDocument {
    const nextScene = command.execute(scene);
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) {
      this.undoStack.splice(0, this.undoStack.length - this.limit);
    }
    this.redoStack = [];
    return nextScene;
  }

  undo(scene: SceneDocument): SceneDocument {
    const command = this.undoStack.at(-1);
    if (command === undefined) {
      return scene;
    }
    const previousScene = command.undo(scene);
    this.undoStack.pop();
    this.redoStack.push(command);
    return previousScene;
  }

  redo(scene: SceneDocument): SceneDocument {
    const command = this.redoStack.at(-1);
    if (command === undefined) {
      return scene;
    }
    const nextScene = command.execute(scene);
    this.redoStack.pop();
    this.undoStack.push(command);
    return nextScene;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getState(): HistoryState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoDepth: this.undoStack.length,
      redoDepth: this.redoStack.length,
      nextUndoLabel: this.undoStack.at(-1)?.label ?? null,
      nextRedoLabel: this.redoStack.at(-1)?.label ?? null,
    };
  }
}

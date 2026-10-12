export interface Command {
  label: string;
  undo: () => void;
  redo: () => void;
}

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  constructor(private limit = 200) {}

  push(command: Command): void {
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): Command | null {
    const command = this.undoStack.pop() ?? null;
    if (!command) return null;
    command.undo();
    this.redoStack.push(command);
    return command;
  }

  redo(): Command | null {
    const command = this.redoStack.pop() ?? null;
    if (!command) return null;
    command.redo();
    this.undoStack.push(command);
    return command;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get depth(): number {
    return this.undoStack.length;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

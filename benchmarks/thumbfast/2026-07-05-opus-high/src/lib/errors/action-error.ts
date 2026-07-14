import { ApplicationError } from "./application-error";

export class ActionError extends ApplicationError {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

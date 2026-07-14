import { ApplicationError } from "./application-error";

export class ZodRouteError extends ApplicationError {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status ?? 400;
  }
}

export interface RegionsModError extends Error {
  name: string;
  message: string;
  code: string;
  context?: Record<string, unknown>;
}

export type RegionsModErrorHandler = (err: RegionsModError) => void;

let regionsModErrorHandler: RegionsModErrorHandler = (err) => {
  console.error(`[Regions][${err.code}] ${err.message}`, err.context ?? {});
};

export function setRegionsModErrorHandler(handler: RegionsModErrorHandler): void {
  regionsModErrorHandler = handler;
}

export function handleRegionsModError(err: RegionsModError): void {
  regionsModErrorHandler(err);
}

export class DatasetRuntimeError extends Error implements RegionsModError {
  code: string;
  context?: Record<string, unknown>;
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'DatasetRuntimeError';
    this.code = code;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RegistryError extends Error implements RegionsModError {
  code: string;
  context?: Record<string, unknown>;
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'RegistryError';
    this.code = code;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

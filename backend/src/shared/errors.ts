/**
 * Thrown when an agent or caller requests an unrecognized tool.
 * Handled by the firewall as "Unknown tool → Block" per PRD specification.
 */
export class ToolNotFoundError extends Error {
  public readonly toolId: string;

  constructor(toolId: string) {
    super(`Tool '${toolId}' was not found in the registry`);
    this.name = "ToolNotFoundError";
    this.toolId = toolId;
    Object.setPrototypeOf(this, ToolNotFoundError.prototype);
  }
}

/**
 * Thrown when an agent attempts to invoke a disabled tool.
 */
export class ToolDisabledError extends Error {
  public readonly toolId: string;

  constructor(toolId: string) {
    super(`Tool '${toolId}' is currently disabled in the registry`);
    this.name = "ToolDisabledError";
    this.toolId = toolId;
    Object.setPrototypeOf(this, ToolDisabledError.prototype);
  }
}

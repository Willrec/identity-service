/**
 * EmailDispatchError
 *
 * Exception thrown when a transactional email fails to dispatch.
 * Placed in the module-level shared folder to avoid circular or cross-layer dependencies.
 */
export class EmailDispatchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EmailDispatchError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

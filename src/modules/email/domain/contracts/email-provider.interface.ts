import type { Email } from '../models/email.model.js';

export interface IEmailProvider {
  send(email: Email): Promise<void>;
}

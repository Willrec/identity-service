import type { Request, Response } from 'express';

export interface OAuthFlowState {
  readonly state: string;
  readonly codeVerifier: string;
}

export interface IOAuthFlowStore {
  store(res: Response, data: OAuthFlowState): Promise<void>;
  load(req: Request): Promise<OAuthFlowState | null>;
  clear(res: Response): Promise<void>;
}

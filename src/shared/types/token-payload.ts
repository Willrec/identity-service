export interface TokenPayload {
  sub: string; // user id
  email: string;
  iat?: number;
  exp?: number;
}

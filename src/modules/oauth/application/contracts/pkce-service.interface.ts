export interface IPkceService {
  generateVerifier(): string;
  generateChallenge(verifier: string): string;
}

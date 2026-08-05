export interface OAuthAuthorizationDto {
  readonly authorizationUrl: string;
  readonly state: string;
  readonly codeVerifier: string;
}

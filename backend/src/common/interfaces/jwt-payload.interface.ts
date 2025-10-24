export interface JwtPayload {
  sub: string; // user id
  email: string;
  workspaceId?: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

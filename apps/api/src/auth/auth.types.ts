import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
}

/** The user attached to each authenticated request. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

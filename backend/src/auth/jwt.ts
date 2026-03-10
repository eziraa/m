import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { userRoleEnum } from "../db/schema.js";

type Role = (typeof userRoleEnum.enumValues)[number];

export type AuthTokenPayload = {
  sub: string;
  role: Role;
  telegramId: string;
  agentId: string | null;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "8h",
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

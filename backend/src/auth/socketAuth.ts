import { Socket } from "socket.io";

import { verifyAuthToken } from "./jwt.js";

export type SocketIdentity = {
  userId: string;
  role: "ADMIN" | "AGENT" | "USER";
  telegramId: string;
  agentId: string | null;
};

export function authenticateSocket(socket: Socket): SocketIdentity | null {
  const authHeader = socket.handshake.auth?.token;
  const bearer = socket.handshake.headers.authorization;

  let token: string | null = null;
  if (typeof authHeader === "string" && authHeader.length > 0) {
    token = authHeader;
  } else if (typeof bearer === "string" && bearer.startsWith("Bearer ")) {
    token = bearer.slice(7);
  }

  if (!token) {
    return null;
  }

  try {
    const payload = verifyAuthToken(token);
    return {
      userId: payload.sub,
      role: payload.role,
      telegramId: payload.telegramId,
      agentId: payload.agentId,
    };
  } catch {
    return null;
  }
}

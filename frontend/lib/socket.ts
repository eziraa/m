import { io, Socket } from "socket.io-client";

import { getApiBase } from "./api";

let socketRef: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socketRef) {
    return socketRef;
  }

  socketRef = io(getApiBase(), {
    auth: {
      token,
    },
    transports: ["websocket"],
  });

  return socketRef;
}

export function closeSocket() {
  socketRef?.disconnect();
  socketRef = null;
}

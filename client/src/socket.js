import { io } from "socket.io-client";
import { getToken } from "./api.js";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io("/", { auth: { token: getToken() } });
  }
  return socket;
}

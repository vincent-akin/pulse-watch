"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getAccessToken } from "./tokenStorage";
import { API_BASE_URL } from "./apiClient";
import { useOrg } from "./OrgContext";

const SocketContext = createContext({ socketRef: { current: null }, connected: false });

// One real Socket.IO connection per organization, shared across every page — individual pages
// subscribe to events via useSocket() below rather than each opening their own connection.
export function SocketProvider({ children }) {
  const { currentOrgId } = useOrg();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!currentOrgId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects real socket lifecycle, not derived render state
      setConnected(false);
      return undefined;
    }
    const token = getAccessToken();
    if (!token) {
      setConnected(false);
      return undefined;
    }

    const wsBase = API_BASE_URL.replace(/\/api\/v1$/, "");
    const socket = io(wsBase, { path: "/ws", auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", currentOrgId);
      setConnected(true);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    return () => {
      socket.emit("leave", currentOrgId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [currentOrgId]);

  return <SocketContext.Provider value={{ socketRef, connected }}>{children}</SocketContext.Provider>;
}

export function useSocketConnection() {
  return useContext(SocketContext);
}

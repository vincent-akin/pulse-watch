"use client";

import { useEffect, useRef } from "react";
import { useSocketConnection } from "./SocketContext";

// Events mirror the backend's WebSocket table 1:1 (API Specification § WebSocket Events).
const EVENTS = [
  "monitor.updated",
  "healthcheck.completed",
  "incident.opened",
  "incident.closed",
  "notification.sent",
  "sslcertificate.expiring",
  "domain.expiring",
];

// Subscribes to real-time domain events on the shared connection from SocketProvider.
// `organizationId` is accepted for call-site clarity (and as a hint that this page cares about
// org-scoped events) but the connection itself is already scoped by SocketProvider.
export function useSocket(organizationId, handlers = {}) {
  const { socketRef, connected } = useSocketConnection();
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !organizationId) return undefined;

    const bound = EVENTS.map((event) => {
      const fn = (payload) => handlersRef.current[event]?.(payload);
      socket.on(event, fn);
      return [event, fn];
    });

    return () => bound.forEach(([event, fn]) => socket.off(event, fn));
    // `connected` triggers re-binding after a reconnect, when socketRef.current has changed.
  }, [socketRef, connected, organizationId]);

  return { connected };
}

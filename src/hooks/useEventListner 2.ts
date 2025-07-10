import { type EventHandler, useEffect, useLayoutEffect } from "react";

export interface WindowListener {
  event: keyof WindowEventMap;
  handler: EventHandler<any>;
}

export default function useWindowListener(params: WindowListener[]) {
  useEffect(() => {
    params.forEach(({ handler, event }) => {
      window.addEventListener(event, handler);
    });
    return () => {
      params.forEach(({ handler, event }) => {
        window.removeEventListener(event, handler);
      });
    };
  }, []);
}
export function useLayOutWindowListener(params: WindowListener[]) {
  useLayoutEffect(() => {
    params.forEach(({ handler, event }) => {
      window.addEventListener(event, handler);
    });
    return () => {
      params.forEach(({ handler, event }) => {
        window.removeEventListener(event, handler);
      });
    };
  }, []);
}

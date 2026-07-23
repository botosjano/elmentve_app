"use client";

import { useEffect } from "react";

/** A /sw.js regisztrálása (csak production buildben, hogy a dev HMR ne ütközzön). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* a SW hiánya sosem törheti meg az appot */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}

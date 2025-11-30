"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw-driver.js")
      .then((reg) => {
        console.log("Driver PWA registered:", reg.scope);
      })
      .catch((err) => console.error("Service worker registration failed:", err));
  }, []);

  return null;
}
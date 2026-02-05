import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LeaveProvider } from "./context/LeaveContext";
import { SidebarProvider } from "./context/SidebarContext";
import { ThemeProvider } from "./context/ThemeContext";

// ===== DEBUG: กันจอขาวแบบเงียบ =====
window.addEventListener("error", (e) => {
  console.error("[window.error]", (e as any).message, (e as any).error);
});
window.addEventListener("unhandledrejection", (e: any) => {
  console.error("[unhandledrejection]", e.reason);
});

console.log("[main] booting...");

// ✅ โหลด devtools แบบไม่ทำให้เว็บพัง
if (import.meta.env.DEV) {
  import("./devtools")
    .then((m) => m.installDevTools())
    .catch((err) => console.error("[devtools import error]", err));
}

console.log("[main] about to render...");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <LeaveProvider>
            <SidebarProvider>
              <App />
            </SidebarProvider>
          </LeaveProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

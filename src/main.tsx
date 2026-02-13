import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LeaveProvider } from "./context/LeaveContext";
import { SidebarProvider } from "./context/SidebarContext";
import { ThemeProvider } from "./context/ThemeContext";

// ✅ เพิ่ม
import { DialogCenterProvider } from "./components/common/DialogCenter";
// (ถ้าคุณใช้ ToastCenterProvider ด้วย ให้ import และครอบตรงนี้ด้วย)

window.addEventListener("error", (e) => {
  console.error("[window.error]", (e as any).message, (e as any).error);
});
window.addEventListener("unhandledrejection", (e: any) => {
  console.error("[unhandledrejection]", e.reason);
});

console.log("[main] booting...");

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
              {/* ✅ ครอบ provider ตรงนี้ */}
              <DialogCenterProvider>
                <App />
              </DialogCenterProvider>
            </SidebarProvider>
          </LeaveProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

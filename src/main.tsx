import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";

import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

// ====== TITLE FIREWALL: บล็อก title ที่ไม่ใช่ของเรา ======
const APP_TITLE_PREFIX = "Smart HR @PEA ENCOM SMART";

// ตั้งเริ่มต้นทันที
document.title = APP_TITLE_PREFIX;

// patch setter ของ document.title ให้บล็อกค่าที่ไม่ขึ้นต้นด้วยชื่อเรา
(() => {
  const desc = Object.getOwnPropertyDescriptor(Document.prototype, "title");
  if (!desc?.get || !desc?.set) return;

  Object.defineProperty(Document.prototype, "title", {
    configurable: true,
    get() {
      return desc.get!.call(this);
    },
    set(value: string) {
      const next = String(value ?? "");

      // ✅ อนุญาตเฉพาะ title ที่ขึ้นต้นด้วยชื่อเรา
      // (ถ้าคุณอยากให้ยืดหยุ่น เป็น includes ก็ได้)
      if (!next.startsWith(APP_TITLE_PREFIX)) {
        // บล็อกทิ้ง ไม่ให้โดนทับกลับชื่อเก่า
        return;
      }

      desc.set!.call(this, next);
    },
  });
})();
// ===========================================================

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);

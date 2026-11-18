import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: { borderRadius: 2, fontSize: 14, fontWeight: 500, color: "#1b2440", boxShadow: "0 12px 32px -12px rgb(15 23 46 / 0.35)" },
              success: { iconTheme: { primary: "#0d9488", secondary: "#fff" } },
              error: { iconTheme: { primary: "#d61f45", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>
);

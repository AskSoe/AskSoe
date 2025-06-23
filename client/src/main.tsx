import { createRoot } from "react-dom/client";
import { ChatProvider } from "./hooks/use-chat";
import App from "./App";
import "./index.css";

// Ensure CSS is loaded before rendering
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <ChatProvider>
      <App />
    </ChatProvider>
  );
}

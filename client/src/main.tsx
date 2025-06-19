import { createRoot } from "react-dom/client";
import { ChatProvider } from "./hooks/use-chat";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ChatProvider>
    <App />
  </ChatProvider>
);

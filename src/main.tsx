import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureLeadAttribution } from "./lib/leadTracking";
import { installAutomaticGoalTracking } from "./lib/metrika";

const redirectPath = sessionStorage.getItem("redirectPath");

if (redirectPath) {
  sessionStorage.removeItem("redirectPath");
  window.history.replaceState(null, "", redirectPath);
}

captureLeadAttribution();
installAutomaticGoalTracking();

createRoot(document.getElementById("root")!).render(<App />);

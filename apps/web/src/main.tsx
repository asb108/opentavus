import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/figtree";
import "@excalidraw/excalidraw/index.css";
import "katex/dist/katex.min.css";
import App from "./App";
import "./styles.css";

Object.assign(window, { EXCALIDRAW_ASSET_PATH: "/" });
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

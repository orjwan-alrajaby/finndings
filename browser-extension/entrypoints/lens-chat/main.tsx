import React from "react";
import ReactDOM from "react-dom/client";

import "@/assets/tailwind.css";
import { LensChat } from "./LensChat";

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <LensChat />
    </React.StrictMode>,
);

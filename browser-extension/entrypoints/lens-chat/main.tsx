import React from "react";
import ReactDOM from "react-dom/client";
import * as Tooltip from "@radix-ui/react-tooltip";

import "@/assets/tailwind.css";
import { LensChat } from "./LensChat";

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
    /*
     * The chat borrows fields from the rest of Lens — the rental period's
     * label carries an explanation behind an "i" — and those are Radix
     * tooltips, which throw outside a provider. Every other Lens page has one;
     * this one needed its own.
     */
    <React.StrictMode>
        <Tooltip.Provider delayDuration={250}>
            <LensChat />
        </Tooltip.Provider>
    </React.StrictMode>,
);

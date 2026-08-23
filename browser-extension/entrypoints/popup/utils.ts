import toast from "react-hot-toast";
   
type ActionType = "OPEN_REVIEW_TAB" | "OPEN_COMPARE_TAB" | "OPEN_DOWNLOAD_AS_PDF_PAGE" | "OPEN_SETTINGS_TAB";

export const openBrowserTab = async (actionType: ActionType) => {
        const map = {
            "OPEN_REVIEW_TAB": "review",
            "OPEN_COMPARE_TAB": "compare",
            "OPEN_DOWNLOAD_AS_PDF_PAGE": "download as pdf",
            "OPEN_SETTINGS_TAB": "settings"
        }
        try {
            await browser.runtime.sendMessage({ type: actionType });
        } catch {
            const pageName = map[actionType];
            toast.error(`Something went wrong. Couldn't open the "${pageName}" page.`);
        }
    };
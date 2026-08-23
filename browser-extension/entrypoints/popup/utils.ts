import toast from "react-hot-toast";
   
type ActionType = "OPEN_COMPARE_PAGE" | "OPEN_SETTINGS_PAGE";

export const openBrowserTab = async (actionType: ActionType) => {
        const map = {
            "OPEN_COMPARE_PAGE": "compare",
            "OPEN_SETTINGS_PAGE": "settings"
        }
        try {
            await browser.runtime.sendMessage({ type: actionType });
        } catch {
            const pageName = map[actionType];
            toast.error(`Something went wrong. Couldn't open the "${pageName}" page.`);
        }
    };
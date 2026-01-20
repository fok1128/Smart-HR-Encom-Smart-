import { useEffect } from "react";
import { useLocation } from "react-router-dom";
const APP_TITLE = "Smart HR @PEA ENCOM SMART";
export default function TitleManager() {
    const location = useLocation();
    useEffect(() => {
        document.title = APP_TITLE;
    }, [location.pathname]);
    return null;
}

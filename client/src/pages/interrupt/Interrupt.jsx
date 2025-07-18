import "./Interrupt.scss";
import {useEffect} from "react";
import {doRedirectToProxyLocation, saveContinueURL} from "../../utils/ProxyAuthz";

/**
 * This is the route where we end up if a user tries to log in at another service and is interrupted because:
 * 2fa is required
 * general app-aup needs to be agreed with
 * service-aup needs to be agreed with
 * new user has to be provisioned JIT
 */
export default function Interrupt({config, history}) {

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const continueUrl = urlSearchParams.get("continue_url");
        const ebToggle = urlSearchParams.get("eb_toggle");
        saveContinueURL(config, continueUrl);
        const errorStatus = parseInt(urlSearchParams.get("error_status"), 10);
        // The user is already logged in, so mfa and aup are taken care of
        switch (errorStatus) {
            case 97: // NEW_FREE_RIDE_USER
                history.push(`/${ebToggle ? "service-aup" : "delay"}${window.location.search}`);
                break;
            case 100: // SERVICE_AUP_NOT_AGREED
                history.push(`/service-aup${window.location.search}`);
                break;
            default:
                doRedirectToProxyLocation();
        }
    }, [])

}

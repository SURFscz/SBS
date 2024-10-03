import "./Interrupt.scss";

//TODO - have one place for interrupt logic. Check continue URL and make this available
//This needs to be behind a protected route, which means that AUP, MFA and Service AUPS are handled automatically
//store the continue url in the user session, and finally when we arrive here, then redirect
//Remove all other notions of continue_url and also combine service-aup, missing-service-aup
//Remove the second_fa_uuid of the user, we don't need this anymore, as we only perform mfa for logged in users
export default function Interrupt({history}) {
    console.log(history);

    /**
     *
     * const continueUrl = urlSearchParams.get("continue_url");
     * const continueUrlTrusted = config.continue_eduteams_redirect_uri;
     * if (continueUrl && !continueUrl.toLowerCase().startsWith(continueUrlTrusted.toLowerCase())) {
     *     throw new Error(`Invalid continue url: '${continueUrl}'`)
     * }
     *
     *
     * interrupt:
     * "error_status"
     *
     * "2fa/{user.second_fa_uuid}" 101
     * "service-aup" 1, 2
     * "delay" 97
     */
}
import React, {FC, useEffect, useState} from "react";
import {RouteComponentProps, withRouter} from "react-router-dom";
import I18n from "../../locale/I18n";
import "./Aup.scss";
import Button from "../../components/button/Button";
import {agreeAup} from "../../api/aup";
import CheckBox from "../../components/checkbox/CheckBox";
import {login} from "../../utils/Login";
import SpinnerField from "../../components/redesign/spinner-field/SpinnerField";
import DOMPurify from "dompurify";
import {redirectToProxyLocation} from "../../utils/ProxyAuthz";
import {dictToQueryParams} from "../../utils/QueryParameters";
import {AppConfig} from "@/api/config";

type CurrentUser = {
    guest: boolean;
    user_accepted_aup: boolean;
    given_name?: string | null;
    name?: string | null;
    email?: string | null;
};

type AupConfig = {
    url_aup_en?: string;
    url_aup_nl?: string;
};

export type AupProps = RouteComponentProps & {
    config: AppConfig;
    currentUser: CurrentUser;
    refreshUser: (callback: () => void) => void;
    aupConfig: AupConfig;
};

export const Aup: FC<AupProps> = ({config, currentUser, refreshUser, aupConfig, history}) => {
    const [agreed, setAgreed] = useState(false);
    const loading = currentUser.guest || currentUser.user_accepted_aup;

    useEffect(() => {
        if (currentUser.guest) {
            setTimeout(login, 5);
        } else if (currentUser.user_accepted_aup) {
            history.push("/home");
        }
    }, [currentUser.guest, currentUser.user_accepted_aup, history]);

    const agreeWith = () => agreeAup().then(res => {
        refreshUser(() => {
            const item = window.sessionStorage.getItem("interrupt");
            if (item) {
                const interruptDict = JSON.parse(item);
                const params = dictToQueryParams(interruptDict);
                history.push(`/interrupt?${params}`);
            } else {
                redirectToProxyLocation(res.location, history, config);
            }
        });
    });

    const url = I18n.locale === "en" ? aupConfig.url_aup_en : aupConfig.url_aup_nl;
    if (loading) {
        return <SpinnerField/>;
    }

    return (
        <div className="mod-aup">
            <h1>{I18n.t("aup.hi", {name: currentUser.given_name || currentUser.name || currentUser.email || ""})}</h1>
            <p className=""
               dangerouslySetInnerHTML={{
                   __html: DOMPurify.sanitize(I18n.t("aup.disclaimer", {url: url}),
                       {ADD_ATTR: ['target']})
               }}/>
            <div className="terms">
                <CheckBox name="aup" value={agreed} info={I18n.t("aup.agreeWithTerms")}
                          onChange={() => setAgreed(!agreed)}/>
            </div>
            <Button className="proceed" onClick={agreeWith}
                    txt={I18n.t("aup.onward")} disabled={!agreed}/>

        </div>
    )
}

export default withRouter(Aup);

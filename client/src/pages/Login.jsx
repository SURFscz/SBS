import React from "react";
import "./Login.scss";
import I18n from "i18n-js";
import {health} from "../api";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import InfoNl from "../components/landing/InfoNl";
import InfoEn from "../components/landing/InfoEn";
import {login} from "../utils/Login";
import {getParameterByName} from "../utils/QueryParameters";

class Login extends React.Component {

    componentDidMount = () => health();

    render() {
        const {user} = this.props;
        const logout = getParameterByName("logout", window.location.search);
        const afterDelete = getParameterByName("delete", window.location.search);
        return (
            <div className="mod-login">
                <div className="title">
                    {logout && <h1 className="logout-msg">{I18n.t("login.closeBrowser")}</h1>}
                    {afterDelete && <h1 className="logout-msg">{I18n.t("login.closeBrowserAfterDelete")}</h1>}
                    {user.guest &&
                    <a href="/login" onClick={login}><FontAwesomeIcon
                        icon="arrow-right"/>{I18n.t("not_found.loginLink")}
                    </a>}
                </div>
                {I18n.locale === "nl" ? <InfoNl/> : <InfoEn/>}
            </div>);
    };
}

export default Login;
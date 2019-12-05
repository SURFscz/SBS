import React from "react";
import "./Login.scss";
import I18n from "i18n-js";
import {health} from "../api";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import InfoNl from "../components/landing/InfoNl";
import InfoEn from "../components/landing/InfoEn";
import {login} from "../utils/Login";

class Login extends React.Component {

    componentDidMount = () => health();

    render() {
        const {user} = this.props;
        return (
            <div className="mod-login">
                <div className="title">
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
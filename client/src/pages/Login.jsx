import React from "react";
import "./Login.scss";
import I18n from "i18n-js";
import {health} from "../api";
import {isEmpty, pseudoGuid, stopEvent} from "../utils/Utils";
import {getParameterByName} from "../utils/QueryParameters";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import InfoNl from "../components/landing/InfoNl";
import InfoEn from "../components/landing/InfoEn";

class Login extends React.Component {

    componentDidMount = () => health();

    login = e => {
        stopEvent(e);
        const state = getParameterByName("state", window.location.search);
        const guid = pseudoGuid();
        const queryParameter = isEmpty(state) ? `?guid=${guid}` : `?guid=${guid}&state=${encodeURIComponent(state)}`;
        window.location.href = `/login${queryParameter}`;
    };

    render() {
        const {user} = this.props;
        return (
            <div className="mod-login">
                <div className="title">
                    {user.guest &&
                    <a href="/login" onClick={this.login}><FontAwesomeIcon icon="arrow-right"/>{I18n.t("not_found.loginLink")}
                    </a>}
                </div>
                {I18n.locale === "nl" ? <InfoNl/> : <InfoEn/>}
            </div>);
    };
}

export default Login;
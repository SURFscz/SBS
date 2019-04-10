import React from "react";
import "./Login.scss";
import I18n from "i18n-js";
import {health} from "../api";
import {isEmpty, pseudoGuid, stopEvent} from "../utils/Utils";
import {getParameterByName} from "../utils/QueryParameters";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class Login extends React.Component {

    componentDidMount = () => health();

    render() {
        const {user} = this.props;
        return (
            <div className="mod-login">
                <div className="title">
                    <p>{I18n.t("login.title")}</p>
                    {user.guest && <a href="/login" onClick={e => {
                    stopEvent(e);
                    const state = getParameterByName("state", window.location.search);
                    const guid = pseudoGuid();
                    const queryParameter = isEmpty(state) ? `?guid=${guid}` : `?guid=${guid}&state=${encodeURIComponent(state)}`;
                    window.location.href = `/login${queryParameter}`;
                }}><FontAwesomeIcon icon="arrow-right"/>{I18n.t("not_found.loginLink")}</a>}
                </div>
            </div>);
    };
}

export default Login;
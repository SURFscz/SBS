import React from "react";
import "./Login.scss";
import I18n from "i18n-js";
import {health} from "../api";

class Login extends React.Component {

    componentWillMount = () => health();

    render() {
        return (
            <div className="mod-login">
                <div className="title">
                    <p>{I18n.t("login.title")}</p>
                    <em>{I18n.t("login.subTitle")}</em>
                </div>
            </div>);
    };
}

export default Login;
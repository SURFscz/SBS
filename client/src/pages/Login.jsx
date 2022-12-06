import React from "react";
import "./Login.scss";
import I18n from "i18n-js";
import {health} from "../api";
import {getParameterByName} from "../utils/QueryParameters";
import HappyLogo from "../icons/landing/happy.svg";
import Button from "../components/Button";
import {login} from "../utils/Login";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import DOMPurify from "dompurify";
import LandingInfo from "../components/LandingInfo";

class Login extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
        };
    }

    componentDidMount = () => health().then(() => {
        const logout = getParameterByName("logout", window.location.search);
        const afterDelete = getParameterByName("delete", window.location.search);
        if (logout || afterDelete) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: logout ? I18n.t("login.closeBrowser") : I18n.t("login.closeBrowserAfterDelete")
            });
        }
        const {rateLimited} = this.props;
        if (rateLimited) {
            setFlash(I18n.t("login.rateLimited"), "error");
        }
    });

    render() {
        const {confirmationDialogOpen, confirmationDialogAction, confirmationQuestion} = this.state;
        return (
            <div className="top-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    confirm={confirmationDialogAction}
                                    confirmationTxt={I18n.t("confirmationDialog.ok")}
                                    question={confirmationQuestion}/>
                <div className="mod-login-container">
                    <div className="mod-login">
                        <div className="header-left">
                            <h1 dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("landing.header.title"))}}/>
                            <Button txt={"Login"}
                                    html={I18n.t("landing.header.login")}
                                    onClick={login}/>
                            <p className={"sup"}
                               dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("landing.header.sup"))}}/>
                        </div>
                        <div className="header-right">
                            <img src={HappyLogo} alt="logo"/>
                        </div>
                    </div>
                </div>
                <LandingInfo/>
            </div>)
    }
}

export default Login;
import React from "react";
import "./Login.scss";
import I18n from "../locale/I18n";
import {health} from "../api";
import HappyLogo from "../icons/landing/happy.svg";
import BlackHole from "../icons/undraw_void_-3-ggu.svg";
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
            spin: false
        };
    }

    componentDidMount = () => health().then(() => {
        const {rateLimited} = this.props;
        if (rateLimited) {
            setFlash(I18n.t("login.rateLimited"), "error");
        }
    });

    toggleSpin = () => {
        this.setState({spin: true})
        setTimeout(() => this.setState({spin: false}), 725);
    }

    render() {
        const {confirmationDialogOpen, confirmationDialogAction, confirmationQuestion, spin} = this.state;
        const {user} = this.props;
        return (
            <div className="top-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    confirm={confirmationDialogAction}
                                    confirmationTxt={I18n.t("confirmationDialog.ok")}
                                    question={confirmationQuestion}/>
                <div className="mod-login-container">
                    <div className="mod-login">
                        <div className="header-left">
                            <h2 className={"header-title"}
                                dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("landing.header.title"))}}/>
                            <Button txt={I18n.t("landing.header.login")}
                                    disabled={user.suspended}
                                    onClick={login}/>
                            <p className={"sup"}
                               dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("landing.header.sup"))}}/>
                        </div>
                        <div className="header-right">
                            <img className={spin ? "spin" : ""}
                                 onClick={() => this.toggleSpin()}
                                 src={user.suspended ? BlackHole : HappyLogo}
                                 alt="logo"/>
                        </div>
                    </div>
                </div>
                <LandingInfo/>
            </div>)
    }
}

export default Login;
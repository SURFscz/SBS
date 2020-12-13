import React from "react";
import "./Login.scss";
import I18n from "i18n-js";
import {health} from "../api";
import {getParameterByName} from "../utils/QueryParameters";
import {ReactComponent as IllustrationCO} from "../icons/illustration-CO.svg";
import Button from "../components/Button";
import {login} from "../utils/Login";
import ConfirmationDialog from "../components/ConfirmationDialog";

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
    });

    benefitsBlock = name => <div key={name} className={`${name} benefits`}>
        <h1>{I18n.t("landing.benefits", {name})}</h1>
        <p dangerouslySetInnerHTML={{__html: I18n.t(`landing.${name}.subTitle`)}}/>
        <ul>
            {I18n.translations[I18n.locale].landing[name].features.map((feature, i) =>
                <li key={i} dangerouslySetInnerHTML={{__html: feature}}/>)}
        </ul>
        {I18n.translations[I18n.locale].landing[name].postTitle &&
        <p className="post-title" dangerouslySetInnerHTML={{__html: I18n.t(`landing.${name}.postTitle`)}}/>}
    </div>

    render() {
        const {confirmationDialogOpen, confirmationDialogAction, confirmationQuestion} = this.state;
        return (
            <div className="top-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    confirm={confirmationDialogAction}
                                    confirmationTxt={I18n.t("confirmationDialog.ok")}
                                    question={confirmationQuestion}/>
                <div className="mod-login-container">
                    <div className="mod-login-top">
                        <div className="header-left">
                            <h1 dangerouslySetInnerHTML={{__html: I18n.t("landing.header.title")}}/>
                            <p className="larger"
                               dangerouslySetInnerHTML={{__html: I18n.t("landing.header.subTitle")}}/>
                            <Button txt={I18n.t("header.links.login")} onClick={login}/>
                        </div>
                        <div className="header-right">
                            <IllustrationCO/>
                        </div>
                    </div>
                </div>
                <div className="mod-login-container bottom">
                    <div className="mod-login-bottom">
                        <div className="pre-title">
                            <p className="larger" dangerouslySetInnerHTML={{__html: I18n.t("landing.title")}}/>
                        </div>
                        {["managers", "researchers", "institutions"].map(name => this.benefitsBlock(name))}
                        <div className="service_providers grey-block">
                            <h1 dangerouslySetInnerHTML={{__html: I18n.t("landing.serviceProvider.title")}}/>
                            <p dangerouslySetInnerHTML={{__html: I18n.t("landing.serviceProvider.subTitle")}}/>
                        </div>
                        <div className="help_support grey-block">
                            <h1 dangerouslySetInnerHTML={{__html: I18n.t("landing.help.title")}}/>
                            <p dangerouslySetInnerHTML={{__html: I18n.t("landing.help.subTitle")}}/>
                        </div>
                    </div>
                </div>
            </div>);
    };
}

export default Login;
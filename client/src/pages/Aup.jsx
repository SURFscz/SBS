import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "../locale/I18n";
import "./Aup.scss";
import Button from "../components/Button";
import {agreeAup} from "../api";
import CheckBox from "../components/CheckBox";
import {login} from "../utils/Login";
import SpinnerField from "../components/redesign/SpinnerField";
import DOMPurify from "dompurify";

class Aup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {agreed: false, loading: true};
    }

    componentDidMount = () => {
        const {currentUser} = this.props;
        if (currentUser.guest) {
            setTimeout(login, 5);
        } else if (currentUser.user_accepted_aup && 1!=1) {
            this.props.history.push("/home");
        } else {
            this.setState({loading: false})
        }
    }

    agreeWith = () => agreeAup().then(res => {
        this.props.refreshUser(() => {
            const {config} = this.props;
            const url = new URL(res.location);

             /* if the location is a trusted url, redirect to that url,
              * otherwise only use the local part of the url */
            const urlTrusted = config.continue_eduteams_redirect_uri;
            if (res.location.toLowerCase().startsWith(urlTrusted.toLowerCase())) {
               this.props.history.push(url.href);
            } else {
                this.props.history.push(url.pathname + url.search);
            }
        });
    });

    render() {
        const {agreed, loading} = this.state;
        const {currentUser, aupConfig} = this.props;
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
                              onChange={() => this.setState({agreed: !agreed})}/>
                </div>
                <Button className="proceed" onClick={this.agreeWith}
                        txt={I18n.t("aup.onward")} disabled={!agreed}/>

            </div>
        )
    }
}

export default withRouter(Aup);
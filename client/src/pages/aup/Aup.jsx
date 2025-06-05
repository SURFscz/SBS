import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "../../locale/I18n";
import "./Aup.scss";
import Button from "../../components/button/Button";
import {agreeAup} from "../../api";
import CheckBox from "../../components/checkbox/CheckBox";
import {login} from "../../utils/Login";
import SpinnerField from "../../components/redesign/spinner-field/SpinnerField";
import DOMPurify from "dompurify";
import {redirectToProxyLocation} from "../../utils/ProxyAuthz";
import {dictToQueryParams} from "../../utils/QueryParameters";

class Aup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {agreed: false, loading: true};
    }

    componentDidMount = () => {
        const {currentUser} = this.props;
        if (currentUser.guest) {
            setTimeout(login, 5);
        } else if (currentUser.user_accepted_aup) {
            this.props.history.push("/home");
        } else {
            this.setState({loading: false})
        }
    }

    agreeWith = config => agreeAup().then(res => {
        this.props.refreshUser(() => {
            const item = window.sessionStorage.getItem("interrupt");
            if (item) {
                const interruptDict = JSON.parse(item);
                const params = dictToQueryParams(interruptDict);
                this.props.history.push(`/interrupt?${params}`);
            } else {
                redirectToProxyLocation(res.location, this.props.history, config);
            }
        });
    });

    render() {
        const {agreed, loading} = this.state;
        const {config, currentUser, aupConfig} = this.props;
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
                <Button className="proceed" onClick={() => this.agreeWith(config)}
                        txt={I18n.t("aup.onward")} disabled={!agreed}/>

            </div>
        )
    }
}

export default withRouter(Aup);

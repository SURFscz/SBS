import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "i18n-js";
import "./Aup.scss";
import Button from "../components/Button";
import {agreeAup} from "../api";
import CheckBox from "../components/CheckBox";


class Aup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {agreed: false};
    }

    componentDidMount = () => {
        const {currentUser}  = this.props;
        if (currentUser.user_accepted_aup) {
            this.props.history.push("/home");
        }
    }


    agreeWith = () => agreeAup().then(res => {
        this.props.refreshUser(user => {
            const url = new URL(res.location);
            this.props.history.push(url.pathname + url.search);
        });
    });

    render() {
        const {agreed} = this.state;
        const {currentUser, aupConfig} = this.props;
        const url = I18n.locale === "en" ? aupConfig.url_aup_en : aupConfig.url_aup_nl;
        return (
            <div className="mod-aup">
                <h1>{I18n.t("aup.hi", {name: currentUser.given_name || currentUser.name})}</h1>
                <div className="disclaimer">
                    <p dangerouslySetInnerHTML={{__html: I18n.t("aup.info")}}/>
                </div>
                <h2 dangerouslySetInnerHTML={{__html: I18n.t("aup.title")}}/>
                <p className="" dangerouslySetInnerHTML={{__html: I18n.t("aup.disclaimer", {url: url})}}/>
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
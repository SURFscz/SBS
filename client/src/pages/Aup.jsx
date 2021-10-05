import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "i18n-js";
import "./Aup.scss";
import Button from "../components/Button";
import {agreeAup, aupLinks} from "../api";
import CheckBox from "../components/CheckBox";
import {getParameterByName} from "../utils/QueryParameters";


class Aup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {aup: {}, agreed: false};
    }

    componentDidMount() {
        aupLinks().then(res => this.setState({"aup": res}));
    }

    agreeWith = () => agreeAup().then(() => {
        const {action} = this.props;
        if (action) {
            action();
        } else {
            this.props.refreshUser(() => {
                const location = getParameterByName("state", window.location.search) || "/home";
                this.props.history.push(location);
            });
        }
    });

    render() {
        const {aup, agreed} = this.state;
        const {currentUser} = this.props;
        return (
            <div className="mod-aup">

                <p dangerouslySetInnerHTML={{__html: I18n.t("aup.info")}}/>
                <table className="user-info">
                    <thead/>
                    <tbody>
                        <tr>
                            <td>{I18n.t("aup.name")}</td>
                            <td>{`${currentUser.given_name} ${currentUser.family_name}`}</td>
                        </tr>
                        <tr>
                            <td>{I18n.t("aup.email")}</td>
                            <td>{currentUser.email}</td>
                        </tr>
                    </tbody>
                </table>
                <h2 dangerouslySetInnerHTML={{__html: I18n.t("aup.title")}}/>
                <p dangerouslySetInnerHTML={{__html: I18n.t("aup.disclaimer")}}/>
                <CheckBox name="aup" value={agreed} info={I18n.t("aup.agreeWithTerms")}
                           onChange={e => this.setState({agreed: !agreed})}/>
                <Button className="proceed" onClick={this.agreeWith}
                         txt={I18n.t("aup.onward")} disabled={!agreed}/>
            </div>
        )
    }
}

export default withRouter(Aup);
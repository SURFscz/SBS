import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "../../locale/I18n";
import "./MissingServiceAup.scss";
import Button from "../../components/button/Button";
import {serviceAupBulkCreate} from "../../api";
import SpinnerField from "../../components/redesign/spinner-field/SpinnerField";
import CollaborationAupAcceptance from "../../components/collaboration-aup-acceptance/CollaborationAupAcceptance";
import DOMPurify from "dompurify";


class MissingServiceAup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            agreed: false,
            loading: false
        };
    }

    agreeWith = () => {
        this.setState({loading: true});
        const {user, reloadMe} = this.props;
        serviceAupBulkCreate(user.services_without_aup).then(res => {
            const urlSearchParams = new URLSearchParams(window.location.search);
            let path = urlSearchParams.get("state");
            if (path) {
                //user was already logged in
                path = decodeURIComponent(path);
            } else if (res.location) {
                const url = new URL(res.location);
                path = url.pathname + url.search;
            } else {
                path = "/"
            }
            reloadMe(() => this.props.history.push(path));
        });
    }

    render() {
        const {agreed, loading} = this.state;
        const {user} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const info = user.services_without_aup.length > 1 ? "infoMultiple" : "info";
        const services = user.services_without_aup.length > 1 ? "informationServiceMultiple" : "informationService";
        return (
            <div className="mod-missing-service-aup">
                <h1>{I18n.t("aup.service.title")}</h1>
                <p className="info">{I18n.t(`aup.service.missing.${info}`)}</p>
                {(user.service_collaborations || []).map((collaboration, index) =>
                    <div className="collaboration-detail" key={index}>
                        <h3 dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("aup.service.purposeOf", {name: collaboration.name}))}}/>
                        <p>{collaboration.description}</p>
                    </div>)}
                <h3>{I18n.t(`aup.service.${services}`)}</h3>
                <CollaborationAupAcceptance services={user.services_without_aup}
                                            disabled={!agreed}
                                            serviceEmails={user.service_emails}
                                            setDisabled={() => this.setState({agreed: !agreed})}/>
                <div className="actions">
                    <Button className="proceed"
                            onClick={this.agreeWith}
                            centralize={true}
                            txt={I18n.t("aup.onward")}
                            disabled={!agreed}/>
                </div>
            </div>
        )
    }
}

export default withRouter(MissingServiceAup);

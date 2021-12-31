import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "i18n-js";
import "./MissingServiceAup.scss";
import Button from "../components/Button";
import {serviceAupBulkCreate} from "../api";
import SpinnerField from "../components/redesign/SpinnerField";
import CollaborationAupAcceptance from "../components/CollaborationAupAcceptance";


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
            const url = new URL(res.location);
            reloadMe({
                user: user,
                callback: () => {
                    this.props.history.push(url.pathname + url.search);
                }
            })
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
                {user.service_collaborations.map(collaboration => <div className="collaboration-detail">
                    <h2 dangerouslySetInnerHTML={{__html: I18n.t("aup.service.purposeOf", {name: collaboration.name})}}/>
                    <p>{collaboration.description}</p>
                </div>)}
                <h2>{I18n.t(`aup.service.${services}`)}</h2>
                <CollaborationAupAcceptance services={user.services_without_aup}
                                            disabled={!agreed}
                                            serviceEmails={user.service_emails}
                                            setDisabled={() => this.setState({agreed: !agreed})}/>
                <div className="actions">
                    <Button className="proceed" onClick={this.agreeWith} centralize={true}
                            txt={I18n.t("aup.onward")} disabled={!agreed}/>
                </div>
            </div>
        )
    }
}

export default withRouter(MissingServiceAup);
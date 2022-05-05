import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "i18n-js";
import "./PamWebSSO.scss";
import Button from "../components/Button";
import {pamWebSSOSession, serviceAupBulkCreate} from "../api";
import SpinnerField from "../components/redesign/SpinnerField";
import {ErrorOrigins} from "../utils/Utils";
import Logo from "../components/redesign/Logo";


class PamWebSSO extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            pamSession: {},
            service: {},
            loading: true
        };
    }

    componentDidMount = () => {
        const {session_id} = this.props.match.params;
        pamWebSSOSession(session_id)
            .then(res => this.setState({
                pamSession: res.pam_sso_session,
                service: res.service,
                loading: false
            }))
            .catch(() => this.props.history.push(`/404?eo=${ErrorOrigins.invalidPamWebSSO}`));
    };

    proceed = () => {
        this.setState({loading: true});
        const {user, reloadMe} = this.props;
        serviceAupBulkCreate(user.services_without_aup).then(res => {
            const url = new URL(res.location);
            reloadMe(() => this.props.history.push(url.pathname + url.search));
        });
    }

    render() {
        const {pamSession, service, loading} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        return (
            <div className="mod-pam-web-sso-container">
                <div className="mod-pam-web-sso">
                    <h1>{I18n.t("pamWebSSO.title", {service: service.name})}</h1>
                    <div className="service">
                        <div className="image">
                            <Logo src={service.logo}/>
                        </div>
                        <div className="details">
                            <h3>{service.name}</h3>
                            <p className="info">{service.description}</p>
                            {service.uri && <div className="org-attribute">
                                <span className="attr">{I18n.t("service.uri")}: </span>
                                <a href={service.uri} target="_blank" rel="noopener noreferrer">{service.uri}</a>
                            </div>}
                            {service.support_email &&
                            <div className="org-attribute">
                                <span className="attr">{I18n.t("service.support_email")}: </span>
                                <a href={`mailto:${service.support_email}`}>{service.support_email}</a>
                            </div>}

                        </div>
                    </div>
                    <p className="pin">{I18n.t("pamWebSSO.info")}</p>
                    <div className="actions">
                        <Button className="login" onClick={this.proceed} centralize={true}
                                txt={I18n.t("pamWebSSO.proceed")}/>
                    </div>
                </div>
            </div>
        )
    }
}

export default withRouter(PamWebSSO);
import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "i18n-js";
import "./ServiceAup.scss";
import Button from "../components/Button";
import {serviceAupCreate, serviceById} from "../api";
import CheckBox from "../components/CheckBox";
import SpinnerField from "../components/redesign/SpinnerField";
import Logo from "../components/redesign/Logo";


class ServiceAup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            agreed: false,
            service: {},
            loading: true
        };
    }

    componentDidMount = () => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const serviceId = urlSearchParams.get("service_id");
        serviceById(serviceId).then(res => {
            this.setState({
                loading: false,
                service: res
            });
        })
    }

    agreeWith = () => {
        const {service} = this.state;
        const {config} = this.props;
        serviceAupCreate(service).then(() => {
            window.location.href = config.continue_eduteams_redirect_uri;
        });
    }

    renderServiceAup = service => {
        return (
            <div className="service-section">
                {service.logo && <Logo src={service.logo} alt={service.name}/>}
                <span className="border-left">{service.name}</span>
                <div className="service-links">
                    {service.accepted_user_policy &&
                    <a href={service.accepted_user_policy} rel="noopener noreferrer"
                       target="_blank">{I18n.t("service.accepted_user_policy")}</a>
                    }
                    {service.privacy_policy ?
                        <a href={service.privacy_policy} rel="noopener noreferrer"
                           target="_blank">{I18n.t("service.privacy_policy")}</a> :
                        <span className="no-link">{I18n.t("aup.service.noPrivacyPolicy")}</span>
                    }

                </div>
            </div>
        );
    }

    render() {
        const {agreed, loading, service} = this.state;
        const {user} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const serviceName = {name: service.name}
        return (
            <div className="mod-service-aup">
                <h1>{I18n.t("aup.hi", {name: user.given_name || user.name})}</h1>
                <div className="disclaimer">
                    <p dangerouslySetInnerHTML={{__html: I18n.t("aup.service.info", serviceName)}}/>
                </div>
                <div>
                    <h3 dangerouslySetInnerHTML={{__html: I18n.t("aup.service.title", serviceName)}}/>
                    {this.renderServiceAup(service)}
                    <div className="terms">
                        <CheckBox name="aup" value={agreed} info={I18n.t("aup.service.agreeWithTerms")}
                                  onChange={() => this.setState({agreed: !agreed})}/>
                    </div>
                    <Button className="proceed" onClick={this.agreeWith} centralize={true}
                            txt={I18n.t("aup.onward")} disabled={!agreed}/>
                </div>
            </div>
        )
    }
}

export default withRouter(ServiceAup);
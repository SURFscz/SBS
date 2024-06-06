import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "../locale/I18n";
import "./ServiceAup.scss";
import Button from "../components/Button";
import {serviceAupCreate, serviceByUuid4} from "../api";
import SpinnerField from "../components/redesign/SpinnerField";
import CollaborationAupAcceptance from "../components/CollaborationAupAcceptance";
import DOMPurify from "dompurify";
import {isEmpty} from "../utils/Utils";
import CountDownDialog from "../components/CountDownDialog";


const counterTimeOut = 20;

class ServiceAup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            agreed: false,
            service: {},
            showCountDown: false,
            counter: counterTimeOut,
            collaborations: [],
            serviceEmails: {},
            continueUrl: null,
            loading: true
        };
    }

    componentDidMount = () => {
        const {config} = this.props;
        const urlSearchParams = new URLSearchParams(window.location.search);

        // get continue url as specified here https://docs.google.com/document/d/1VFn4Fy0AqxZKx8drDgI0qlDN9qfC0G2NDAiIUQmIB5s/edit?usp=sharing
        // and check that it contains a trusted url
        const continueUrl = urlSearchParams.get("continue_url");
        const continueUrlTrusted = config.continue_eduteams_redirect_uri;
        if (!continueUrl || !continueUrl.toLowerCase().startsWith(continueUrlTrusted.toLowerCase())) {
            throw new Error(`Invalid continue url: '${continueUrl}'`)
        }
        const serviceId = urlSearchParams.get("service_id");
        const status = urlSearchParams.get("status");
        serviceByUuid4(serviceId).then(res => {
            this.setState({
                loading: false,
                continueUrl: continueUrl,
                service: res["service"],
                collaborations: res["collaborations"],
                serviceEmails: res["service_emails"],
                agreed: isEmpty(res["service"].accepted_user_policy),
                showCountDown: status === "97" || parseInt(status, 10) === 97
            });
        })
    }

    agreeWith = () => {
        // continueUrl is checked in componentDidMount().  CodeQL gives a false positive here.
        const {service, continueUrl} = this.state;
        serviceAupCreate(service).then(() => {
            window.location.href = continueUrl;
        });
    }

    render() {
        const {agreed, loading, service, collaborations, serviceEmails, showCountDown, counter} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const serviceName = {name: service.name};
        if (showCountDown) {
            const keepCountingDown = counter > 1;
            setTimeout(() => this.setState({counter: counter - 1, showCountDown: keepCountingDown}), 1000);
        }
        return (
            <div className="mod-service-aup">
                {showCountDown &&
                    <CountDownDialog
                        service={service}
                        isOpen={true}
                        counter={counter}/>
                }
                <h1>{I18n.t("aup.service.title")}</h1>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("aup.service.info", serviceName))}}/>
                {collaborations.length > 1 &&
                    <p className="multiple-collaborations">{I18n.t("aup.service.multipleCollaborations")}</p>
                }
                {collaborations.length === 0 &&
                    <p className="multiple-collaborations">{I18n.t("aup.service.organisationAccess")}</p>
                }
                <div>
                    {collaborations.map(collaboration => <div className="collaboration-detail">
                        <h2 dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("aup.service.purposeOf", {name: collaboration.name}))}}/>
                        <p>{collaboration.description}</p>
                    </div>)}
                    <h2>{I18n.t("aup.service.informationService")}</h2>
                    <CollaborationAupAcceptance services={[service]}
                                                disabled={!agreed}
                                                serviceEmails={serviceEmails}
                                                setDisabled={() => this.setState({agreed: !agreed})}/>
                    <div className="actions">
                        <Button className="proceed" onClick={this.agreeWith} centralize={true}
                                txt={I18n.t("aup.service.proceed", serviceName)} disabled={!agreed}/>
                    </div>

                </div>
            </div>
        )
    }
}

export default withRouter(ServiceAup);
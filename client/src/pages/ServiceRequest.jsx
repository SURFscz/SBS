import React from "react";

import "react-datepicker/dist/react-datepicker.css";

import {
    addCollaborationServices,
    myCollaborations,
    requestServiceConnection,
    serviceByEntityId,
    serviceConnectionRequestsOutstanding
} from "../api";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import "./ServiceRequest.scss"
import Explain from "../components/Explain";
import ServicesRequestExplanation from "../components/explanations/ServicesRequest";
import CheckBox from "../components/CheckBox";
import Button from "../components/Button";
import {Tooltip} from "@surfnet/sds";
import {escapeHtmlTooltip, isEmpty, stopEvent} from "../utils/Utils";
import {getParameterByName} from "../utils/QueryParameters";
import ErrorIndicator from "../components/redesign/ErrorIndicator";
import UnitHeader from "../components/redesign/UnitHeader";
import ConfirmationDialog from "../components/ConfirmationDialog";
import SpinnerField from "../components/redesign/SpinnerField";
import DOMPurify from "dompurify";

class ServiceRequest extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            serviceName: "",
            collaborations: [],
            showExplanation: false,
            alreadyLinked: false,
            finished: false,
            redirectUriMismatch: false,
            noAutomaticConnectionsAllowed: false,
            collaborationAdminLinked: false,
            loading: true
        };
    }

    componentDidMount = () => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const entityId = urlSearchParams.get("entityID");
        if (entityId) {
            Promise.all([serviceByEntityId(entityId), myCollaborations(true)])
                .then(res => {
                    // Mark collaborations as already linked if the service is already connected
                    const service = res[0];
                    const collaborations = res[1];
                    const redirectUri = getParameterByName("redirectUri", window.location.search);
                    const redirectUriMismatch = isEmpty(service.uri) || (!isEmpty(redirectUri) && !redirectUri.startsWith(service.uri));
                    collaborations.forEach(collaboration => {
                        collaboration.alreadyLinked = collaboration.services.some(ser => ser.id === service.id);
                        collaboration.linkNotAllowed = (service.allowed_organisations.every(org => org.id !== collaboration.organisation.id)
                            && !service.access_allowed_for_all) || collaboration.organisation.services_restricted;
                    });
                    serviceConnectionRequestsOutstanding(service.id).then(res => {
                        collaborations.forEach(collaboration => {
                            collaboration.outstandingServiceConnectionRequest = res.some(d => d.collaboration_id === collaboration.id);
                        });
                        this.setState({
                            service,
                            collaborations,
                            noAutomaticConnectionsAllowed: !service.automatic_connection_allowed,
                            serviceName: escapeHtmlTooltip(service.name),
                            redirectUriMismatch: redirectUriMismatch,
                            displayBackToService: this.displayBackToService(service),
                            alreadyLinked: collaborations.some(coll => coll.alreadyLinked),
                            loading: false
                        });
                    });
                });
        } else {
            this.props.history.push("/404");
        }
    };

    backToService = () => {
        const {service} = this.state;
        const redirectUri = getParameterByName("redirectUri", window.location.search);
        // Note: this is also explicitly checked in render(), but better safe than sorry
        if (isEmpty(redirectUri) || !redirectUri.toLowerCase().startsWith(service.uri.toLowerCase())) {
            window.location.href = service.uri
        } else {
            window.location.href = redirectUri;
        }
    };

    displayBackToService = service => {
        const redirectUri = getParameterByName("redirectUri", window.location.search);
        const defaultRedirectUri = isEmpty(redirectUri) && !isEmpty(service.uri);
        const validRedirectUri = !isEmpty(redirectUri) && redirectUri.startsWith(service.uri);
        return defaultRedirectUri || validRedirectUri;
    };

    submit = e => {
        stopEvent(e);
        const {service, collaborations, serviceName} = this.state;
        const {user} = this.props;
        const selectedCollaborations = collaborations.filter(coll => coll.requestToLink);
        const collaborationAdminLinked = selectedCollaborations.some(coll => this.roleOfUserInCollaboration(coll, user) === "admin" || user.admin);
        const promises = selectedCollaborations.map(coll => {
            const isMember = this.roleOfUserInCollaboration(coll, user) !== "admin" && !user.admin;
            return isMember ?
                requestServiceConnection({
                    message: I18n.t("serviceRequest.motivation", {serviceName, userName: user.name}),
                    service_id: service.id,
                    collaboration_id: coll.id,
                    member: isMember
                }, false) : addCollaborationServices(coll.id, service.id);
        });
        Promise.all(promises)
            .then(() => {
                this.setState({
                    finished: true,
                    collaborationAdminLinked: collaborationAdminLinked
                });
            });
    };

    closeExplanation = () => this.setState({showExplanation: false});

    toggleCollaborationRequestLink = collaboration => e => {
        const {collaborations} = this.state;
        collaborations.find(coll => coll.id === collaboration.id).requestToLink = e.target.checked;
        this.setState({collaborations: [...collaborations]});
    };

    roleOfUserInCollaboration = (collaboration, user) =>
        user.collaboration_memberships.find(cm => cm.collaboration_id === collaboration.id).role;

    renderRole = (collaboration, user) =>
        I18n.t(`serviceRequest.role.${this.roleOfUserInCollaboration(collaboration, user)}`);

    renderCollaborations = (collaborations, user) => {
        const headers = ["name", "role", "organisation", "actions", "tooltips"];
        return (
            <table className="table-collaborations">
                <thead>
                <tr>
                    {headers.map(header => <th key={header}
                                               className={header}>{I18n.t(`serviceRequest.collaboration.${header}`)}</th>)}
                </tr>
                </thead>
                <tbody>
                {collaborations.map((coll, i) => <tr key={i}>
                    <td>{coll.name}</td>
                    <td>{this.renderRole(coll, user)}</td>
                    <td>{coll.organisation.name}</td>
                    <td>
                        <CheckBox name={coll.name} value={coll.alreadyLinked || coll.requestToLink || false}
                                  readOnly={coll.alreadyLinked || coll.linkNotAllowed || coll.outstandingServiceConnectionRequest}
                                  onChange={this.toggleCollaborationRequestLink(coll)}
                        />
                    </td>
                    <td>{coll.linkNotAllowed &&
                                <Tooltip tip={I18n.t("serviceRequest.collaboration.linkNotAllowed")}/>
                            }
                        {coll.alreadyLinked &&
                                <Tooltip tip={I18n.t("serviceRequest.collaboration.alreadyLinked")}/>}
                        {(coll.outstandingServiceConnectionRequest && this.roleOfUserInCollaboration(coll, user) === "member") &&
                                <Tooltip tip={I18n.t("serviceRequest.collaboration.outstandingServiceConnectionRequest")}/>}
                    </td>
                </tr>)}
                </tbody>
            </table>

        );
    };

    render() {
        const {
            collaborations,
            showExplanation,
            alreadyLinked,
            serviceName,
            finished,
            service,
            noAutomaticConnectionsAllowed,
            collaborationAdminLinked,
            redirectUriMismatch,
            loading
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        const linkNotAllowed = collaborations.every(coll => coll.linkNotAllowed);
        const outstandingServiceConnectionRequest = collaborations.every(coll => coll.outstandingServiceConnectionRequest);
        const noCollaborations = collaborations.length === 0;

        let title = I18n.t("serviceRequest.title", {name: serviceName});
        let subTitle = I18n.t("serviceRequest.subTitle", {name: serviceName});
        if (alreadyLinked) {
            title = I18n.t("serviceRequest.titleAlreadyLinked", {
                name: serviceName,
                collaboration: collaborations.find(coll => coll.alreadyLinked).name
            });
            subTitle = I18n.t("serviceRequest.subTitleAlreadyLinked", {name: serviceName});
        } else if (noAutomaticConnectionsAllowed) {
            title = I18n.t("serviceRequest.titleNoAutomaticConnection", {name: serviceName});
            subTitle = I18n.t("serviceRequest.titleNoAutomaticConnection", {name: serviceName});
        } else if (redirectUriMismatch) {
            title = I18n.t("serviceRequest.titleRedirectMismatch", {name: serviceName});
            subTitle = I18n.t("serviceRequest.subTitleRedirectMismatch", {name: serviceName});
        } else if (noCollaborations) {
            title = I18n.t("serviceRequest.titleNoCollaborations", {name: serviceName});
            subTitle = I18n.t("serviceRequest.subTitleNoCollaborations", {name: serviceName});
        } else if (outstandingServiceConnectionRequest) {
            title = I18n.t("serviceRequest.titleOutstandingServiceConnectionRequest", {name: serviceName});
            subTitle = I18n.t("serviceRequest.subTitleOutstandingServiceConnectionRequest", {details: collaborations.map(coll => coll.name).join(", ")});
        } else if (linkNotAllowed) {
            title = I18n.t("serviceRequest.titleLinkNotAllowed", {name: serviceName});
            subTitle = I18n.t("serviceRequest.subTitleLinkNotAllowed", {name: serviceName});
        }
        const msg = collaborationAdminLinked ? I18n.t("serviceRequest.result.completed", {serviceName}) :
            I18n.t("serviceRequest.result.requested", {serviceName});
        const errorSituation = alreadyLinked || linkNotAllowed || noAutomaticConnectionsAllowed || redirectUriMismatch || noCollaborations
            || outstandingServiceConnectionRequest;
        const enableSubmit = collaborations.some(coll => coll.requestToLink && !coll.alreadyLinked) && !errorSituation;
        return (
            <div className="mod-service-request-container">
                <ConfirmationDialog isOpen={finished}
                                    confirm={this.backToService}
                                    question={msg}
                                    confirmationTxt={I18n.t("serviceRequest.backToService")}
                />
                <UnitHeader obj={service}
                            name={service.name}>
                    <div className="title">
                        <p className="title" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(title)}}/>
                        <FontAwesomeIcon className="help"
                                         icon="question-circle"
                                         id="service_request_close_explanation"
                                         onClick={() => this.setState({showExplanation: !showExplanation})}/>

                    </div>
                </UnitHeader>
                <div className="mod-service-request">
                    <Explain
                        close={this.closeExplanation}
                        subject={I18n.t("explain.serviceRequest")}
                        isVisible={showExplanation}>
                        <ServicesRequestExplanation name={escapeHtmlTooltip(serviceName)}/>
                    </Explain>
                    <div className="service-request">
                        {errorSituation && <div className="error">
                            <ErrorIndicator msg={subTitle} standalone={true} decode={false}/>
                        </div>}
                        {!errorSituation &&
                        <div>
                            <p className="sub-title" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(subTitle)}}/>
                            {this.renderCollaborations(collaborations, user)}
                        </div>
                        }
                        <section className="actions">
                            <Button disabled={!this.displayBackToService(service)} cancelButton={true}
                                    txt={I18n.t("serviceRequest.backToService")}
                                    onClick={this.backToService}/>
                            <Button disabled={!enableSubmit} txt={I18n.t("serviceRequest.link")}
                                    onClick={this.submit}/>
                        </section>
                    </div>
                </div>
            </div>);
    }

}

export default ServiceRequest;

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
import ReactTooltip from "react-tooltip";
import {escapeHtmlTooltip, isEmpty, stopEvent} from "../utils/Utils";
import {getParameterByName} from "../utils/QueryParameters";

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
            collaborationAdminLinked: false,
            outstandingServiceConnectionRequestDetails: null
        };
    }

    componentDidMount = () => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const entityId = urlSearchParams.get("entityID");
        if (entityId) {
            Promise.all([serviceByEntityId(entityId), myCollaborations()])
                .then(res => {
                    // Mark collaborations as already linked if the service is already connected
                    const service = res[0];
                    const collaborations = res[1];
                    collaborations.forEach(collaboration => {
                        collaboration.alreadyLinked = collaboration.services.some(ser => ser.id === service.id);
                        collaboration.linkNotAllowed = service.allowed_organisations.length > 0 &&
                            service.allowed_organisations.every(org => org.id !== collaboration.organisation.id);
                    });
                    serviceConnectionRequestsOutstanding(service.id).then(res => {
                        collaborations.forEach(collaboration => {
                            collaboration.outstandingServiceConnectionRequest = res.some(d => d.collaboration_id === collaboration.id);
                        });
                        this.setState({
                            service,
                            collaborations,
                            serviceName: escapeHtmlTooltip(service.name),
                            displayBackToService: this.displayBackToService(service),
                            alreadyLinked: collaborations.some(coll => coll.alreadyLinked)
                        });
                    });
                });
        } else {
            this.props.history.push("/404");
        }
    };

    backToService = () => {
        const {service} = this.state;
        const redirectUri = getParameterByName("redirectUri");
        window.location.href = isEmpty(redirectUri) ? service.uri : redirectUri;
    };

    displayBackToService = service => {
        const redirectUri = getParameterByName("redirectUri");
        const defaultRedirectUri = isEmpty(redirectUri) && !isEmpty(service.uri);
        const validRedirectUri = !isEmpty(redirectUri) && redirectUri.startsWith(service.uri);
        return defaultRedirectUri || validRedirectUri;
    };

    submit = e => {
        stopEvent(e);
        const {service, collaborations, serviceName} = this.state;
        const {user} = this.props;
        const selectedCollaborations = collaborations.filter(coll => coll.requestToLink);
        const noAutomaticConnectionAllowed = !service.automatic_connection_allowed;
        const collaborationAdminLinked = selectedCollaborations.some(coll => this.roleOfUserInCollaboration(coll, user) === "admin" || user.admin)
            && !noAutomaticConnectionAllowed;
        const promises = selectedCollaborations.map(coll => {
            const isMember = this.roleOfUserInCollaboration(coll, user) !== "admin" && !user.admin;
            const requestIsRequired = isMember || noAutomaticConnectionAllowed
            return requestIsRequired ?
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
            }).catch(e => {
            if (e.response && e.response.json && e.response.status === 400) {
                e.response.json().then(res => {
                    if (res.message && res.message.indexOf("outstanding_service_connection_request") > -1) {
                        const cleanMsg = res.message.replace("outstanding_service_connection_request: ", "");
                        this.setState({outstandingServiceConnectionRequestDetails: cleanMsg});
                    } else {
                        throw e;
                    }
                })
            }
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
                    <span className="tooltip-container">
                                <span data-tip data-for={`coll_lna${coll.id}`}>
                                    <FontAwesomeIcon icon="info-circle"/>
                                </span>
                                <ReactTooltip id={`coll_lna${coll.id}`} type="info" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("serviceRequest.collaboration.linkNotAllowed")}}/>
                                </ReactTooltip>
                            </span>}
                        {coll.alreadyLinked &&
                        <span className="tooltip-container">
                                <span data-tip data-for={`coll_al${coll.id}`}>
                                    <FontAwesomeIcon icon="info-circle"/>
                                </span>
                                <ReactTooltip id={`coll_al${coll.id}`} type="info" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("serviceRequest.collaboration.alreadyLinked")}}/>
                                </ReactTooltip>
                            </span>}
                        {(coll.outstandingServiceConnectionRequest && this.roleOfUserInCollaboration(coll, user) === "member") &&
                        <span className="tooltip-container">
                                <span data-tip data-for={`coll_osr${coll.id}`}>
                                    <FontAwesomeIcon icon="info-circle"/>
                                </span>
                                <ReactTooltip id={`coll_osr${coll.id}`} type="info" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("serviceRequest.collaboration.outstandingServiceConnectionRequest")}}/>
                                </ReactTooltip>
                            </span>}

                    </td>
                </tr>)}
                </tbody>
            </table>

        );
    };

    render() {
        const {
            collaborations, showExplanation, alreadyLinked, serviceName, finished, service,
            collaborationAdminLinked, outstandingServiceConnectionRequestDetails
        } = this.state;
        const {user} = this.props;
        if (finished) {
            const msg = collaborationAdminLinked ? I18n.t("serviceRequest.result.completed", {serviceName}) :
                I18n.t("serviceRequest.result.requested", {serviceName});
            return (
                <div className="mod-service-request">
                    <div className="result-feedback">
                        <p dangerouslySetInnerHTML={{__html: msg}}/>
                        <Button txt={I18n.t("serviceRequest.backToService")}
                                onClick={this.backToService}/>
                    </div>
                </div>);
        }
        const enableSubmit = collaborations.some(coll => coll.requestToLink && !coll.alreadyLinked);
        const linkNotAllowed = collaborations.every(coll => coll.linkNotAllowed || coll.outstandingServiceConnectionRequest);
        const title = alreadyLinked ?
            I18n.t("serviceRequest.titleAlreadyLinked", {
                name: serviceName,
                collaboration: collaborations.find(coll => coll.alreadyLinked).name
            })
            : linkNotAllowed ? I18n.t("serviceRequest.titleLinkNotAllowed", {name: serviceName})
                : I18n.t("serviceRequest.title", {name: serviceName});
        const subTitle = alreadyLinked ?
            I18n.t("serviceRequest.subTitleAlreadyLinked", {name: serviceName})
            : linkNotAllowed ? I18n.t("serviceRequest.subTitleLinkNotAllowed", {name: serviceName})
                : I18n.t("serviceRequest.subTitle", {name: serviceName});
        const noCollaborations = collaborations.length === 0;
        return (
            <div className="mod-service-request">
                <Explain
                    close={this.closeExplanation}
                    subject={I18n.t("explain.serviceRequest")}
                    isVisible={showExplanation}>
                    <ServicesRequestExplanation name={escapeHtmlTooltip(serviceName)}/>
                </Explain>

                <div className="title">
                    <p className="title" dangerouslySetInnerHTML={{__html: title}}/>
                    <FontAwesomeIcon className="help"
                                     icon="question-circle"
                                     id="service_request_close_explanation"
                                     onClick={() => this.setState({showExplanation: !showExplanation})}/>

                </div>
                {noCollaborations &&
                <p dangerouslySetInnerHTML={{__html: I18n.t("serviceRequest.noCollaborations", {name: serviceName})}}/>}
                {!noCollaborations && <div className="service-request">
                    <p className="sub-title" dangerouslySetInnerHTML={{__html: subTitle}}/>
                    {this.renderCollaborations(collaborations, user)}
                    {outstandingServiceConnectionRequestDetails &&
                    <div className="error">
                            <span>{I18n.t("serviceRequest.outstandingServiceConnectionRequest", {
                                details: outstandingServiceConnectionRequestDetails
                            })}</span>
                    </div>
                    }
                    <section className="actions">
                        {this.displayBackToService(service) &&
                        <Button className="white" txt={I18n.t("serviceRequest.backToService")}
                                onClick={this.backToService}/>}
                        <Button disabled={!enableSubmit} txt={I18n.t("serviceRequest.link")}
                                onClick={this.submit}/>
                    </section>
                </div>}
            </div>);
    };

}

export default ServiceRequest;

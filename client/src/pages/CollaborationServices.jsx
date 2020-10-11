import React from "react";

import "react-datepicker/dist/react-datepicker.css";

import {
    addCollaborationServices,
    collaborationServices,
    deleteCollaborationServices,
    deleteServiceConnectionRequest,
    requestServiceConnection,
    resendServiceConnectionRequest,
    searchServices,
    serviceConnectionRequests
} from "../api";
import I18n from "i18n-js";
import {isEmpty, sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../components/ConfirmationDialog";

import "./CollaborationServices.scss"
import Select from "react-select";
import {setFlash} from "../utils/Flash";
import {headerIcon} from "../forms/helpers";
import ReactTooltip from "react-tooltip";
import Explain from "../components/Explain";
import ServicesExplanation from "../components/explanations/Services";
import InputField from "../components/InputField";
import Button from "../components/Button";
import BackLink from "../components/BackLink";
import moment from "moment";
import {userRole} from "../utils/UserRole";

class CollaborationServices extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaboration: undefined,
            sortedServices: [],
            allServices: [],
            sorted: "name",
            reverse: false,
            errorService: undefined,
            notAllowedOrganisation: false,
            automaticConnectionNotAllowed: false,
            showExplanation: false,
            message: "",
            serviceConnectionRequests: [],
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.collaboration_id) {
            Promise.all([collaborationServices(params.collaboration_id), searchServices("*"),
                serviceConnectionRequests(params.collaboration_id)
            ])
                .then(res => {
                    const {sorted, reverse} = this.state;
                    const collaboration = res[0];
                    const services = collaboration.services;
                    const serviceIdsToExclude = res[2].map(req => req.service_id);
                    const allServices = res[1]
                        .filter(s => !serviceIdsToExclude.includes(s.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(service => ({
                            value: service.id,
                            label: this.serviceToOption(service)
                        }));
                    this.setState({
                        collaboration: collaboration,
                        sortedServices: sortObjects(services, sorted, reverse),
                        allServices: allServices,
                        serviceConnectionRequests: res[2],
                        automaticConnectionNotAllowed: false,
                        notAllowedOrganisation: false
                    });
                })
        } else {
            this.props.history.push("/404");
        }
    };

    refresh = callBack => {
        this.componentDidMount();
        callBack();
    };

    serviceToOption = service => `${service.name} - ${service.entity_id}`;

    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    closeExplanation = () => this.setState({showExplanation: false});

    addService = option => {
        if (option) {
            const {collaboration} = this.state;
            addCollaborationServices(collaboration.id, option.value)
                .then(() => this.refresh(() => setFlash(I18n.t("collaborationServices.flash.added", {
                    service: option.label,
                    name: collaboration.name
                }))))
                .catch(e => {
                    if (e.response && e.response.json && e.response.status === 400) {
                        e.response.json().then(res => {
                            if (res.message && res.message.indexOf("automatic_connection_not_allowed") > -1) {
                                this.setState({
                                    automaticConnectionNotAllowed: true,
                                    notAllowedOrganisation: false,
                                    errorService: option
                                });
                            }
                            if (res.message && res.message.indexOf("not_allowed_organisation") > -1) {
                                this.setState({
                                    notAllowedOrganisation: true,
                                    automaticConnectionNotAllowed: false,
                                    errorService: option
                                });
                            }
                        });
                    } else {
                        throw e;
                    }
                });
        }
    };

    removeService = service => e => {
        const {collaboration} = this.state;
        const action = () => deleteCollaborationServices(collaboration.id, service.id).then(() => {
            this.closeConfirmationDialog();
            this.refresh(() => setFlash(I18n.t("collaborationServices.flash.deleted", {
                service: service.name,
                name: collaboration.name
            })));
        });
        this.confirm(action, I18n.t("collaborationServices.serviceDeleteConfirmation", {collaboration: collaboration.name}));

    };

    sortTable = (services, name, sorted, reverse) => () => {
        if (name === "actions" || name === "open") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedServices = sortObjects(services, name, reversed);
        this.setState({sortedServices: sortedServices, sorted: name, reverse: reversed});
    };

    renderConnectedServices = (collaboration, connectedServices, sorted, reverse, allowedToConfigureServices) => {
        const names = ["open", "actions", "name", "entity_id", "description"];
        const hasServices = !isEmpty(connectedServices);
        return (

            <div className="collaboration-services-connected">
                <p className="title">{I18n.t("collaborationServices.connectedServices", {name: collaboration.name})}</p>
                {hasServices && <table className="connected-services">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortTable(connectedServices, name, sorted, reverse)}>
                                {I18n.t(`collaborationServices.service.${name}`)}
                                {(name !== "actions" && name !== "open") && headerIcon(name, sorted, reverse)}
                                {name === "actions" &&
                                <span data-tip data-for="service-delete">
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id="service-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{
                                        __html: I18n.t("collaborationServices.deleteServiceTooltip",
                                            {name: encodeURIComponent(collaboration.name)})
                                    }}/>
                                </ReactTooltip>
                            </span>}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {connectedServices.map(service => <tr key={service.id}>
                        <td onClick={this.openService(service)} className="open">
                            {<FontAwesomeIcon icon={"arrow-right"}/>}
                        </td>
                        <td className="actions">
                            {allowedToConfigureServices &&
                            <FontAwesomeIcon icon="trash" onClick={this.removeService(service)}/>}
                        </td>
                        <td className="name">{service.name}</td>
                        <td className="entity_id">{service.entity_id}</td>
                        <td className="description">{service.description}</td>
                    </tr>)}
                    </tbody>
                </table>}
                {!hasServices && <p>{I18n.t("collaborationServices.noServices")}</p>}
            </div>
        );
    };

    resend = req => {
        const action = () => resendServiceConnectionRequest(req.id)
            .then(() => {
                this.closeConfirmationDialog();
                setFlash(I18n.t("collaborationServices.serviceConnectionRequestResend",
                    {
                        service: req.service.name,
                        collaboration: req.collaboration.name
                    }))
            })
            .catch(e => {
                this.closeConfirmationDialog();
                if (e.response && e.response.json && e.response.status === 404) {
                    //Already accepted
                    this.componentDidMount();
                } else {
                    throw e;
                }
            });
        this.confirm(action, I18n.t("collaborationServices.serviceConnectionRequestResendConfirmation"));
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    removeServiceConnectionRequest = req => {
        const action = () => deleteServiceConnectionRequest(req.id)
            .then(() => {
                this.closeConfirmationDialog();
                this.refresh((() => setFlash(I18n.t("collaborationServices.serviceConnectionRequestDeleted",
                    {
                        service: req.service.name,
                        collaboration: req.collaboration.name
                    }))))
            });
        this.confirm(action, I18n.t("collaborationServices.serviceConnectionRequestDeleteConfirmation"));
    };

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    renderServiceRequestConnections = (serviceConnectionRequests, allowedToConfigureServices) => {
        const names = ["actions", "resend", "service", "requester", "created_at", "message"];
        const hasRequests = !isEmpty(serviceConnectionRequests);
        return (
            <div className="service-request-connections">
                <p className="title">{I18n.t("collaborationServices.serviceConnectionRequests")}</p>
                {!hasRequests &&
                <p>{I18n.t("collaborationServices.noServiceConnectRequests")}</p>}
                {hasRequests && <table className="table-service-request-connections">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}>
                                {I18n.t(`collaborationServices.serviceConnectionRequest.${name}`)}
                                {(name === "actions" || name === "resend") &&
                                <span data-tip data-for={`service-connection-${name}`}>
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id={`service-connection-${name}`} type="light" effect="solid"
                                              data-html={true}>
                                    <p dangerouslySetInnerHTML={{
                                        __html: I18n.t(`collaborationServices.${name}Tooltip`)
                                    }}/>
                                </ReactTooltip>
                            </span>}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {serviceConnectionRequests.map(req => <tr key={req.id}>
                        <td className="actions">
                            {allowedToConfigureServices &&
                            <FontAwesomeIcon icon="trash" onClick={() => this.removeServiceConnectionRequest(req)}/>}
                        </td>
                        <td className="resend">
                            {allowedToConfigureServices &&
                            <FontAwesomeIcon icon="envelope" onClick={() => this.resend(req)}/>}
                        </td>
                        <td className="service">{req.service.name}</td>
                        <td className="requester">{req.requester.name}</td>
                        <td className="created_at">{moment(req.created_at * 1000).format("LL")}</td>
                        <td className="message">{req.message}</td>

                    </tr>)}
                    </tbody>
                </table>}
            </div>
        )
    };

    cancelServiceConnectionRequest = () => this.setState({automaticConnectionNotAllowed: false});

    serviceConnectionRequest = () => {
        const {collaboration, errorService, message} = this.state;
        requestServiceConnection({
            message: message,
            service_id: errorService.value,
            collaboration_id: collaboration.id
        }).then(() => this.refresh(() => {
            setFlash(I18n.t("collaborationServices.flash.send", {
                service: errorService.label
            }));
            this.setState({automaticConnectionNotAllowed: false});
        }));
    };

    renderAutomaticConnectionNotAllowed = (errorService, collaboration, message) =>
        (<div className="warning">
                        <span className="warning">{I18n.t("collaborationServices.automaticConnectionNotAllowed", {
                            service: errorService.label,
                            collaboration: collaboration.name,
                            organisation: collaboration.organisation.name
                        })}</span>
            <InputField value={message}
                        name={I18n.t("collaborationServices.motivation")}
                        placeholder={I18n.t("collaborationServices.motivationPlaceholder")}
                        onChange={e => this.setState({message: e.target.value})}/>
            <section className="actions">
                <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancelServiceConnectionRequest}/>
                <Button disabled={isEmpty(message)} txt={I18n.t("collaborationServices.send")}
                        onClick={this.serviceConnectionRequest}/>
            </section>
        </div>);

    renderNotAllowedOrganisation = (errorService, collaboration) => <div className="error">
                        <span className="error">{I18n.t("collaborationServices.notAllowedOrganisation", {
                            service: errorService.label,
                            collaboration: collaboration.name,
                            organisation: collaboration.organisation.name
                        })}</span>
        <a className="close" href="/close"
           onClick={e => stopEvent(e) && this.setState({notAllowedOrganisation: false})}>
            <FontAwesomeIcon icon="times"/>
        </a>
    </div>;


    render() {
        const {
            collaboration, sortedServices, allServices, sorted, reverse, errorService,
            notAllowedOrganisation, automaticConnectionNotAllowed, showExplanation, message,
            serviceConnectionRequests, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
            confirmationDialogQuestion
        } = this.state;
        if (collaboration === undefined) {
            return null;
        }
        const availableServices = allServices.filter(service => !sortedServices.find(s => s.id === service.value));
        const {user} = this.props;
        const allowedToConfigureServices = user.admin || !collaboration.services_restricted;
        return (
            <div className="mod-collaboration-services">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <Explain
                    close={this.closeExplanation}
                    subject={I18n.t("explain.services")}
                    isVisible={showExplanation}>
                    <ServicesExplanation/>
                </Explain>
                <BackLink history={this.props.history} fullAccess={true} role={userRole(user,
                    {
                        organisation_id: collaboration.organisation_id,
                        collaboration_id: collaboration.id
                    })}/>
                <div className="title">
                    <p className="title">{I18n.t("collaborationServices.title", {name: collaboration.name})}</p>
                    <FontAwesomeIcon className="help" icon="question-circle"
                                     id="impersonate_close_explanation"
                                     onClick={() => this.setState({showExplanation: true})}/>

                    {notAllowedOrganisation &&
                    this.renderNotAllowedOrganisation(errorService, collaboration)}
                    {automaticConnectionNotAllowed &&
                    this.renderAutomaticConnectionNotAllowed(errorService, collaboration, message)}
                </div>
                {!allowedToConfigureServices && <div className="service-restricted">
                    <p>
                        {I18n.t("collaborationServices.serviceRestrictedInfo")}
                    </p>
                </div>}
                <div className="collaboration-services">
                    <Select className="services-select"
                            placeholder={I18n.t("collaborationServices.searchServices", {name: collaboration.name})}
                            onChange={this.addService}
                            options={availableServices}
                            value={null}
                            isDisabled={!allowedToConfigureServices}
                            isSearchable={true}
                            isClearable={true}
                    />
                    {this.renderConnectedServices(collaboration, sortedServices, sorted, reverse, allowedToConfigureServices)}
                    {this.renderServiceRequestConnections(serviceConnectionRequests, allowedToConfigureServices)}
                </div>
            </div>);
    };

}

export default CollaborationServices;

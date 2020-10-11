import React from "react";

import "react-datepicker/dist/react-datepicker.css";
import I18n from "i18n-js";
import {isEmpty, sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../components/ConfirmationDialog";
import "./OrganisationServices.scss"
import {headerIcon} from "../forms/helpers";
import ReactTooltip from "react-tooltip";
import Explain from "../components/Explain";
import BackLink from "../components/BackLink";
import Select from "react-select";
import {addOrganisationServices, deleteOrganisationServices, organisationServices, searchServices} from "../api";
import {setFlash} from "../utils/Flash";
import OrganisationServicesExplanation from "../components/explanations/OrganisationServices";
import {userRole} from "../utils/UserRole";

class OrganisationServices extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisation: null,
            sortedServices: [],
            allServices: [],
            sorted: "name",
            reverse: false,
            errorService: undefined,
            notAllowedOrganisation: false,
            showExplanation: false,
            serviceConnectionRequests: [],
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const organisationId = params.organisation_id;
        if (organisationId) {
            const {user} = this.props;
            const isAdmin = user.organisation_memberships
                .some(m => m.organisation_id === parseInt(organisationId, 10) && m.role === "admin")
            if (!isAdmin && !user.admin) {
                this.props.history.push("/404");
                return;
            }
            Promise.all([organisationServices(organisationId), searchServices("*")])
                .then(res => {
                    const {sorted, reverse} = this.state;
                    const organisation = res[0];
                    const services = organisation.services;
                    const allServices = res[1]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(service => ({
                            value: service.id,
                            label: this.serviceToOption(service)
                        }));
                    this.setState({
                        organisation: organisation,
                        sortedServices: sortObjects(services, sorted, reverse),
                        allServices: allServices
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

        confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    addService = option => {
        if (option) {
            const {organisation} = this.state;
            addOrganisationServices(organisation.id, option.value)
                .then(() => this.refresh(() => setFlash(I18n.t("organisationServices.flash.added", {
                    service: option.label,
                    name: organisation.name
                }))))
                .catch(e => {
                    if (e.response && e.response.json && e.response.status === 400) {
                        e.response.json().then(() =>
                            this.setState({notAllowedOrganisation: true, errorService: option}));
                    } else {
                        throw e;
                    }
                });
        }
    };

    removeService = service => e => {
        const {organisation} = this.state;
        const action = () => deleteOrganisationServices(organisation.id, service.id).then(() => {
            this.closeConfirmationDialog();
            this.refresh(() => setFlash(I18n.t("organisationServices.flash.deleted", {
                service: service.name,
                name: organisation.name
            })));
        });
        this.confirm(action, I18n.t("organisationServices.serviceDeleteConfirmation", {organisation: organisation.name}));
    };

    sortTable = (services, name, sorted, reverse) => () => {
        if (name === "actions" || name === "open") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedServices = sortObjects(services, name, reversed);
        this.setState({sortedServices: sortedServices, sorted: name, reverse: reversed});
    };

    renderConnectedServices = (organisation, connectedServices, sorted, reverse) => {
        const names = ["open", "actions", "name", "entity_id", "description"];
        const hasServices = !isEmpty(connectedServices);
        return (

            <div className="organisation-services-connected">
                <p className="title">{I18n.t("organisationServices.connectedServices", {name: organisation.name})}</p>
                {hasServices && <table className="connected-services">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortTable(connectedServices, name, sorted, reverse)}>
                                {I18n.t(`organisationServices.service.${name}`)}
                                {(name !== "actions" && name !== "open") && headerIcon(name, sorted, reverse)}
                                {name === "actions" &&
                                <span data-tip data-for="service-delete">
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id="service-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{
                                        __html: I18n.t("organisationServices.deleteServiceTooltip",
                                            {name: encodeURIComponent(organisation.name)})
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
                            <FontAwesomeIcon icon="trash" onClick={this.removeService(service)}/>
                        </td>
                        <td className="name">{service.name}</td>
                        <td className="entity_id">{service.entity_id}</td>
                        <td className="description">{service.description}</td>
                    </tr>)}
                    </tbody>
                </table>}
                {!hasServices && <p>{I18n.t("organisationServices.noServices")}</p>}
            </div>
        );
    };

    renderNotAllowedOrganisation = (errorService, organisation) =>
        <div className="error">
                        <span className="error">{I18n.t("organisationServices.notAllowedOrganisation", {
                            service: errorService.label,
                            organisation: organisation.name
                        })}</span>
            <a className="close" href="/close"
               onClick={e => stopEvent(e) && this.setState({notAllowedOrganisation: false})}>
                <FontAwesomeIcon icon="times"/>
            </a>
        </div>
    ;


    render() {
        const {
            organisation, sortedServices, allServices, sorted, reverse, errorService,
            notAllowedOrganisation, showExplanation, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
            confirmationDialogQuestion
        } = this.state;
        if (isEmpty(organisation)) {
            return null;
        }
        const {user} = this.props;
        const availableServices = allServices.filter(service => !sortedServices.find(s => s.id === service.value));
        return (
            <div className="mod-organisation-services">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <Explain
                    close={this.closeExplanation}
                    subject={I18n.t("explain.services")}
                    isVisible={showExplanation}>
                    <OrganisationServicesExplanation/>
                </Explain>
                <BackLink history={this.props.history} fullAccess={true} role={userRole(user,
                    {
                        organisation_id: organisation.id
                    })}/>
                <div className="title">
                    <p className="title">{I18n.t("organisationServices.title", {name: organisation.name})}</p>
                    <FontAwesomeIcon className="help" icon="question-circle"
                                     id="impersonate_close_explanation"
                                     onClick={() => this.setState({showExplanation: true})}/>

                    {notAllowedOrganisation &&
                    this.renderNotAllowedOrganisation(errorService, organisation)}
                </div>
                <div className="organisation-services">
                    <Select className="services-select"
                            placeholder={I18n.t("organisationServices.searchServices", {name: organisation.name})}
                            onChange={this.addService}
                            options={availableServices}
                            value={null}
                            isSearchable={true}
                            isClearable={true}
                    />
                    {this.renderConnectedServices(organisation, sortedServices, sorted, reverse)}
                </div>
            </div>);
    };

}

export default OrganisationServices;

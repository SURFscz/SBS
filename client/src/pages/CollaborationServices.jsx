import React from "react";

import "react-datepicker/dist/react-datepicker.css";

import {addCollaborationServices, collaborationServices, deleteCollaborationServices, searchServices} from "../api";
import I18n from "i18n-js";
import {sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import "./CollaborationServices.scss"
import Select from "react-select";
import {setFlash} from "../utils/Flash";
import {headerIcon} from "../forms/helpers";
import ReactTooltip from "react-tooltip";
import Explain from "../components/Explain";
import ServicesExplanation from "../components/explanations/Services";

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
            showExplanation: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.collaboration_id) {
            Promise.all([collaborationServices(params.collaboration_id), searchServices("*")])
                .then(res => {
                    const {sorted, reverse} = this.state;
                    const collaboration = res[0];
                    const services = collaboration.services;
                    const allServices = res[1]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(service => ({
                            value: service.id,
                            label: this.serviceToOption(service)
                        }));
                    this.setState({
                        collaboration: collaboration,
                        sortedServices: sortObjects(services, sorted, reverse),
                        allServices: allServices
                    });
                })
        } else {
            this.props.history.push("/404");
        }
    };

    refresh = callBack => collaborationServices(this.state.collaboration.id)
        .then(json => {
            const {sorted, reverse} = this.state;
            this.setState({
                collaboration: json,
                sortedServices: sortObjects(json.services, sorted, reverse)
            }, callBack())
        });

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
                                this.setState({automaticConnectionNotAllowed: true, errorService: option});
                            }
                            if (res.message && res.message.indexOf("not_allowed_organisation") > -1) {
                                this.setState({notAllowedOrganisation: true, errorService: option});
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
        deleteCollaborationServices(collaboration.id, service.id).then(() => {
            this.refresh(() => setFlash(I18n.t("collaborationServices.flash.deleted", {
                service: service.name,
                name: collaboration.name
            })));
        });
    };

    sortTable = (services, name, sorted, reverse) => () => {
        if (name === "actions" || name === "open") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedServices = sortObjects(services, name, reversed);
        this.setState({sortedServices: sortedServices, sorted: name, reverse: reversed});
    };

    renderConnectedServices = (collaboration, connectedServices, sorted, reverse) => {
        const names = ["open", "actions", "name", "entity_id", "description"];
        return (

            <div className="collaboration-services-connected">
                <p className="title">{I18n.t("collaborationServices.connectedServices", {name: collaboration.name})}</p>
                <table className="connected-services">
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
                            <FontAwesomeIcon icon="trash" onClick={this.removeService(service)}/>
                        </td>
                        <td onClick={this.openService(service)} className="name">{service.name}</td>
                        <td onClick={this.openService(service)} className="entity_id">{service.entity_id}</td>
                        <td onClick={this.openService(service)} className="description">{service.description}</td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        );
    };

    renderAutomaticConnectionNotAllowed = (errorService, collaboration) => <div className="service-connection-request">
        <p>TODO</p>
        <p>{errorService.label}</p>
        <p>{collaboration.name}</p>
    </div>;

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
            notAllowedOrganisation, automaticConnectionNotAllowed, showExplanation

        } = this.state;
        if (collaboration === undefined) {
            return null;
        }
        const availableServices = allServices.filter(service => !sortedServices.find(s => s.id === service.value));
        //TODO render an explanation info which explains the purpose of the page. preferably inline like was done with teams
        return (
            <div className="mod-collaboration-services">
                <Explain
                    close={this.closeExplanation}
                    subject={I18n.t("explain.services")}
                    isVisible={showExplanation}>
                    <ServicesExplanation/>
                </Explain>

                <div className="title">
                    <a href={`/collaborations/${collaboration.id}`} onClick={e => {
                        stopEvent(e);
                        this.props.history.goBack();
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("forms.back")}
                    </a>
                    <p className="title">{I18n.t("collaborationServices.title", {name: collaboration.name})}</p>
                    <FontAwesomeIcon className="help" icon="question-circle"
                                     id="impersonate_close_explanation"
                                     onClick={() => this.setState({showExplanation: true})}/>

                    {notAllowedOrganisation &&
                    this.renderNotAllowedOrganisation(errorService, collaboration)}
                </div>
                <div className="collaboration-services">
                    <Select className="services-select"
                            placeholder={I18n.t("collaborationServices.searchServices", {name: collaboration.name})}
                            onChange={this.addService}
                            options={availableServices}
                            value={null}
                            isSearchable={true}
                            isClearable={true}
                    />
                    {this.renderConnectedServices(collaboration, sortedServices, sorted, reverse)}
                    {automaticConnectionNotAllowed &&
                    this.renderAutomaticConnectionNotAllowed(errorService, collaboration)}
                </div>
            </div>);
    };

}

export default CollaborationServices;

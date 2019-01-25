import React from "react";

import "react-datepicker/dist/react-datepicker.css";

import {collaborationServices, deleteCollaborationServices, addCollaborationServices, searchServices} from "../api";
import I18n from "i18n-js";
import {stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import "./CollaborationServices.scss"
import CheckBox from "../components/CheckBox";
import Select from "react-select";
import {setFlash} from "../utils/Flash";

class CollaborationServices extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaboration: undefined,
            availableServices: [],
            connectAllServices: false,
            sorted: "name",
            reverse: false
        };
    }

    /*
     * Only store collaboration -> derive all available services from there, sort in place in render phase
     * use headerIcon
     */
    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.collaboration_id) {
            Promise.all([collaborationServices(params.collaboration_id), searchServices("*")])
                .then(res => {const availableServices = res[1]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(service => ({
                            value: service.id,
                            label: this.serviceToOption(service)
                        }));
                    const filteredServices =
                    this.setState({
                        collaboration: res[0],
                        filteredServices: res[0].services,
                        availableServices: res[1]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(service => ({
                                value: service.id,
                                label: this.serviceToOption(service)
                            }))
                    });
                })
        } else {
            this.props.history.push("/404");
        }
    };

    refresh = callBack => collaborationServices(this.state.collaboration.collaboration_id)
        .then(json => this.setState({collaboration: json}, callBack()));

    serviceToOption = service => `${service.name} - ${service.entity_id}`;

    connectAllServices = () => {
    };

    addService = option => {
        const {collaboration} = this.state;
        addCollaborationServices({collaborationId: collaboration.id, serviceId: option.value}).then(() => {
            this.refresh(() => setFlash(I18n.t("collaborationServices.flash.added", {
                service: option.label,
                name: collaboration.name
            })));
        });
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

    renderConnectedServices = connectedServices => {
        return (
            <table>
                <thead>
                <tr>
                    <th className="actions"></th>
                    <th className="name"></th>
                    <th className="entity_id"></th>
                    <th className="description"></th>
                </tr>
                </thead>
                <tbody>
                {connectedServices.map(service => <tr>
                    <td><FontAwesomeIcon icon="trash" onClick={this.removeService(service)}/></td>
                    <td>{service.name}</td>
                    <td>{service.entity_id}</td>
                    <td>{service.description}</td>
                </tr>)}
                </tbody>
            </table>
        );
    };

    render() {
        const {
            collaboration, filteredServices, connectAllServices
        } = this.state;
        if (collaboration === undefined) {
            return null;
        }
        //TODO render an explanation info which explains the purpose ot the page. preferably inline like was done with teams
        return (
            <div className="mod-collaboration-services">
                <div className="title">
                    <a href={`/collaborations/${collaboration.id}`} onClick={e => {
                        stopEvent(e);
                        this.props.history.push(`/collaborations/${collaboration.id}`);
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("collaborationDetail.backToCollaborationDetail", {name: collaboration.name})}
                    </a>
                    <p className="title">{I18n.t("collaborationServices.title", {name: collaboration.name})}</p>
                </div>
                <div className="collaboration-services">
                    <CheckBox name="connectAllServices" value={connectAllServices} onChange={this.connectAllServices}
                              info={I18n.t("collaborationServices.connectAllServices", {name: collaboration.name})}
                              tooltip={I18n.t("collaborationServices.connectAllServicesTooltip", {name: collaboration.name})}/>
                    <Select className="services-select"
                            placeholder={I18n.t("collaborationServices.searchServices", {name: collaboration.name})}
                            onChange={this.addService}
                            options={filteredServices}
                            value={null}
                            isSearchable={true}
                            isClearable={true}
                    />
                </div>
                <div className="collaboration-services-connected">
                    {this.renderConnectedServices(collaboration.services)}
                </div>
            </div>);
    };
}

export default CollaborationServices;

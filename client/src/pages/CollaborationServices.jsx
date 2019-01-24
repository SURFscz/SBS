import React from "react";

import "react-datepicker/dist/react-datepicker.css";

import {collaborationServices, searchServices} from "../api";
import I18n from "i18n-js";
import {stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import "./CollaborationServices.scss"
import CheckBox from "../components/CheckBox";
import Select from "react-select";

class CollaborationServices extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaboration: undefined,
            connectedServices: [],
            connectAllServices: false,
            availableServices: []
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.collaboration_id) {
            Promise.all([collaborationServices(params.collaboration_id), searchServices("*")])
                .then(res => this.setState({
                    collaboration: res[0],
                    connectedServices: res[0].services,
                    availableServices: res[1]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(service => ({
                            value: service.id,
                            label: this.serviceToOption(service)
                        }))
                }))
        } else {
            this.props.history.push("/404");
        }
    };

    serviceToOption = service => `${service.name} - ${service.entity_id}`;

    connectAllServices = () => {
    };

    addService = option => {
        const {connectedServices, availableServices} = this.state;
        //connectedServices.push()
        //this.setState()
    };

    removeService = service => {
        const {connectedServices, availableServices} = this.state;
        //this.setState()
    };

    renderConnectedServices = connectedServices => {
        return (
            <table>
                <thead></thead>
                <tbody>
                {connectedServices.map(service => <tr>
                    <td><FontAwesomeIcon icon="trash"/></td>
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
            collaboration, availableServices, connectAllServices, connectedServices
        } = this.state;
        if (collaboration === undefined) {
            return null;
        }
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
                            options={availableServices}
                            value={null}
                            isSearchable={true}
                            isClearable={true}
                    />
                </div>
                <div className="collaboration-services-connected">
                    {this.renderConnectedServices(connectedServices)}
                </div>
            </div>);
    };
}

export default CollaborationServices;
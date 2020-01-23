import React from "react";

import "react-datepicker/dist/react-datepicker.css";

import {addCollaborationServices, myCollaborationsLite, serviceByEntityId} from "../api";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import "./ServiceRequest.scss"
import {setFlash} from "../utils/Flash";
import Explain from "../components/Explain";
import BackLink from "../components/BackLink";
import ServicesRequestExplanation from "../components/explanations/ServicesRequest";
import CheckBox from "../components/CheckBox";
import Button from "../components/Button";

class ServiceRequest extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            collaborations: [],
            showExplanation: false,
            alreadyLinked: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.entityid) {
            Promise.all([serviceByEntityId(params.entityid), myCollaborationsLite()])
                .then(res => {
                    // Mark collaborations as already linked if the service is already connected
                    const service = res[0];
                    const collaborations = res[1];
                    collaborations.forEach(collaboration => {
                        collaboration.alreadyLinked = collaboration.services.some(ser => ser.id === service.id);
                        collaboration.linkNotAllowed = service.allowed_organisations &&
                            service.allowed_organisations.every(org => org.id !== collaboration.organisation.id);
                    });
                    this.setState({
                        service,
                        collaborations,
                        alreadyLinked: collaborations.some(coll => coll.alreadyLinked)
                    });
                })
        } else {
            this.props.history.push("/404");
        }
    };

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

    closeExplanation = () => this.setState({showExplanation: false});

    toggleCollaborationRequestLink = e => collaboration => {
        const {collaborations} = this.state;
        collaborations.find(coll => coll.id === collaboration.id).requestToLink = e.target.checked;
        this.setState({collaborations: [...collaborations]});
    };

    renderRole = (collaboration, user) =>
        I18n.t(`serviceRequest.role.${user.collaboration_memberships.find(cm => cm.collaboration_id === collaboration.id).role}`);

    renderCollaborations = (collaborations, user) => {
        const headers = ["name", "role", "organisation", "actions"];
        return (
            <table className="table-collaborations">
                <thead>
                <tr>
                    {headers.map(header => <th key={header}>{I18n.t(`serviceRequest.collaboration.${header}`)}</th>)}
                </tr>
                </thead>
                <tbody>
                {collaborations.map((coll, i) => <tr key={i}>
                    <td>{coll.name}</td>
                    <td>{this.renderRole(coll, user)}</td>
                    <td>{coll.organisation.name}</td>
                    <td>
                        <CheckBox name={coll.name} value={coll.alreadyLinked || coll.requestToLink}
                                  readOnly={coll.alreadyLinked || coll.linkNotAllowed}
                                  onChange={this.toggleCollaborationRequestLink}
                                  tooltip={coll.linkNotAllowed ? I18n.t("serviceRequest.collaboration.linkNotAllowed") : null}
                        />
                    </td>
                </tr>)}
                </tbody>
            </table>

        );
    };

    render() {
        const {collaborations, service, showExplanation, alreadyLinked} = this.state;
        const {user} = this.props;
        const name = service.name;
        const disabledSubmit = collaborations.find(coll => coll.requestToLink);
        const title = alreadyLinked ?
            I18n.t("serviceRequest.titleAlreadyLinked", {
                name: name,
                collaboration: collaborations.find(coll => coll.alreadyLinked).name
            })
            : I18n.t("serviceRequest.title", {name: name});
        const subTitle = alreadyLinked ?
            I18n.t("serviceRequest.subTitleAlreadyLinked", {name: name})
            : I18n.t("serviceRequest.subTitle", {name: name});
        const noCollaborations = collaborations.length === 0;
        return (
            <div className="mod-service-request">
                <Explain
                    close={this.closeExplanation}
                    subject={I18n.t("explain.serviceRequest")}
                    isVisible={showExplanation}>
                    <ServicesRequestExplanation name={name}/>
                </Explain>

                <div className="title">
                    <BackLink history={this.props.history}/>
                    <p className="title">{title}</p>
                    <FontAwesomeIcon className="help"
                                     icon="question-circle"
                                     id="service_request_close_explanation"
                                     onClick={() => this.setState({showExplanation: true})}/>

                </div>
                {noCollaborations && <p>{I18n.t("serviceRequest.noCollaborations", {name})}</p>}
                {!noCollaborations && <div className="service-request">
                    <p className="sub-title">{subTitle}</p>
                    {this.renderCollaborations(collaborations, user)}
                    <section className="actions">
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                        <Button disabled={disabledSubmit} txt={I18n.t("serviceRequest.link")}
                                onClick={this.submit}/>
                    </section>
                </div>}
            </div>);
    };

}

export default ServiceRequest;

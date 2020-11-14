import React from "react";
import I18n from "i18n-js";
import "./AboutCollaboration.scss";
import {ReactComponent as ServicesIcon} from "../../icons/services.svg";
import {removeDuplicates, stopEvent} from "../../utils/Utils";
import Logo from "./Logo";

const memberCutOff = 10;

class AboutCollaboration extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showAll: false
        };
    }

    openMembersDetails = e => {
        stopEvent(e);
        const {tabChanged} = this.props;
        tabChanged("members");
    }

    openService = service => () => {
        service.uri && window.open(service.uri);
    }

    toggleShowMore = e => {
        stopEvent(e);
        this.setState({showAll: !this.state.showAll})
    }

    render() {
        const {showAll} = this.state;
        const {collaboration} = this.props;
        const services = removeDuplicates(collaboration.services.concat(collaboration.organisation.services), "id");
        const {collaboration_memberships} = collaboration
        const memberships = collaboration_memberships
            .sort((m1, m2) => m1.role.localeCompare(m2.role))
            .slice(0, showAll ? collaboration_memberships.length : memberCutOff);
        return (
            <div className="collaboration-about-mod">
                <div className="about">
                    <h1>{I18n.t("models.collaboration.about")}</h1>
                    <p>{collaboration.description}</p>
                </div>
                <div className="details">
                    {services.length > 0 && <div className="services">
                        <h1>{I18n.t("models.collaboration.services", {nbr: services.length})}</h1>
                        <span className="info">
                        {I18n.t("models.collaboration.servicesStart")}
                        </span>
                        <ul className="services">
                            {services.map(service =>
                                <li key={service.id} onClick={this.openService(service)}
                                    className={`${service.uri ? "uri" : ""}`}>
                                    {service.logo && <Logo src={service.logo} alt={service.name}/>}
                                    <span>{service.name}</span>
                                    <ServicesIcon/>
                                </li>)}
                        </ul>
                    </div>}
                    {services.length === 0 && <div className="services">
                        <h1>{I18n.t("models.collaboration.noServices")}</h1>
                    </div>}
                    {collaboration.disclose_member_information && <div className="members">
                        <div className="members-header">
                            <h1>{I18n.t("models.collaboration.members", {nbr: collaboration.collaboration_memberships.length})}</h1>
                            <a href="/details"
                               onClick={this.openMembersDetails}>{I18n.t("models.collaboration.showMemberDetails")}</a>
                        </div>
                        <ul>
                            {memberships.map(m => <li key={m.id}>
                                {<span className="member">
                            {m.user.name}
                                    {m.role === "admin" &&
                                    <span className="role">{` (${I18n.t("models.collaboration.admin")})`}</span>}
                        </span>}
                            </li>)}
                        </ul>
                        {collaboration.collaboration_memberships.length > memberCutOff &&
                        <a href={showAll ? "/more" : "/less"}
                           onClick={this.toggleShowMore}>{I18n.t(`models.collaboration.${showAll ? "less" : "more"}`,
                            {nbr: collaboration_memberships.length - memberCutOff})}</a>}

                    </div>}
                    {!collaboration.disclose_member_information && <div className="members">
                        <div className="members-header">
                            <h1>{I18n.t("models.collaboration.discloseNoMemberInformation")}</h1>
                        </div>
                    </div>}
                </div>
            </div>
        );
    }
}

export default AboutCollaboration;
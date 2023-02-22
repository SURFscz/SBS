import React from "react";
import I18n from "i18n-js";
import "./AboutCollaboration.scss";
import {ReactComponent as ServicesIcon} from "../../icons/services.svg";
import {ReactComponent as TerminalIcon} from "../../icons/terminal.svg";
import {ReactComponent as IllustrationCO} from "../../icons/illustration-CO.svg";
import {removeDuplicates, stopEvent} from "../../utils/Utils";
import Logo from "./Logo";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import {Tooltip} from "@surfnet/sds";
import {CO_SHORT_NAME, SRAM_USERNAME} from "../../validations/regExps";
import {clearFlash} from "../../utils/Flash";

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

    openService = service => e => {
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/services/${service.id}`);
    }

    formatServiceUri = (serviceUri, collaboration, user) => {
        if (serviceUri.indexOf(CO_SHORT_NAME) > -1) {
            serviceUri = serviceUri.replace(CO_SHORT_NAME, collaboration.short_name);
        }
        if (serviceUri.indexOf(SRAM_USERNAME) > -1) {
            serviceUri = serviceUri.replace(SRAM_USERNAME, user.username);
        }
        return serviceUri;
    }

    openServiceUri = (service, collaboration, user) => () => {
        service.uri && window.open(this.formatServiceUri(service.uri, collaboration, user), "_blank");
    }

    toggleShowMore = e => {
        stopEvent(e);
        this.setState({showAll: !this.state.showAll})
    }

    render() {
        const {showAll} = this.state;
        const {collaboration, user, showMemberView, isJoinRequest} = this.props;
        const isAllowedToSeeMembers = !isJoinRequest &&
            isUserAllowed(ROLES.COLL_ADMIN, user, collaboration.organisation_id, collaboration.id) && !showMemberView;
        const services = isJoinRequest ? [] : removeDuplicates(collaboration.services.concat(collaboration.organisation.services), "id");
        const {collaboration_memberships} = collaboration
        const memberships = isJoinRequest ? [] : collaboration_memberships
            .sort((m1, m2) => m1.role.localeCompare(m2.role))
            .slice(0, showAll ? collaboration_memberships.length : memberCutOff);
        const showMembers = !isJoinRequest && (collaboration.disclose_member_information || isAllowedToSeeMembers);
        return (
            <div className="collaboration-about-mod">
                <div className="about">
                    <h2>{I18n.t("models.collaboration.about")}</h2>
                    <p>{collaboration.description}</p>
                </div>
                <div className="details">
                    {services.length > 0 && <div className="services">
                        <h2>{I18n.t("models.collaboration.services", {nbr: services.length})}</h2>
                        {!isJoinRequest && <span className="info">
                        {I18n.t("models.collaboration.servicesStart")}
                        </span>}
                        <ul className="services">
                            {services.sort((a, b) => a.name.localeCompare(b.name)).map(service =>
                                <div className="service-button" key={service.name}>
                                    <li onClick={this.openServiceUri(service, collaboration, user)}
                                        className={`${service.uri ? "uri" : ""}`}>
                                        {service.logo && <Logo src={service.logo} alt={service.name}/>}
                                        <span className="border-left">{service.name}</span>
                                        {service.uri &&
                                        <span className="border-left no-border open-service">
                                        <Tooltip children={service.uri.startsWith("http") ? <ServicesIcon/> :
                                                     <TerminalIcon/>}
                                                 standalone={true}
                                                 tip={I18n.t("models.collaboration.servicesHoover",
                                                     {uri: this.formatServiceUri(service.uri, collaboration, user)})}/>
                                        </span>}
                                    </li>
                                    <div className="service-links">
                                        {!isJoinRequest &&
                                        <a href={`/services/${service.id}`}
                                           onClick={this.openService(service)}>{I18n.t("models.collaboration.instructions")}</a>}
                                        {service.accepted_user_policy &&
                                        <a href={service.accepted_user_policy} rel="noopener noreferrer"
                                           target="_blank">{I18n.t("service.accepted_user_policy")}</a>
                                        }
                                        {service.privacy_policy &&
                                        <a href={service.privacy_policy} rel="noopener noreferrer"
                                           target="_blank">{I18n.t("service.privacy_policy")}</a>
                                        }
                                    </div>
                                </div>
                            )}
                        </ul>
                    </div>}
                    {services.length === 0 &&
                    <div className="services">
                        {(services.length === 0 && !isJoinRequest) &&
                        <h2>{I18n.t("models.collaboration.noServices")}</h2>}
                        {isJoinRequest && <h2>{I18n.t("models.collaboration.noServicesJoinRequest")}</h2>}
                    </div>}
                    {showMembers &&
                    <div className="members">
                        <div className="members-header">
                            <h2>{I18n.t("models.collaboration.members", {nbr: collaboration.collaboration_memberships.length})}</h2>
                            <a href="/details"
                               onClick={this.openMembersDetails}>{I18n.t("models.collaboration.showMemberDetails")}</a>
                        </div>
                        <ul>
                            {memberships.map(m => <li key={m.id}>
                                <span className="member">
                                    {m.user.name}
                                    {m.role === "admin" &&
                                    <span className="role">{` (${I18n.t("models.collaboration.admin")})`}</span>}
                                </span>
                            </li>)}
                        </ul>
                        {collaboration.collaboration_memberships.length > memberCutOff &&
                        <a href={showAll ? "/more" : "/less"}
                           onClick={this.toggleShowMore}>{I18n.t(`models.collaboration.${showAll ? "less" : "more"}`,
                            {nbr: collaboration_memberships.length - memberCutOff})}</a>}

                    </div>}
                    {showMembers && <div className="playing-svg">
                        <IllustrationCO/>
                    </div>}
                    {(!showMembers && !isJoinRequest) && <div className="members">
                        <div className="members-header">
                            <h2>{I18n.t("models.collaboration.discloseNoMemberInformation")}</h2>
                        </div>
                    </div>}
                    {isJoinRequest && <div className="members">
                        <div className="members-header join-request">
                            <h2>{I18n.t("models.collaboration.members", {nbr: collaboration.collaboration_memberships.length})}</h2>
                            <p>{I18n.t("models.collaboration.discloseNoMemberInformationJoinRequest")}</p>
                        </div>
                    </div>}
                </div>
            </div>
        );
    }

}

export default AboutCollaboration;
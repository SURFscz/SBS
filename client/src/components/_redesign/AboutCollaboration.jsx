import React from "react";
import I18n from "../../locale/I18n";
import "./AboutCollaboration.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import {CO_SHORT_NAME, SRAM_USERNAME, validUrlRegExp} from "../../validations/regExps";
import ServiceCard from "../ServiceCard";

import {ReactComponent as WebsiteIcon} from "../../icons/network-information.svg";
import {ReactComponent as EmailActionIcon} from "../../icons/streamline/email-action-unread.svg";
import {ReactComponent as ShortNameIcon} from "../../icons/short-name.svg";
import {ReactComponent as TagsIcon} from "../../icons/tags.svg";
import Button from "../button/Button";


class AboutCollaboration extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showAll: false
        };
    }

    openTokens = e => {
        stopEvent(e);
        const {tabChanged} = this.props;
        tabChanged("tokens");
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

    render() {
        const {collaboration, user, isJoinRequest} = this.props;
        const services = collaboration.services;
        const {collaboration_memberships} = collaboration
        const showMembers = !isJoinRequest;
        let memberships = isJoinRequest ? [] : collaboration_memberships
            .filter(m => m.role === "admin")
            .sort((m1, m2) => m1.role.localeCompare(m2.role));
        const enabledServiceToken = services.filter(service => service.token_enabled).length > 0 && !isJoinRequest;
        const supportEmailValidURL = validUrlRegExp.test(collaboration.support_email);
        return (
            <div className="collaboration-about-mod">
                <div className={"about"}>
                    <p className="description">{collaboration.description}</p>
                    {services.length > 0 && <div className="services">
                        <h4 className={"margin"}>{I18n.t("models.collaboration.services", {nbr: services.length})}</h4>

                        {services.sort((a, b) => a.name.localeCompare(b.name))
                            .map(service =>
                                <ServiceCard service={service}
                                             user={user}
                                             key={service.id}
                                             collaboration={collaboration}
                                             ActionButton={(!isEmpty(service.uri) && !isJoinRequest) &&
                                                 <Button txt={I18n.t("service.launch")}
                                                         onClick={this.openServiceUri(service, collaboration, user)}/>}
                                             tokenAction={(enabledServiceToken && !isJoinRequest) && this.openTokens}
                                />
                            )}

                    </div>}
                    {services.length === 0 &&
                        <div className="services">
                            {(services.length === 0 && !isJoinRequest) &&
                                <h4 className={"margin"}>{I18n.t("models.collaboration.noServices")}</h4>}
                            {isJoinRequest &&
                                <h4 className={"margin"}>{I18n.t("models.collaboration.noServicesJoinRequest")}</h4>}
                        </div>}
                </div>
                {!isJoinRequest &&
                    <div className="members">

                        {!isEmpty(collaboration.tags) &&
                            <div className="meta-section">
                                <div className="header">
                                    <TagsIcon/>
                                    <p>{I18n.t("models.collaboration.labels")}</p>
                                </div>
                                <div className="labels values">
                                    {collaboration.tags
                                        .sort()
                                        .map((label, index) =>
                                            <span key={index} className="chip-container">
                                                {label.tag_value}
                                            </span>)}
                                </div>
                            </div>}
                        <div className="meta-section">
                            <div className="header">
                                <ShortNameIcon/>
                                <p>{I18n.t("collaboration.shortName")}</p>
                            </div>
                            <div className="values">
                                <span><strong>{collaboration.short_name}</strong></span>
                            </div>
                        </div>
                        {collaboration.website_url &&
                            <div className="meta-section">
                                <div className="header">
                                    <WebsiteIcon/>
                                    <p>{I18n.t("collaborations.moreInformation")}</p>
                                </div>
                                <div className="values">
                                    <a href={collaboration.website_url}
                                       rel="noopener noreferrer"
                                       target="_blank">{I18n.t("coPageHeaders.visit")}</a>
                                </div>
                            </div>}
                        {!isEmpty(collaboration.support_email) && <div className="meta-section">
                            <div className="header">
                                <EmailActionIcon/>
                                <p>{I18n.t("collaboration.supportShort")}</p>
                            </div>
                            <div className="values">
                                <p>
                                    <a href={supportEmailValidURL ? collaboration.support_email : `mailto:${collaboration.support_email}`}
                                       target={supportEmailValidURL ? "_blank" : "_self"}>
                                        {collaboration.support_email}
                                    </a>
                                </p>
                            </div>
                        </div>}
                        {(isEmpty(collaboration.support_email) && !isEmpty(memberships)) &&
                            <div className="meta-section">
                                <div className="header">
                                    <EmailActionIcon/>
                                    <p>{I18n.t("models.collaboration.memberInformation")}</p>
                                </div>
                                <div className="values">
                                    {memberships
                                        .sort((m1, m2) => m1.user.name.localeCompare(m2.user.name))
                                        .map(m => <p key={m.id}><a href={`mailto:${m.user.email}`}>{m.user.name}</a>
                                        </p>)}
                                </div>
                            </div>}
                        {!showMembers &&
                            <div className={"member-disclaimer"}>
                                <p>{I18n.t("models.collaboration.discloseNoMemberInformation")}</p>
                            </div>}
                    </div>}

                {isJoinRequest && <div className="members">
                    <div className="members-header join-request">
                        <p>{I18n.t("models.collaboration.members", {nbr: collaboration.collaboration_memberships_count})}</p>
                        <p>{I18n.t("models.collaboration.discloseNoMemberInformationJoinRequest")}</p>
                    </div>
                </div>}
            </div>
        );
    }

}

export default AboutCollaboration;

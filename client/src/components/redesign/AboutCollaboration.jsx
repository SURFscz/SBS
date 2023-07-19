import React from "react";
import I18n from "../../locale/I18n";
import "./AboutCollaboration.scss";
import {isEmpty, removeDuplicates, stopEvent} from "../../utils/Utils";
import {CO_SHORT_NAME, SRAM_USERNAME} from "../../validations/regExps";
import ServiceCard from "../ServiceCard";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";


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
        const services = isJoinRequest ? [] : removeDuplicates(collaboration.services.concat(collaboration.organisation.services), "id");
        const {collaboration_memberships} = collaboration
        const showMembers = !isJoinRequest;
        let memberships = isJoinRequest ? [] : collaboration_memberships
            .filter(m => m.role === "admin")
            .sort((m1, m2) => m1.role.localeCompare(m2.role));
        const enabledServiceToken = services.filter(service => service.token_enabled).length > 0 && !isJoinRequest;
        return (
            <div className="collaboration-about-mod">
                <div className={"about"}>
                    <p className="description">{collaboration.description}</p>
                    {services.length > 0 && <div className="services">
                        <h4>{I18n.t("models.collaboration.services", {nbr: services.length})}</h4>

                        {services.sort((a, b) => a.name.localeCompare(b.name))
                            .map(service =>
                                <ServiceCard service={service}
                                             collaboration={collaboration}
                                             action={!isEmpty(service.uri) && this.openServiceUri(service, collaboration, user)}
                                             tokenAction={enabledServiceToken && this.openTokens}
                                             actionLabel={I18n.t("service.launch")}/>
                            )}

                    </div>}
                    {services.length === 0 &&
                        <div className="services">
                            {(services.length === 0 && !isJoinRequest) &&
                                <h2>{I18n.t("models.collaboration.noServices")}</h2>}
                            {isJoinRequest && <h2>{I18n.t("models.collaboration.noServicesJoinRequest")}</h2>}
                        </div>}
                </div>
                {!isJoinRequest &&
                    <div className="members">
                        <div className="members-header">
                            <p>{I18n.t("models.collaboration.memberInformation")}</p>
                        </div>
                        <table className={"admins"}>
                            <thead/>
                            <tbody>
                            {memberships
                                .sort((m1, m2) => m1.user.name.localeCompare(m2.user.name))
                                .map(m =>
                                    <tr key={m.id}>
                                        <td className={"name"}>
                                            {m.user.name}</td>
                                        <td className={"email"}><a href={`mailto:${m.user.email}`}>
                                            <FontAwesomeIcon
                                                icon="envelope"/></a>
                                        </td>
                                    </tr>)}
                            {!showMembers &&
                                <tr className={"member-disclaimer"}>
                                    <td colSpan={2}>{I18n.t("models.collaboration.discloseNoMemberInformation")}</td>
                                </tr>}
                            </tbody>
                        </table>
                    </div>}

                {isJoinRequest && <div className="members">
                    <div className="members-header join-request">
                        <p>{I18n.t("models.collaboration.members")}</p>
                        <p>{I18n.t("models.collaboration.discloseNoMemberInformationJoinRequest")}</p>
                    </div>
                </div>}
            </div>
        );
    }

}

export default AboutCollaboration;
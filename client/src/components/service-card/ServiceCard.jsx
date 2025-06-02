import React, {useState} from "react";

import "./ServiceCard.scss";
import Logo from "../_redesign/logo/Logo";
import {Chip, ChipType, Loader} from "@surfnet/sds";
import {MoreLessText} from "../more-less-text/MoreLessText";
import {ReactComponent as ArrowDown} from "@surfnet/sds/icons/functional-icons/arrow-down-2.svg";
import {ReactComponent as ArrowUp} from "@surfnet/sds/icons/functional-icons/arrow-up-2.svg";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import {serviceGroupsByServiceUuid4} from "../../api";

export default function ServiceCard({
                                        service,
                                        nameLinkAction,
                                        status,
                                        chipType,
                                        ActionButton,
                                        tokenAction,
                                        message,
                                        user,
                                        showAboutInformation,
                                        launchLink,
                                        limitWidth = false
                                    }) {
    const [showPolicies, setShowPolicies] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showGroups, setShowGroups] = useState(false);
    const [groupsLoaded, setGroupsLoaded] = useState(false);
    const [serviceGroups, setServiceGroups] = useState([]);

    const toggleShowPolicies = e => {
        stopEvent(e);
        if (!showPolicies) {
            setShowAbout(false);
            setShowGroups(false);
        }
        setShowPolicies(!showPolicies);
    }

    const toggleShowAbout = e => {
        stopEvent(e);
        if (!showAbout) {
            setShowPolicies(false);
            setShowGroups(false);
        }
        setShowAbout(!showAbout);
    }

    const toggleShowGroups = e => {
        stopEvent(e);
        if (!showGroups) {
            setShowPolicies(false);
            setShowAbout(false);
        }
        setShowGroups(!showGroups);
        if (!groupsLoaded) {
            serviceGroupsByServiceUuid4(service.uuid4).then(res => {
                setServiceGroups(res);
                setGroupsLoaded(true);
            });
        }
    }

    const renderAbout = () => {
        return (
            <div key={service.id} className="service-metadata">
                <div className={"policies"}>
                    <dt>{I18n.t("service.description")}</dt>
                    <dd>{service.description}</dd>
                </div>
            </div>
        );
    }

    const renderServiceGroups = () => {
        return (
            <div className="service-metadata">
                <div className={"service-groups"}>
                    {!groupsLoaded && <Loader/>}
                    {(groupsLoaded && isEmpty(serviceGroups)) && <p>{I18n.t("service.noGroups")}</p>}
                    {(groupsLoaded && !isEmpty(serviceGroups)) &&
                        <div>
                            <ul>
                                {serviceGroups.map((group, index) =>
                                    <li key={index}>
                                            <span className="service-group">
                                                {group.name}
                                            </span>
                                        {group.description && <span>{`: ${group.description}`}</span>}
                                    </li>
                                )}
                            </ul>
                        </div>}

                </div>
            </div>
        );
    }

    const renderPolicies = () => {
        const admins = (service.service_memberships || []).map(member => member.user)
        const admin = !isEmpty(service.contact_email) ? service.contact_email : !isEmpty(admins) ? admins[0].email : null;
        const adminName = !isEmpty(service.contact_email) ? service.contact_email : !isEmpty(admins) ? admins[0].name : null;
        const supportEmail = service.support_email;
        const hasPrivacyPolicy = !isEmpty(service.privacy_policy);
        return (
            <div className={"service-metadata"} key={service.id}>
                <div className={"policies"}>
                    <dt>{I18n.t("service.policies")}</dt>
                    {hasPrivacyPolicy &&
                        <a href={service.privacy_policy} target="_blank" rel="noopener noreferrer">
                            {I18n.t("footer.privacy")}
                        </a>}
                    {!hasPrivacyPolicy && <p>{I18n.t("models.services.confirmations.noPolicy")}</p>}
                    {service.accepted_user_policy &&
                        <a href={service.accepted_user_policy} target="_blank" rel="noopener noreferrer">
                            {I18n.t("service.accepted_user_policy")}
                        </a>}
                </div>
                <div className={"support"}>
                    <dt>{I18n.t("service.supportShort")}</dt>
                    {supportEmail && <dd>{I18n.t('service.supportContactPre')}
                        <a href={supportEmail.startsWith("http") ? supportEmail : `mailto:${supportEmail}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className={"soft-link"}>
                            {supportEmail}
                        </a>
                        {service.uri_info && <span>{I18n.t("service.or")}
                            <a href={service.uri_info}
                               target="_blank"
                               className={"soft-link"}
                               rel="noopener noreferrer">{I18n.t("service.visitWebsite")}</a></span>}
                    </dd>}
                    {(!supportEmail && service.uri_info) && <dd>{<span>{I18n.t("service.supportThroughWebsitePre")}
                        <a href={service.uri_info}
                           target="_blank"
                           className={"soft-link"}
                           rel="noopener noreferrer">{I18n.t("service.supportThroughWebsiteLink")}</a></span>}</dd>}
                    {(!supportEmail && !service.uri_info) &&
                        <dd>{I18n.t("service.noSupport", {name: service.name})}</dd>}
                    {!isEmpty(admin) && <dd className={"dd-seperator"}>{I18n.t("service.adminContact")}</dd>}
                    {!isEmpty(admin) && <dd><a href={`mailto:${admin}`}>{adminName}</a></dd>}
                </div>
            </div>
        );
    }

    return (
        <div key={service.id} className={`sds--content-card ${limitWidth ? "limit-width" : ""}`}>
            <div className="sds--content-card--main">
                <div className="sds--content-card--visual">
                    <div onClick={e => (nameLinkAction && user.admin) && nameLinkAction(e)}>
                        <Logo src={service.logo || service.service.logo}/>
                    </div>
                </div>
                <div className="sds--content-card--textual">
                    <div className="sds--content-card--text-and-actions">
                        <div>
                            <h4 className={`${service.organisation_name ? "" : "sds--space--bottom--1"}`}>
                                {service.name}
                            </h4>
                            {service.organisation_name &&
                                <h6 className="sds--space--bottom--1">{service.organisation_name}</h6>}
                            {!showAboutInformation && <p><MoreLessText txt={service.description}/></p>}
                            {message && <p className={chipType ? chipType : ""}>{message}</p>}
                            {(launchLink && service.uri) &&
                                <a href={service.uri}
                                   target={"_blank"}
                                   rel="noopener noreferrer">{I18n.t("service.launch")}</a>}
                        </div>
                        <div className="sds--content-card--actions">
                            <div>
                                {status && <Chip label={status} type={chipType || ChipType.Main_400}/>}
                                {ActionButton}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            <div className="sds--content-card--bottom">
                <nav>
                    <ul>
                        {(showAboutInformation && !isEmpty(service.description)) && <li>
                            <a className={"more-link"} href="/about"
                               onClick={toggleShowAbout}>{I18n.t("service.aboutShort")}{showAbout ? <ArrowUp/> :
                                <ArrowDown/>}</a>
                        </li>}
                        <li>
                            <a className={"more-link"} href="/policies"
                               onClick={toggleShowPolicies}>{I18n.t("service.policiesSupport")}{showPolicies ?
                                <ArrowUp/> :
                                <ArrowDown/>}</a>
                        </li>
                        <li>
                            <a className={"more-link"} href="/groups"
                               onClick={toggleShowGroups}>{I18n.t("service.groups")}{showGroups ?
                                <ArrowUp/> :
                                <ArrowDown/>}</a>
                        </li>
                        {(tokenAction && service.token_enabled) && <li>
                            <a href={`/tokens`} onClick={tokenAction}>{I18n.t("service.tokens")}</a>
                        </li>}
                    </ul>
                    {showPolicies && renderPolicies()}
                    {(showAbout && !isEmpty(service.description)) && renderAbout()}
                    {showGroups && renderServiceGroups()}
                </nav>
            </div>
        </div>)
}

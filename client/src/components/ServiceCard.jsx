import React, {useState} from "react";

import "./ServiceCard.scss";
import Logo from "./redesign/Logo";
import {Chip, ChipType, Tooltip} from "@surfnet/sds";
import {MoreLessText} from "./MoreLessText";
import {ReactComponent as ArrowDown} from "@surfnet/sds/icons/functional-icons/arrow-down-2.svg";
import {ReactComponent as ArrowUp} from "@surfnet/sds/icons/functional-icons/arrow-up-2.svg";
import {isEmpty, stopEvent} from "../utils/Utils";
import I18n from "../locale/I18n";

export default function ServiceCard({
                                        service,
                                        nameLinkAction,
                                        status,
                                        chipType,
                                        ActionButton,
                                        tokenAction,
                                        message,
                                        showAboutInformation,
                                        limitWidth = false
                                    }) {
    const [showPolicies, setShowPolicies] = useState(false);
    const [showAbout, setShowAbout] = useState(false);

    const toggleShowPolicies = e => {
        stopEvent(e);
        if (!showPolicies) {
            setShowAbout(false);
        }
        setShowPolicies(!showPolicies);
    }

    const toggleShowAbout = e => {
        stopEvent(e);
        if (!showAbout) {
            setShowPolicies(false);
        }
        setShowAbout(!showAbout);
    }

    const renderAbout = () => {
        return (<div className={"service-metadata"}>
            <div className={"policies"}>
                <dt>{I18n.t("service.description")}</dt>
                <dd>{service.description}</dd>
            </div>
        </div>);
    }

    const renderPolicies = () => {
        const admins = service.service_memberships.map(member => member.user)
        const admin = !isEmpty(service.contact_email) ? service.contact_email : !isEmpty(admins) ? admins[0].email : null;
        const adminName = !isEmpty(service.contact_email) ? service.contact_email : !isEmpty(admins) ? admins[0].name : null;
        const compliance = service.sirtfi_compliant || service.code_of_conduct_compliant || service.research_scholarship_compliant;
        const supportEmail = service.support_email
        return (<div className={"service-metadata"}>
            <div className={"policies"}>
                <dt>{I18n.t("service.policies")}</dt>
                {service.privacy_policy && <a href={service.privacy_policy} target="_blank" rel="noopener noreferrer">
                    {I18n.t("footer.privacy")}
                </a>}
                {service.accepted_user_policy &&
                    <a href={service.accepted_user_policy} target="_blank" rel="noopener noreferrer">
                        {I18n.t("service.accepted_user_policy")}
                    </a>}
                <dt>{I18n.t("service.compliancyShort")}</dt>
                {!compliance && <dd>{I18n.t("service.none")}</dd>}
                {service.code_of_conduct_compliant && <dd>{I18n.t("service.codeOfConductCompliantShort")}<Tooltip
                    tip={I18n.t("service.codeOfConductCompliantTooltip")}/></dd>}
                {service.sirtfi_compliant && <dd>{I18n.t("service.sirtfiCompliantShort")}<Tooltip
                    tip={I18n.t("service.sirtfiCompliantTooltip")}/></dd>}
                {service.research_scholarship_compliant &&
                    <dd>{I18n.t("service.researchScholarshipCompliantShort")}<Tooltip
                        tip={I18n.t("service.researchScholarshipCompliantTooltip")}/></dd>}
            </div>
            <div className={"support"}>
                <dt>{I18n.t("service.supportShort")}</dt>
                {supportEmail && <dd>{I18n.t('service.supportContactPre')}
                    <a href={`mailto:${supportEmail}`}
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
                {(!supportEmail && !service.uri_info) && <dd>{I18n.t("service.noSupport", {name: service.name})}</dd>}
                {!isEmpty(admin) && <dd className={"dd-seperator"}>{I18n.t("service.adminContact")}</dd>}
                {!isEmpty(admin) && <dd><a href={`mailto:${admin}`}>{adminName}</a></dd>}
            </div>
        </div>);
    }

    return (<div className={`sds--content-card ${limitWidth ? "limit-width" : ""}`}>
        <div className="sds--content-card--main">
            <div className="sds--content-card--visual">
                <div onClick={() => nameLinkAction && nameLinkAction()}>
                    <Logo src={service.logo || service.service.logo}/>
                </div>
            </div>
            <div className="sds--content-card--textual">
                <div className="sds--content-card--text-and-actions">
                    <div>
                        <h4 className="sds--space--bottom--1">
                            {service.name}
                        </h4>
                        {!showAboutInformation && <p><MoreLessText txt={service.description}/></p>}
                        {message && <p className={chipType ? chipType : ""}>{message}</p>}
                    </div>
                    <div className="sds--content-card--actions">
                        <div>
                            {status && <Chip label={status} type={chipType || ChipType.Main_300}/>}
                            {ActionButton}
                        </div>

                    </div>
                </div>
            </div>
        </div>
        <div className="sds--content-card--bottom">
            <nav>
                <ul>
                    {showAboutInformation && <li>
                        <a className={"more-link"} href="/about"
                           onClick={toggleShowAbout}>{I18n.t("service.aboutShort")}{showAbout ? <ArrowUp/> :
                            <ArrowDown/>}</a>
                    </li>}
                    <li>
                        <a className={"more-link"} href="/policies"
                           onClick={toggleShowPolicies}>{I18n.t("service.policiesSupport")}{showPolicies ? <ArrowUp/> :
                            <ArrowDown/>}</a>
                    </li>
                    {tokenAction && <li>
                        <a href={`/tokens`} onClick={tokenAction}>{I18n.t("service.tokens")}</a>
                    </li>}
                </ul>
                {showPolicies && renderPolicies()}
                {showAbout && renderAbout()}
            </nav>
        </div>
    </div>)
}
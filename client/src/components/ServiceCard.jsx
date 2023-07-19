import React, {useState} from "react";

import "./ServiceCard.scss";
import Logo from "./redesign/Logo";
import {Chip, ChipType, Tooltip} from "@surfnet/sds";
import Button from "./Button";
import {MoreLessText} from "./MoreLessText";
import {ReactComponent as ArrowDown} from "@surfnet/sds/icons/functional-icons/arrow-down-2.svg";
import {ReactComponent as ArrowUp} from "@surfnet/sds/icons/functional-icons/arrow-up-2.svg";
import {isEmpty, stopEvent} from "../utils/Utils";
import I18n from "../locale/I18n";

export default function ServiceCard({service, status, action, tokenAction, actionLabel}) {

    const [showMore, setShowMore] = useState(false);

    const toggleShowMore = e => {
        stopEvent(e);
        setShowMore(!showMore);
    }

    const renderPolicies = () => {
        const admins = service.service_memberships.map(member => member.user)
        const admin = !isEmpty(service.contact_email) ? service.contact_email : !isEmpty(admins) ? admins[0].email : null;
        const adminName = !isEmpty(service.contact_email) ? service.contact_email : !isEmpty(admins) ? admins[0].name : null;
        const compliance = service.sirtfi_compliant || service.code_of_conduct_compliant || service.research_scholarship_compliant;
        return (
            <div className={"service-metadata"}>
                <div className={"policies"}>
                    <dt>{I18n.t("service.policies")}</dt>
                    {service.privacy_policy &&
                        <a href={service.privacy_policy} target="_blank" rel="noopener noreferrer">
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
                    {admin && <dd>{I18n.t('service.supportContactPre')}
                        <a href={`mailto:${admin}`}
                           className={"soft-link"}>
                            {adminName}
                        </a>
                        {service.uri_info && <span>{I18n.t("service.or")}
                            <a href={service.uri_info}
                               target="_blank"
                               className={"soft-link"}
                               rel="noopener noreferrer">{I18n.t("service.visitWebsite")}</a></span>}
                    </dd>}
                    {!admin && <dd>{I18n.t("service.noSupport", {name: service.name})}</dd>}
                    {!isEmpty(admins) && <dd className={"dd-seperator"}>{I18n.t("service.adminContact")}</dd>}
                    {!isEmpty(admins) && <dd><a href={`mailto:${admins[0].email}`}>{admins[0].name}</a></dd>}
                </div>
            </div>);
    }

    return (<div className="sds--content-card">
        <div className="sds--content-card--main">
            <div className="sds--content-card--visual">

                <Logo src={service.logo}/>
            </div>
            <div className="sds--content-card--textual">
                <h4 className="sds--space--bottom--1">{service.name}</h4>
                <div className="sds--content-card--text-and-actions">
                    <p><MoreLessText txt={service.description}/></p>
                    <div className="sds--content-card--actions">
                        {status && <Chip label={"Active"} type={ChipType.Main_300}/>}
                        {action && <Button onClick={action} txt={actionLabel}/>}
                    </div>
                </div>
            </div>
        </div>
        <div className="sds--content-card--bottom">
            <nav>
                <ul>
                    <li>
                        <a className={"more-link"} href="/more"
                           onClick={toggleShowMore}>{I18n.t("service.policiesSupport")}{showMore ? <ArrowUp/> :
                            <ArrowDown/>
                        }</a>
                    </li>
                    {tokenAction && <li>
                        <a href={`/tokens`} onClick={tokenAction}>{I18n.t("service.tokens")}</a>
                    </li>}
                </ul>
                {showMore && renderPolicies()}
            </nav>
        </div>
    </div>)
}
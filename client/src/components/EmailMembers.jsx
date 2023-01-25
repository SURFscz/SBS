import React from "react";
import I18n from "i18n-js";
import "./Footer.scss"
import {emailMembersLink, isEmpty} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "./EmailMembers.scss";

export default function EmailMembers({title, members, allowEmailLink}) {
    return (
        <div className="mail-members-container">
            <p className="mail-members-title title-header">{title}</p>
            {(allowEmailLink && !isEmpty(members)) && <span className="mail-members">
                   <a target="_blank" href={`mailto:${emailMembersLink(members)}`} rel="noopener noreferrer">
                    <span data-tip data-for="mail-members"> <FontAwesomeIcon icon="envelope"/></span>
                       {I18n.t("organisationDetail.mailMembers")}
                       </a>
                    <ReactTooltip id="mail-members" type="info" effect="solid" data-html={true}>
                        <p dangerouslySetInnerHTML={{__html: I18n.t("organisationDetail.mailMembersTooltip")}}/>
                    </ReactTooltip>

                </span>}
        </div>

    );
}

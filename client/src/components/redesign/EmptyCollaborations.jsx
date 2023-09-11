import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import I18n from "../../locale/I18n";
import Button from "../Button";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import {isEmpty} from "../../utils/Utils";


export default class EmptyCollaborations extends React.PureComponent {

    render() {
        const {user} = this.props;
        const isOrgManager = isUserAllowed(ROLES.ORG_MANAGER, user);
        const organisationFromUserSchacHome = user.organisation_from_user_schac_home || {};
        const mayCreateCollaborations = isOrgManager || organisationFromUserSchacHome.collaboration_creation_allowed ||
            organisationFromUserSchacHome.collaboration_creation_allowed_entitlement;
        const organisationQueryParam = isEmpty(organisationFromUserSchacHome) ? "" : `?organisationId=${organisationFromUserSchacHome.id}`;
        const newLabel = I18n.t(`models.${mayCreateCollaborations ? "collaborations" : "memberCollaborations"}.new`);
        const newPath = `/new-collaboration${organisationQueryParam}`;
        const info = isOrgManager ? I18n.t("models.collaborations.noCollaborations"):
            I18n.t(`models.collaborations.noCollaborations${mayCreateCollaborations ? "" : "Request"}User`);
        return (
            <div className="no-collaborations">
                <TreeSwing/>
                <p>{info}</p>
                <Button txt={newLabel}
                        onClick={() => {
                            this.props.history.push(newPath)
                        }}/>

            </div>
        )
    }

}


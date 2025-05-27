import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import I18n from "../../locale/I18n";
import Button from "../button/Button";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import {isEmpty} from "../../utils/Utils";


export default class EmptyCollaborations extends React.PureComponent {

    render() {
        const {user} = this.props;
        const isOrgManager = isUserAllowed(ROLES.ORG_MANAGER, user);
        const organisationsFromUserSchacHome = user.organisations_from_user_schac_home || [];
        const createFromSchacHome = organisationsFromUserSchacHome
            .some(org => org.collaboration_creation_allowed || org.collaboration_creation_allowed_entitlement)

        const mayCreateCollaborations = isOrgManager || createFromSchacHome;
        const organisationsQueryParam = isEmpty(organisationsFromUserSchacHome) ? "" : `?organisationId=${organisationsFromUserSchacHome.map(org => org.id).join(",")}`;
        const newLabel = I18n.t(`models.${mayCreateCollaborations ? "collaborations" : "memberCollaborations"}.new`);
        const newPath = `/new-collaboration${organisationsQueryParam}`;
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

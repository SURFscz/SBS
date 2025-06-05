import React, {useEffect, useState} from "react";

import "./CollaborationsOverview.scss"
import SpinnerField from "../../components/redesign/spinner-field/SpinnerField";
import {allCollaborationsOptimized, myCollaborationsOptimized} from "../../api";
import {AppStore} from "../../stores/AppStore";
import I18n from "../../locale/I18n";
import {ReactComponent as TreeSwing} from "../../images/tree_swing_static.svg";
import {getUserRequests} from "../../utils/UserRole";
import {isEmpty, stopEvent} from "../../utils/Utils";
import {Button} from "@surfnet/sds";
import CollaborationCard from "../../components/collaborationcard/CollaborationCard";

export default function CollaborationsOverview(props) {
    const [loading, setLoading] = useState(true);
    const [collaborations, setCollaborations] = useState([]);
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        const promise = props.user.admin ? allCollaborationsOptimized() : myCollaborationsOptimized()
        promise.then(res => {
            setCollaborations(res);
            setLoading(false);
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")}
                ];
            });
            setRequests(getUserRequests(props.user));
        });
    }, []);

    if (loading) {
        return <SpinnerField/>
    }

    const showRequests = e => {
        stopEvent(e);
        props.history.push("/my-requests");
    }

    const {user} = props;
    const organisationsFromUserSchacHome = user.organisations_from_user_schac_home || [];
    const mayCreateCollaborations = organisationsFromUserSchacHome.some(org => org.collaboration_creation_allowed ||
        org.collaboration_creation_allowed_entitlement);
    const mayRequestCollaboration = !isEmpty(organisationsFromUserSchacHome);
    const newLabel = I18n.t(`collaborationsOverview.${mayCreateCollaborations ? "create" : "request"}`);
    return (
        <div className="mod-collaborations-overview">
            <div className="tree-swing-container">
                <TreeSwing/>
            </div>
            <h2>{I18n.t("collaborationsOverview.welcome", {name: user.name})}</h2>
            <p>{I18n.t("collaborationsOverview.select")}</p>
            <div className="collaborations">
                {collaborations.map((collaboration, index) =>
                    <CollaborationCard key={index} collaboration={collaboration} user={user} history={props.history}/>)}
            </div>
            <div className="actions">
                {mayRequestCollaboration && <Button txt={newLabel}
                                                    onClick={() => props.history.push("/new-collaboration")}/>}
                {!isEmpty(requests) &&
                    <>
                        {mayRequestCollaboration && <span>{I18n.t("service.or")}</span>}
                        <a href="#" onClick={showRequests}>{I18n.t("collaborationsOverview.viewRequests")}</a>
                    </>
                }
            </div>
        </div>
    );
}

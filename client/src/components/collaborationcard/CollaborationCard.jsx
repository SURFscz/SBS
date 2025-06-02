import React from "react";

import "./CollaborationCard.scss";
import Logo from "../_redesign/logo/Logo";
import {Button, Chip, ChipType} from "@surfnet/sds";
import I18n from "../../locale/I18n";

export default function CollaborationCard({
                                              collaboration,
                                              user,
                                              history
                                          }) {

    const openCollaboration = () => {
        history.push(`/collaborations/${collaboration.id}`);
    }


    const isAdmin = (user.collaboration_memberships
        .find(cm => cm.collaboration_id === collaboration.id) || {}).role === "admin";
    return (
        <div key={collaboration.id} className="sds--content-card">
            <div className="sds--content-card--main">
                <div className="sds--content-card--visual">
                    <Logo src={collaboration.logo}/>
                </div>
                <div className="sds--content-card--textual">
                    <div className="sds--content-card--text-and-actions">
                        <div>
                            <p className="org-name">{collaboration.organisation.name}</p>
                            <p className="sds--space--bottom--1 coll-name">
                                {collaboration.name}
                            </p>
                        </div>
                        <div className="sds--content-card--actions">
                            {isAdmin && <Chip label={I18n.t("profile.admin")} type={ChipType.Main_400}/>}
                            <Button txt={I18n.t("collaborationsOverview.open")}
                                    onClick={openCollaboration}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

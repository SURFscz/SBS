import React, {useEffect, useState} from "react";
import "./MissingAttributes.scss";
import I18n from "../../locale/I18n";
import DOMPurify from "dompurify";
import noAccess from "../../undraw/undraw_access_denied_re_awnf.svg";

export default function MissingAttributes() {

    const [entityId, setEntityId] = useState("");
    const [issuerId, setIssuerId] = useState("");
    const [userId, setUserId] = useState("");

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        setEntityId(urlSearchParams.get("aud"));
        setIssuerId(urlSearchParams.get("iss"));
        setUserId(urlSearchParams.get("sub"));
    }, [])

    const timeStamp = new Date().toUTCString();
    return (
        <div className="mod-missing-attributes">
            <div className="content">
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("missingAttributes.info"))}}/>
                <div className={"image-container"}>
                    <img src={noAccess}
                         className={"no-access"}
                         alt="No Access"/>
                </div>
                {(entityId || issuerId || userId) &&
                    <div className="ticket">
                        <p dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("sfo.ticket", {
                                subject: I18n.t("sfo.subject", {name: entityId}),
                                entityId: entityId,
                                issuerId: issuerId,
                                userId: userId,
                                timestamp: timeStamp
                            }))
                        }}/>
                        {entityId && <span>{I18n.t("sfo.entityId")}</span>}
                        {entityId && <span className={"value"}>{entityId}</span>}
                        {issuerId && <span>{I18n.t("sfo.issuerId")}</span>}
                        {issuerId && <span className={"value"}>{issuerId}</span>}
                        {userId && <span>{I18n.t("sfo.userId")}</span>}
                        {userId && <span className={"value"}>{userId}</span>}
                        <span>{I18n.t("sfo.timestamp")}</span>
                        <span className={"value"}>{timeStamp}</span>
                    </div>}

            </div>
        </div>
    );
}

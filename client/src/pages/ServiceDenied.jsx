import React, {useEffect, useState} from "react";
import "./ServiceDenied.scss";
import {ReactComponent as NoAccess} from "../lotties/undraw_access_denied.svg";
import I18n from "../locale/I18n";
import escape from "lodash.escape";
import DOMPurify from "dompurify";

export default function ServiceDenied() {

    const [serviceName, setServiceName] = useState("");
    const [userId, setUserId] = useState("");
    const [entityId, setEntityId] = useState("");
    const [issuerId, setIssuerId] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const name = urlSearchParams.get("service_name");
        const userId = urlSearchParams.get("user_id");
        const entityId = urlSearchParams.get("entity_id");
        const issuerId = urlSearchParams.get("issuer_id");
        const status = urlSearchParams.get("error_status");
        setServiceName(escape(name));
        setUserId(escape(userId));
        setEntityId(escape(entityId));
        setIssuerId(escape(issuerId));
        setStatus(status);
    }, []);

    const timestamp = new Date().toUTCString();
    return (
        <div className="mod-service-denied">
            <div className="content">
                <h1 dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("sfo.title", {name: serviceName}))}}/>
                <NoAccess/>
                {<div className={"status"}
                      dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`sfo.info${status || ""}`, {name: serviceName}))}}/>}
            </div>
            <div className={"ticket"}>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("sfo.ticket", {
                        subject: I18n.t("sfo.subject", {name: serviceName}),
                        entityId: entityId,
                        issuerId: issuerId,
                        userId: userId,
                        timestamp: timestamp
                    }))
                }}/>
                <span>{I18n.t("sfo.entityId")}</span>
                <span className={"value"}>{entityId}</span>
                <span>{I18n.t("sfo.issuerId")}</span>
                <span className={"value"}>{issuerId}</span>
                <span>{I18n.t("sfo.userId")}</span>
                <span className={"value"}>{userId}</span>
                <span>{I18n.t("sfo.timestamp")}</span>
                <span className={"value"}>{timestamp}</span>
            </div>
        </div>
    );
}

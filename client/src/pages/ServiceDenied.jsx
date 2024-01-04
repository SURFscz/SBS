import React, {useEffect, useState} from "react";
import "./ServiceDenied.scss";
import {ReactComponent as NoAccessIcon} from "../icons/service-denied-1.svg";
import {ReactComponent as LogonPrevIcon} from "../icons/service-denied-2.svg";
import {ReactComponent as HappyIcon} from "../icons/landing/happy.svg";
import {ReactComponent as ErrorInfoIcon} from "../icons/service-denied-3.svg";
import I18n from "../locale/I18n";
import escape from "lodash.escape";
import DOMPurify from "dompurify";
import {capitalize} from "../utils/Utils";

export default function ServiceDenied() {

    const [serviceName, setServiceName] = useState("");
    const [userId, setUserId] = useState("");
    const [entityId, setEntityId] = useState("");
    const [issuerId, setIssuerId] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        setServiceName(escape(urlSearchParams.get("service_name")));
        setUserId(escape(urlSearchParams.get("user_id")));
        setEntityId(escape(urlSearchParams.get("entity_id")));
        setIssuerId(escape(urlSearchParams.get("issuer_id")));
        setStatus(urlSearchParams.get("error_status"));
    }, []);

    const translate = item => {
        return item
            .replaceAll("{{serviceName}}", serviceName)
            .replaceAll("{{userId}}", userId)
            .replaceAll("{{subject}}", I18n.t("sfo.subject", {name: serviceName}))
            .replaceAll("{{entityId}}", entityId)
            .replaceAll("{{issuerId}}", issuerId)
            .replaceAll("{{timestamp}}", timestamp)
    }

    const infoBlock = (name, Logo) => {
        const translations = I18n.translations[I18n.locale].serviceDenied
        return (
            <div key={name} className="service-denied-info">
                <Logo/>
                <div className="header-left info">
                    <h4>{translations[`${name}Title`]}</h4>
                    <ul>
                        {translations[name].map((item, index) =>
                            <li key={index} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(translate(item))}}/>
                        )}
                    </ul>
                </div>
            </div>
        )
    }

    const timestamp = capitalize(new Intl.DateTimeFormat(`${I18n.locale}-${I18n.locale.toUpperCase()}`,
        {dateStyle: "full", timeStyle: "long"}).format(new Date()));
    return (
        <div className="mod-service-denied">
            <div className="content-container">
                <div className="content">
                    <h1 dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("sfo.title", {name: serviceName}))}}/>
                    <NoAccessIcon/>
                </div>
            </div>
            <div className="info-container">
                <div className="info">
                    {infoBlock("loginPrev", LogonPrevIcon)}
                    {infoBlock("neverBeenBefore", HappyIcon)}
                    <div className="service-denied-info  ticket">
                        <ErrorInfoIcon/>
                        <div className="header-left info">
                            <h4>{I18n.t("serviceDenied.ticketInfoTitle")}</h4>
                            <p className={"status"}
                               dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`sfo.info${status || ""}`, {name: serviceName}))}}/>
                            <p dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(I18n.t("sfo.ticket", {
                                    subject: I18n.t("sfo.subject", {name: serviceName}),
                                    entityId: entityId,
                                    issuerId: issuerId,
                                    userId: userId,
                                    timestamp: timestamp
                                }))
                            }}/>
                            <div className="session-info">
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

                    </div>
                </div>
            </div>
        </div>
    );
}

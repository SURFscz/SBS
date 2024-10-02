import React, {useEffect, useState} from "react";
import "./ServiceDenied.scss";
import {ReactComponent as NoAccessIcon} from "../icons/service-denied-1.svg";
import {ReactComponent as LogonPrevIcon} from "../icons/service-denied-2.svg";
import {ReactComponent as HappyIcon} from "../icons/landing/happy.svg";
import {ReactComponent as ErrorInfoIcon} from "../icons/service-denied-3.svg";
import I18n from "../locale/I18n";
import escape from "lodash.escape";
import DOMPurify from "dompurify";
import {capitalize, isEmpty} from "../utils/Utils";
import {serviceInfo} from "../api";
import Button from "../components/Button";
import SpinnerField from "../components/redesign/SpinnerField";

export default function ServiceDenied(props) {

    const [serviceName, setServiceName] = useState("");
    const [userId, setUserId] = useState("");
    const [entityId, setEntityId] = useState("");
    const [issuerId, setIssuerId] = useState("");
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [organisations, setOrganisations] = useState([]);
    const [schacHomeOrganisation, setSchacHomeOrganisation] = useState("");
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [supportEmail, setSupportEmail] = useState("");

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const entity_id = urlSearchParams.get("entity_id");
        setServiceName(escape(urlSearchParams.get("service_name")));
        const user_id = urlSearchParams.get("user_id");
        setUserId(escape(user_id));
        setEntityId(escape(entity_id));
        setIssuerId(escape(urlSearchParams.get("issuer_id")));
        setStatus(urlSearchParams.get("error_status"));
        serviceInfo(entity_id, user_id)
            .then(res => {
                setOrganisations(res.organisations);
                setUserName(res.user_name);
                setUserEmail(res.user_email)
                setSchacHomeOrganisation(res.schac_home_organisation || I18n.t("welcome.unknown"));
                setSupportEmail(res.support_email);
                setLoading(false);
            })
            .catch(() => props.history.push("/404"));
    }, []);

    const invitationsBlock = () => {
        return (
            <div className="service-denied-info">
                <LogonPrevIcon/>
                <div className="header-left info">
                    <h4>{I18n.t("serviceDenied.invitationsTitle")}</h4>
                    <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("serviceDenied.invitationsSubTitle", {
                            serviceName: serviceName
                        }))
                    }}/>
                    <ul>
                        <li dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("serviceDenied.invitationsBullets.invited"))}}/>
                        <li dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("serviceDenied.invitationsBullets.login", {
                                schacHome: schacHomeOrganisation
                            }))
                        }}/>
                    </ul>
                </div>
            </div>
        )
    }

    const contactAction = () => {
        const link = document.createElement("a");
        link.target = "_blank";
        if (supportEmail.startsWith("http")) {
            link.href = supportEmail;
        } else {
            const href =
                I18n.t("serviceDenied.contactEmail", {
                    supportEmail: supportEmail,
                    serviceName: serviceName,
                    userName: userName,
                    userEmail: userEmail,
                    schacHome: schacHomeOrganisation
                });
            const hrefLink = /href='(.*)'/.exec(href)[1];
            link.href = hrefLink
        }
        link.click();
    };

    const gainingAccessBlock = () => {
        const mayCreateOrRequest = !isEmpty(organisations);
        const mayCreate = organisations.some(org => org.co_creation);
        return (
            <div className="service-denied-info">
                <HappyIcon/>
                <div className="header-left info">
                    <h4>{I18n.t("serviceDenied.gainingAccessTitle")}</h4>
                    <ul>
                        <li dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("serviceDenied.gainingAccessBullets.pointed", {
                                serviceName: serviceName
                            }))
                        }}/>
                        {mayCreateOrRequest && <li dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("serviceDenied.gainingAccessBullets.request", {
                                action: I18n.t(`serviceDenied.${mayCreate ? "create" : "request"}`),
                                schacHome: schacHomeOrganisation
                            }))
                        }}/>}
                        {!isEmpty(supportEmail) && <li dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("serviceDenied.gainingAccessBullets.contact", {
                                contact: I18n.t(`serviceDenied.${supportEmail.startsWith("http") ? "contactUrl" : "contactEmail"}`, {
                                    supportEmail: supportEmail,
                                    serviceName: serviceName,
                                    userName: userName,
                                    userEmail: userEmail,
                                    schacHome: schacHomeOrganisation
                                })
                            }))
                        }}/>}
                    </ul>
                    <div className="actions">
                        {mayCreateOrRequest &&
                            <Button txt={I18n.t(`serviceDenied.${mayCreate ? "create" : "request"}Collaboration`)}
                                    onClick={() => props.history.push("/new-collaboration")}
                            />
                        }
                        {!isEmpty(supportEmail) &&
                            <Button txt={I18n.t(`serviceDenied.requestAccess`)}
                                    onClick={contactAction}
                            />}
                    </div>
                </div>
            </div>
        )
    }

    const gettingSupportBlock = () => {
        return (
            <div className="service-denied-info  ticket">
                <ErrorInfoIcon/>
                <div className="header-left info">
                    <h4>{I18n.t("serviceDenied.supportTitle")}</h4>
                    <p className={"status"}
                       dangerouslySetInnerHTML={{
                           __html: DOMPurify.sanitize(I18n.t("serviceDenied.supportBullets.solutions", {
                               subject: I18n.t("sfo.subject", {name: serviceName}),
                               entityId: entityId,
                               issuerId: issuerId,
                               userId: userId,
                               timestamp: timestamp
                           }))
                       }}/>
                    {status && <p className={"status"}
                                  dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`sfo.info${status}`, {name: serviceName}))}}/>}
                    <p className="status">{I18n.t("serviceDenied.supportSubTitle")}</p>

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

        );
    }

    if (loading) {
        return <SpinnerField/>
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
                    {invitationsBlock()}
                    {gainingAccessBlock()}
                    {gettingSupportBlock()}
                </div>
            </div>
        </div>
    );
}

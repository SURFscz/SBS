import React, {useEffect, useState} from "react";
import "./PAM.scss";
import {Loader} from "@surfnet/sds";
import I18n from "../../locale/I18n";
import {checkPamPin, pamServices, pamStart, pamWebSSOSession, pollPamWebSSO} from "../../api";
import SelectField from "../../components/select-field/SelectField";
import InputField from "../../components/input-field/InputField";
import Button from "../../components/button/Button";
import {isEmpty, stopEvent} from "../../utils/Utils";

export default function PAM() {

    const userAttributesOptions = ["email", "eduperson_principal_name", "username", "uid"].map(attribute => ({
        label: attribute,
        value: attribute
    }))

    const [services, setServices] = useState([]);
    const [pamService, setPamService] = useState(null);
    const [pamToken, setPamToken] = useState("");
    const [pamSession, setPamSession] = useState({});
    const [pamSessionError, setPamSessionError] = useState({});
    const [startSession, setStartSession] = useState({});
    const [pollResult, setPollResult] = useState(null);
    const [secondPollResult, setSecondPollResult] = useState(null);
    const [validatePin, setValidatePin] = useState({});
    const [userAttribute, setUserAttribute] = useState(userAttributesOptions[0]);
    const [userIdentifier, setUserIdentifier] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        pamServices().then(res => {
            res.forEach(service => {
                service.value = service.id;
                service.label = service.name;
            });
            setServices(res);
            setPamService(res[0]);
            setLoading(false);
        });
    }, []);

    const doPamStart = () => {
        pamStart(pamToken, userAttribute.value, userIdentifier)
            .then(res => {
                setStartSession(res);
                const serviceAbbreviation = pamService.abbreviation;
                if (res.cached) {
                    return;
                }
                const sessionId = res.session_id;
                pamWebSSOSession(serviceAbbreviation, sessionId)
                    .then(ssoSessionResults => {
                        setPamSession(ssoSessionResults);
                        pollPamWebSSO(sessionId).then(r => {
                            setPollResult(r);
                            checkPamPin(pamToken, sessionId, ssoSessionResults.pin)
                                .then(pinResult => {
                                    setValidatePin(pinResult);
                                    pollPamWebSSO(sessionId).then(r2 => {
                                        setSecondPollResult(r2);
                                    });
                                })
                        })
                    })
            })
            .catch(e => {
                if (e.response && e.response.json) {
                    e.response.json().then(errorJson => {
                        setPamSessionError(errorJson);
                    });
                }
            })
    }

    const resetForm = () => {
        setPamService(services[0]);
        setPamToken("");
        setPamSession({});
        setPamSessionError({});
        setStartSession({});
        setPollResult(null);
        setSecondPollResult(null);
        setValidatePin({});
        setUserAttribute(userAttributesOptions[0]);
        setUserIdentifier("");
    }

    if (loading) {
        return (<Loader/>);
    }

    return (<div className={"mod-pam-container"}>
            <div className="form">
                <SelectField value={pamService}
                             options={services}
                             name={I18n.t("system.pam.service")}
                             toolTip={I18n.t("system.pam.serviceTooltip")}
                             onChange={option => setPamService(option)}
                             required={true}
                             searchable={true}/>
                <InputField value={pamToken}
                            onChange={e => setPamToken(e.target.value)}
                            name={I18n.t("system.pam.pamToken")}
                            toolTip={I18n.t("system.pam.pamTokenTooltip")}
                            required={true}/>
                <SelectField value={userAttribute}
                             options={userAttributesOptions}
                             name={I18n.t("system.pam.userAttribute")}
                             toolTip={I18n.t("system.pam.userAttributeTooltip")}
                             onChange={option => setUserAttribute(option)}
                             required={true}
                             clearable={false}
                             searchable={false}/>
                <InputField value={userIdentifier}
                            onChange={e => setUserIdentifier(e.target.value)}
                            name={I18n.t("system.pam.userIdentifier")}
                            toolTip={I18n.t("system.pam.userIdentifierTooltip")}
                            required={true}/>
                <div className="actions">
                <Button txt={I18n.t("system.pam.reset")}
                        onClick={resetForm}
                        cancelButton={true}
                        small={true}
                />
                <Button txt={I18n.t("system.pam.start")}
                        onClick={doPamStart}
                        small={true}
                        disabled={isEmpty(pamToken) || isEmpty(userIdentifier)}/>

                </div>

                {(!isEmpty(startSession) && startSession.cached) && <div className="pam-weblogin-results">
                    <h4>{I18n.t("system.pam.steps")}</h4>
                    <h5>{I18n.t("system.pam.startSessionResultsCached")}</h5>
                    <code>{JSON.stringify(startSession)}</code>
                </div>}
                {(!isEmpty(startSession) && !startSession.cached) && <div className="pam-weblogin-results">
                    <h4>{I18n.t("system.pam.steps")}</h4>
                    <h5>{I18n.t("system.pam.startSessionResults")}</h5>
                    <img src={`data:image/jpeg;base64,${startSession.qr_code_png}`} alt="QR-code"/>
                    <a href="/client/public" onClick={stopEvent}>{startSession.url}</a>
                </div>}
                {!isEmpty(pamSession) && <div className="pam-weblogin-results">
                    <h5>{I18n.t("system.pam.sessionResult")}</h5>
                    <InputField value={pamSession.pin}
                                name={I18n.t("system.pam.pin")}
                                disabled={true}/>
                    <InputField value={pamSession.validation.info}
                                name={I18n.t("system.pam.info")}
                                disabled={true}/>
                </div>}
                {!isEmpty(pamSessionError) && <div className="pam-weblogin-results">
                    <h5>{I18n.t("system.pam.startSessionErrors")}</h5>
                    <code>{JSON.stringify(pamSessionError)}</code>
                </div>}
                {(pollResult !== null) && <div className="pam-weblogin-results">
                    <h5>{I18n.t("system.pam.pollResult")}</h5>
                    <code>{JSON.stringify(pollResult)}</code>
                </div>}
                {!isEmpty(validatePin) && <div className="pam-weblogin-results">
                    <h5>{I18n.t("system.pam.validatePinResult")}</h5>
                    <InputField name={validatePin.result}
                                value={validatePin.info}
                                disabled={true}
                    />
                    <h6>{I18n.t("system.pam.memberships")}</h6>
                    <ul>
                        {validatePin.collaborations.concat(validatePin.groups)
                            .map(membership => <li>{membership.name}</li>)}
                    </ul>
                </div>}
                {(secondPollResult !== null) && <div className="pam-weblogin-results">
                    <h5>{I18n.t("system.pam.pollResult")}</h5>
                    <code>{JSON.stringify(secondPollResult)}</code>
                </div>}

            </div>
        </div>);
}

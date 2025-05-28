import React, {useState} from "react";
import "./ProxyLogin.scss";
import {Loader} from "@surfnet/sds";
import I18n from "../locale/I18n";
import {proxyAuthzEduTeams, proxyAuthzEngineBlock, startEBInterruptFlow} from "../api";
import InputField from "../components/input-field/InputField";
import Button from "../components/button/Button";
import {isEmpty, scrollToBottom} from "../utils/Utils";
import CheckBox from "../components/checkbox/CheckBox";
import SelectField from "../components/select-field/SelectField";

export default function ProxyLogin({config}) {

    const integrationBackendOptions = [
        I18n.t("system.proxy.engineBlock"),
        I18n.t("system.proxy.eduTeams")
    ].map(backend => ({label: backend, value: backend}));

    const [userUrn, setUserUrn] = useState("");
    const [userEppn, setUserEppn] = useState("");
    const [serviceEntityId, setServiceEntityId] = useState("");
    const [idpEntityId, setIdpEntityId] = useState("https://mock.idp");
    const [continueUrl, setContinueUrl] = useState("http://localhost:3000/mock-eb");
    const [useSRAMServiceEntityId, setUseSRAMServiceEntityId] = useState(false);
    const [integrationBackend, setIntegrationBackend] = useState(integrationBackendOptions[0]);
    const [proxyAuthzResult, setProxyAuthzResult] = useState(null);
    const [proxyAuthzError, setProxyAuthzError] = useState(null);
    const [loading, setLoading] = useState(false);

    const doProxyAuthz = () => {
        setLoading(true);
        const isEBFlow = integrationBackend.value !== I18n.t("system.proxy.engineBlock");
        const promise = isEBFlow ?
            proxyAuthzEduTeams(userUrn, serviceEntityId, idpEntityId, continueUrl)
            : proxyAuthzEngineBlock(userUrn, userEppn, serviceEntityId, idpEntityId, continueUrl);
        promise
            .then(res => {
                setProxyAuthzResult(res);
                localStorage.setItem("nonce", res.nonce);
                setLoading(false);
                scrollToBottom();
            })
            .catch(e => {
                setLoading(false);
                if (e.response && e.response.json) {
                    e.response.json().then(errorJson => {
                        setProxyAuthzError(errorJson);
                        scrollToBottom();
                    });
                }
            })
    }

    const doRedirect = () => {
        setLoading(true);
        startEBInterruptFlow().then(() => {
            const isEBFlow = integrationBackend.value === I18n.t("system.proxy.engineBlock")
            const url = isEBFlow ? `${config.base_server_url}/api/users/interrupt?nonce=${proxyAuthzResult.nonce}` :
                proxyAuthzResult.status.redirect_url;
            window.location.href = url;
        });
    }

    const resetForm = () => {
        setUserUrn("");
        setUserEppn("");
        setServiceEntityId("");
        setIdpEntityId("");
        setProxyAuthzResult(null);
        setProxyAuthzError(null);
    }

    if (loading) {
        return (<Loader/>);
    }

    const toggleUseSRAMServiceEntityId = e => {
        const checked = e.target.checked;
        setUseSRAMServiceEntityId(checked);
        if (checked) {
            setServiceEntityId(config.sram_service_entity_id)
        }
    }

    const isEBTeamsFlow = integrationBackend.value === I18n.t("system.proxy.engineBlock");

    return (
        <div className={"mod-proxy-container"}>
            <div className="form">
                <InputField value={userUrn}
                            onChange={e => setUserUrn(e.target.value)}
                            name={I18n.t(`system.proxy.userUid${isEBTeamsFlow ? "EB" : ""}`)}
                            required={true}/>

                {isEBTeamsFlow && <InputField value={userEppn}
                                              onChange={e => setUserEppn(e.target.value)}
                                              name={I18n.t("system.proxy.userEppn")}
                                              required={true}/>}

                <InputField value={serviceEntityId}
                            onChange={e => {
                                setServiceEntityId(e.target.value)
                                setUseSRAMServiceEntityId(false);
                            }}
                            name={I18n.t("system.proxy.serviceEntityId")}
                            required={true}/>

                <CheckBox name="userSRAM"
                          value={useSRAMServiceEntityId}
                          info={I18n.t("system.proxy.useSRAMServiceEntityId")}
                          onChange={toggleUseSRAMServiceEntityId}/>

                <SelectField value={integrationBackend}
                             options={integrationBackendOptions}
                             name={I18n.t("system.proxy.mimic")}
                             toolTip={I18n.t("system.proxy.mimicTooltip")}
                             required={true}
                             searchable={false}
                             onChange={val => setIntegrationBackend(val)}/>

                <InputField value={idpEntityId}
                            onChange={e => setIdpEntityId(e.target.value)}
                            name={I18n.t("system.proxy.idpEntityId")}
                            required={true}/>

                <InputField value={continueUrl}
                            onChange={e => setContinueUrl(e.target.value)}
                            name={I18n.t("system.proxy.continueUrl")}
                            required={true}/>

                <div className="actions">
                    <Button txt={I18n.t("system.proxy.reset")}
                            onClick={resetForm}
                            cancelButton={true}
                            small={true}
                    />
                    <Button txt={I18n.t("system.proxy.start")}
                            onClick={doProxyAuthz}
                            small={true}
                            disabled={isEmpty(userUrn) || isEmpty(serviceEntityId) || isEmpty(idpEntityId) ||
                                isEmpty(continueUrl)}
                    />
                </div>

            </div>
            {(!isEmpty(proxyAuthzResult) || !isEmpty(proxyAuthzError)) &&
                <div className="proxy-weblogin-results">
                    <h6>{I18n.t(`system.proxy.${isEmpty(proxyAuthzError) ? "results" : "errors"}`)}</h6>
                    <InputField
                        value={JSON.stringify(isEmpty(proxyAuthzError) ? proxyAuthzResult : proxyAuthzError,
                            undefined, 4)}
                        disabled={true}
                        cols={14}
                        multiline={true}/>
                </div>}
            <div className="actions">
                {(!isEmpty(proxyAuthzResult) && isEmpty(proxyAuthzResult.attributes)) && <div className="form">
                    <Button txt={I18n.t("system.proxy.redirect")}
                            onClick={doRedirect}
                            small={true}
                    />
                </div>}
            </div>
        </div>
    );
}

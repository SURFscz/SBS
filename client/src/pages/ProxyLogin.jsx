import React, {useState} from "react";
import "./ProxyLogin.scss";
import {Loader} from "@surfnet/sds";
import I18n from "../locale/I18n";
import {proxyAuthz} from "../api";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty} from "../utils/Utils";
import CheckBox from "../components/CheckBox";

export default function ProxyLogin({config}) {

    const [userUid, setUserUid] = useState(" ");
    const [serviceEntityId, setServiceEntityId] = useState(" ");
    const [idpEntityId, setIdpEntityId] = useState("");
    const [useSRAMServiceEntityId, setUseSRAMServiceEntityId] = useState(false);
    const [proxyAuthzResult, setProxyAuthzResult] = useState(null);
    const [proxyAuthzError, setProxyAuthzError] = useState(null);
    const [loading, setLoading] = useState(false);

    const doProxyAuthz = () => {
        setLoading(true);
        proxyAuthz(userUid, serviceEntityId, idpEntityId)
            .then(res => {
                setProxyAuthzResult(res);
                setLoading(false);
            })
            .catch(e => {
                setLoading(false);
                if (e.response && e.response.json) {
                    e.response.json().then(errorJson => {
                        setProxyAuthzError(errorJson);
                    });
                }
            })
    }

    const resetForm = () => {
        setUserUid("");
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

    return (<div className={"mod-proxy-container"}>
        <div className="form">
            <InputField value={userUid}
                        onChange={e => setUserUid(e.target.value)}
                        name={I18n.t("system.proxy.userUid")}
                        required={true}/>
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
            <InputField value={idpEntityId}
                        onChange={e => setIdpEntityId(e.target.value)}
                        name={I18n.t("system.proxy.idpEntityId")}
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
                        disabled={isEmpty(userUid) || isEmpty(serviceEntityId) || isEmpty(idpEntityId)}
                />
            </div>

            {!isEmpty(proxyAuthzResult) && <div className="proxy-weblogin-results">
                <h6>{I18n.t("system.proxy.results")}</h6>
                <pre>{JSON.stringify(proxyAuthzResult, undefined, 4)}</pre>
            </div>}
            {!isEmpty(proxyAuthzError) && <div className="proxy-weblogin-results">
                <h6>{I18n.t("system.proxy.errors")}</h6>
                <pre>{JSON.stringify(proxyAuthzResult, undefined, 4)}</pre>
            </div>}

        </div>
    </div>);
}

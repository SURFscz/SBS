import React, {useState} from "react";
import "./MockEB.scss";

import I18n from "../../locale/I18n";
import Button from "../../components/button/Button";
import {ebStopInterruptFlow, engineBlockAttributes} from "../../api";
import {isEmpty} from "../../utils/Utils";
import JsonFormatter from "react-json-formatter";

export default function MockEB() {

    const [isStopped, setIsStopped] = useState(false);
    const [attributes, setAttributes] = useState({});

    const stopSession = () => {
        ebStopInterruptFlow().then(() => setIsStopped(true));
    }
    const getAttributes = () => {
        const nonce = localStorage.getItem("nonce");
        engineBlockAttributes(nonce)
            .then(res => setAttributes(res))
            .catch(e => {
                if (e.response && e.response.json) {
                    e.response.json().then(errorJson => {
                        setAttributes(errorJson);
                    });
                }
            })
    }

    return (
        <div className="mod-mock-eb">
            <div className="mod-inner-mock-eb">
                <p>
                    {I18n.t("system.proxy.hi")}
                </p>
                {isStopped && <p>
                    {I18n.t("system.proxy.stopped")}
                </p>}

                {!isEmpty(attributes) && <p>
                    <JsonFormatter json={attributes} tabWith={4}/>
                </p>}

                <div className="actions">
                    <Button txt={I18n.t("system.proxy.stop")}
                            onClick={stopSession}
                            disabled={isStopped}
                            small={true}
                    />
                    <Button txt={I18n.t("system.proxy.ebAttributes")}
                            onClick={getAttributes}
                            small={true}
                    />

                </div>
            </div>
        </div>
    );
}

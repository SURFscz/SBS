import React, {useState} from "react";
import "./MockEB.scss";

import I18n from "../locale/I18n";
import Button from "../components/Button";
import {ebStopInterruptFlow} from "../api";

export default function MockEB() {

    const [isStopped, setIsStopped] = useState(false);

    const stopSession = () => {
        ebStopInterruptFlow().then(() => setIsStopped(true));
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

                <div className="actions">
                    <Button txt={I18n.t("system.proxy.stop")}
                            onClick={stopSession}
                            disabled={isStopped}
                            small={true}
                    />
                </div>
            </div>
        </div>
    );
}

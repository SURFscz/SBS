import React, {useEffect, useState} from "react";
import "./SyncApplications.scss";
import {Loader} from "@surfnet/sds";
import I18n from "../locale/I18n";
import Button from "../components/Button";
import {serviceExportOverview, serviceSyncExternal} from "../api";
import {isEmpty, scrollToBottom} from "../utils/Utils";

export default function SyncApplications({config}) {

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [services, setServices] = useState(true);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState([]);

    useEffect(() => {
        serviceExportOverview().then(res => {
            setServices(res);
            setLoading(false);
        })
    }, [])

    if (loading) {
        return (<Loader/>);
    }

    //https://stackoverflow.com/questions/24586110/resolve-promises-one-after-another-i-e-in-sequence
    function startSyncing() {
        scrollToBottom();
        setBusy(true);
        setProgress(0);
        services.reduce((promiseChain, service, index) => {
          return promiseChain.then(() => {
              serviceSyncExternal(service.id).then(res => {
                const newProgress = Math.ceil((100 / services.length) * (index + 1));
                setProgress(newProgress);
                setResults([...results, {name: service.name, success: res.export_successful}]);
                if (index === services.length - 1) {
                    setBusy(false);
                }
            })
          });
        }, Promise.resolve());
    }

    return (
        <div className="mod-sync-container">
            <div className="form">
                <p>{I18n.t("system.sync.info", {
                    manageUrl: config.manage_base_url,
                    state: I18n.t(`system.sync.${config.manage_enabled ? "enabled" : "disabled"}`)
                })}</p>
                <div className="services">
                    <code>{JSON.stringify(services)}</code>
                </div>
                {(busy || !isEmpty(results)) &&
                    <div className="processing">
                        <p>{I18n.t("system.sync.progress")}</p>
                        <progress max="100" value={progress}/>
                    </div>}
                {!isEmpty(results) &&
                    <div className="results">
                        <p>{I18n.t("system.sync.results")}</p>
                        <code>{JSON.stringify(results)}</code>
                    </div>}
                <Button txt={I18n.t("system.sync.start")}
                        onClick={() => startSyncing()}
                        small={true}
                        disabled={loading || busy}
                />
            </div>
        </div>);
}

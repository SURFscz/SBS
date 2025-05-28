import React, {useEffect, useState} from "react";
import "./SyncApplications.scss";
import {Loader} from "@surfnet/sds";
import I18n from "../../locale/I18n";
import Button from "../../components/button/Button";
import {serviceExportOverview, serviceSyncExternal} from "../../api";
import {isEmpty, scrollToBottom, serial} from "../../utils/Utils";

export default function SyncApplications({config}) {

    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(false);
    const [busy, setBusy] = useState(false);
    const [services, setServices] = useState(true);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState([]);

    useEffect(() => {
        setLoading(true);
        serviceExportOverview().then(res => {
            setServices(res.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
            setLoading(false);
            setResults([]);
        })
    }, [reload])

    if (loading) {
        return (<Loader/>);
    }

    const startSyncing = () => {
        scrollToBottom();
        setBusy(true);
        setProgress(0);
        const promises = services.map(service => serviceSyncExternal(service.id));
        const allResults = [];
        serial(promises, (task, index) => {
            task.then(res => {
                const newProgress = Math.ceil((100 / services.length) * (index + 1));
                if (newProgress > progress) {
                    setProgress(newProgress);
                }
                allResults.push(res)
                if (index === services.length - 1) {
                    setBusy(false);
                    setResults(allResults);
                    setTimeout(() => setProgress(100), 225);
                }
            });
        })
    }

    const serviceClassName = service => {
        const processed = results.find(res => res.id === service.id);
        return processed ? (processed.export_successful ? "green" : "red") : "";
    }

    return (
        <div className="mod-sync-container">
            <div className="form">
                <p>{I18n.t("system.sync.info", {
                    manageUrl: config.manage_base_url,
                    state: I18n.t(`system.sync.${config.manage_enabled ? "enabled" : "disabled"}`)
                })}</p>
                {!isEmpty(services) && <p>
                    {I18n.t("system.sync.overview")}
                </p>}
                <div className="services">
                    <ul className="grid-container">
                        {services.map((s, index) => <li key={index} className={`grid-item ${serviceClassName(s)}`}>
                            {s.name}
                        </li>)}
                    </ul>
                </div>
                {(busy || !isEmpty(results)) &&
                    <div className="processing">
                        <progress max="100" value={progress}/>
                    </div>}
                {!isEmpty(results) &&
                    <div className="results">
                        <p>{I18n.t(`system.sync.${results.some(r => !r.success) ? "faultyResults" : "results"}`)}</p>
                    </div>}
                <div className="buttons-container">
                    <Button txt={I18n.t("system.sync.start")}
                            onClick={() => startSyncing()}
                            small={true}
                            disabled={loading || busy || !isEmpty(results)}
                    />
                    <Button txt={I18n.t("system.sync.reload")}
                            onClick={() => setReload(!reload)}
                            small={true}
                    />
                </div>

            </div>
        </div>);
}

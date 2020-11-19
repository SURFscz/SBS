import React from "react";
import I18n from "i18n-js";
import "./History.scss";
import {DiffPatcher} from "jsondiffpatch";
import "jsondiffpatch/dist/formatters-styles/html.css";
import moment from "moment";
import {escapeDeep, isEmpty} from "../utils/Utils";
import {auditLogsInfo, auditLogsMe} from "../api";
import {AppStore} from "../stores/AppStore";
import {getParameterByName} from "../utils/QueryParameters";
import UnitHeader from "./redesign/UnitHeader";

const ignoreInDiff = ["created_by", "updated_by", "created_at", "updated_at"];
const epochAttributes = ["agreed_at", "sent_at", "last_accessed_date", "last_login_date", "expiry_date"]
const collectionMapping = {
    organisation_id: "organisations",
    collaboration_id: "collaborations",
    user_id: "users"
};


export default class History extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selected: null,
            auditLogs: {audit_logs: []}
        };
        this.differ = new DiffPatcher();
    }

    componentDidMount = () => {
        const {collection, id} = this.props.match.params;
        const promise = collection === "me" ? auditLogsMe() : auditLogsInfo(id, collection);
        promise.then(res => {
            const selected = this.convertReference(res, res.audit_logs[0]);
            this.setState({auditLogs: res, selected: selected});
            const name = getParameterByName("name", window.location.search);
            const back = getParameterByName("back", window.location.search);
            AppStore.update(s => {
                const paths = s.breadcrumb.paths.slice(0, s.breadcrumb.paths.length - 1);
                s.breadcrumb.paths = paths.concat([
                    {path: decodeURIComponent(back), value: name},
                    {value: I18n.t("breadcrumb.history")}
                ]);
            });

        });

    }

    convertReference = (auditLogs, auditLog) => {
        if (auditLog) {
            auditLog.stateBefore = JSON.parse(auditLog.state_before || "{}");
            auditLog.stateAfter = JSON.parse(auditLog.state_after || "{}");
            [auditLog.stateBefore, auditLog.stateAfter].forEach(state => {
                escapeDeep(state);
                ignoreInDiff.forEach(ignore => delete state[ignore]);
            });
            Object.keys(auditLog).forEach(key => {
                this.addReference(auditLogs, auditLog, key);
            });
        }
        return auditLog;
    };

    addReference = (auditLogs, auditLog, key) => {
        if (collectionMapping[key]) {
            const references = auditLogs[collectionMapping[key]];
            if (references) {
                const reference = references.find(ref => ref.id === auditLog[key]);
                if (reference) {
                    auditLog[key.replace(/_id/, "")] = reference;
                }
            }
        }
    };

    convertReferences = auditLogs => {
        const auditLogRecords = auditLogs.audit_logs;
        return auditLogRecords.map(auditLog => this.convertReference(auditLogs, auditLog));
    };


    renderAuditLogs = (auditLogs, selected) => {
        if (isEmpty(auditLogs)) {
            return <p className="none">{I18n.t("history.none")}</p>
        }
        return (
            <ul className="logs">
                {auditLogs.map(log =>
                    <li key={log.id} onClick={() => this.setState({selected: log})}
                        className={`${log.id === selected.id ? "selected" : ""}`}>
                        {I18n.t("history.overview", {
                            action: I18n.t(`history.actions.${log.action}`),
                            collection: I18n.t(`history.tables.${log.target_type}`),
                            date: moment(log.created_at * 1000).format("LLL"),
                            user: (log.user || {name: "Unknown"}).name
                        })}
                        {}
                    </li>)}
            </ul>
        );
    };

    auditLogReference = (value, key, auditLogs) => {
        const auditLogReferences = {
            "organisation_id": "organisations",
            "collaboration_id": "collaborations",
            "user_id": "users"
        };
        if (auditLogReferences[key]) {
            const refs = auditLogs[auditLogReferences[key]] || [];
            const reference = refs.find(ref => ref.id === value);
            if (reference) {
                return `${value} - name: ${reference.name}`;
            }
        }
        return (epochAttributes.indexOf(key) > -1 && !isEmpty(value)) ? new Date(value * 1000).toISOString() : value;
    };

    getAuditLogValue = (auditLog, values, isOldValue, key, auditLogs) => {
        let result = "";
        if (auditLog.action === 1) {
            //create
            result = isOldValue ? "" : this.auditLogReference(values[0], key, auditLogs);
        } else if (auditLog.action === 2) {
            //update
            result = isOldValue ? this.auditLogReference(values[0], key, auditLogs) : this.auditLogReference(values[1], key, auditLogs);
        } else if (auditLog.action === 3) {
            //delete
            result = isOldValue ? this.auditLogReference(values[0], key, auditLogs) : "";
        }
        return (isEmpty(result)) ? "" : result.toString();
    };

    renderDetail = (auditLog, auditLogs) => {
        if (isEmpty(auditLog)) {
            return null;
        }
        const parent = (auditLogs[auditLog.parent_name] || []).find(parent => parent.id === auditLog.parent_id);
        const parentName = parent ? parent.name : null;
        const beforeState = auditLog.stateBefore;
        const afterState = auditLog.stateAfter;

        const delta = this.differ.diff(beforeState, afterState) || {};
        return (
            <div className="details">
                {(auditLog.parent_name && [1, 3].includes(auditLog.action)) &&
                <p className="info">{I18n.t(auditLog.action === 1 ? "history.parentNew" : "history.parentDeleted", {
                    collection: I18n.t(`history.tables.${auditLog.target_type}`),
                    parent: I18n.t(`history.tables.${auditLog.parent_name}`)
                })}{parentName && <span className="parent"> {parentName}</span>}</p>}
                {(auditLog.parent_name && auditLog.action === 2) &&
                <p className="info">{I18n.t("history.parentUpdated", {
                    collection: I18n.t(`history.tables.${auditLog.target_type}`),
                    parent: I18n.t(`history.tables.${auditLog.parent_name}`)
                })}</p>}

                <table className="changes" cellSpacing="0">
                    <thead>
                    <tr>
                        <th className="key">{I18n.t("history.key")}</th>
                        {auditLog.action !== 1 && <th className="old-value">{I18n.t("history.oldValue")}</th>}
                        {auditLog.action !== 3 && <th className="new-value">{I18n.t("history.newValue")}</th>}
                    </tr>
                    </thead>
                    <tbody>
                    {Object.keys(delta).map(key => <tr key={key}>
                        <td>{key}</td>
                        {auditLog.action !== 1 &&
                        <td>{this.getAuditLogValue(auditLog, delta[key], true, key, auditLogs)}</td>}
                        {auditLog.action !== 3 &&
                        <td>{this.getAuditLogValue(auditLog, delta[key], false, key, auditLogs)}</td>}
                    </tr>)}
                    </tbody>
                </table>

            </div>
        );
    };

    render() {
        const {auditLogs, selected} = this.state;
        const auditLogEntries = this.convertReferences(auditLogs);
        return (
            <div className={`history-container`}>
                <UnitHeader obj={({name: I18n.t("home.history"), icon: "history"})}/>
                <div className={`history`}>
                    {this.renderAuditLogs(auditLogEntries, selected)}
                    {this.renderDetail(selected, auditLogs)}
                </div>
            </div>);
    }

}
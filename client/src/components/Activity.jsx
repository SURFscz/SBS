import React from "react";
import I18n from "../locale/I18n";
import "./Activity.scss";
import {DiffPatcher} from "jsondiffpatch";
import "jsondiffpatch/dist/formatters-styles/html.css";
import {escapeDeep, isEmpty} from "../utils/Utils";
import {pseudoIso} from "../utils/Date";
import {Pagination} from "@surfnet/sds";

const pageCount = 15;
const ignoreInDiff = ["created_by", "updated_by", "created_at", "updated_at"];
const epochAttributes = ["agreed_at", "sent_at", "last_accessed_date", "last_login_date", "expiry_date"]
const collectionMapping = {
    organisation_id: "organisations", collaboration_id: "collaborations", user_id: "users"
};


export default class Activity extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selected: {},
            page: 1
        };
        this.differ = new DiffPatcher();
    }

    componentDidMount = () => {
        const {auditLogs} = this.props;
        const selected = this.convertReference(auditLogs, auditLogs.audit_logs[0]);
        this.setState({
            selected: selected,
        });
    }

    componentDidUpdate() {
        const {selected} = this.state;
        const {auditLogs} = this.props;
        const filteredOut = !isEmpty(selected) && !auditLogs.audit_logs.some(log => log.id === selected.id);
        if (filteredOut || isEmpty(selected)) {
            this.setState({
                selected: this.convertReference(auditLogs, auditLogs.audit_logs[0]),
            });
        }
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

    userLabel = user => {
        return !user ? "Unknown" : `${user.email} (${user.username})`
    }

    renderAuditLogs = (auditLogs, selected, page) => {
        const minimalPage = Math.min(page, Math.ceil(auditLogs.length / pageCount));
        const total = auditLogs.length;
        auditLogs = auditLogs.slice((minimalPage - 1) * pageCount, minimalPage * pageCount);
        if (isEmpty(auditLogs)) {
            return <p className="none">{I18n.t("history.none")}</p>
        }
        return (
            <div className="sds--table">
                <table className="logs">
                    <thead>
                    <tr>
                        <th className={"date"}>{I18n.t("system.activityTable.date")}</th>
                        <th className={"user"}>{I18n.t("system.activityTable.user")}</th>
                        <th className={"action"}>{I18n.t("system.activityTable.action")}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {auditLogs.map(log =>
                        <tr key={log.id} onClick={() => this.setState({selected: log})}
                            className={`${selected && log.id === selected.id ? "selected" : ""}`}>
                            <td>{pseudoIso(log.created_at)}</td>
                            <td>{this.userLabel(log.user)}</td>
                            <td>
                                {I18n.t("history.overview", {
                                    action: I18n.t(`history.actions.${log.action}`),
                                    name: log.target_name ? ` ${log.target_name}` : " ",
                                    collection: I18n.t(`history.tables.${log.target_type}`)
                                })}
                            </td>
                        </tr>)}
                    </tbody>
                </table>
                <Pagination currentPage={page}
                            onChange={nbr => this.setState({page: nbr})}
                            total={total}
                            pageCount={pageCount}/>
            </div>);
    };

    auditLogReference = (value, key, auditLogs) => {
        const auditLogReferences = {
            "organisation_id": "organisations",
            "collaboration_id": "collaborations",
            "user_id": "users",
            "service_id": "services"
        };
        if (auditLogReferences[key]) {
            const refs = auditLogs[auditLogReferences[key]] || [];
            const reference = refs.find(ref => ref.id === value);
            if (reference) {
                const name = reference.email && reference.username ? `${reference.email} (${reference.username})` : reference.name;
                return `${value} - name: ${name}`;
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
                    })}{parentName && <span className="parent"> {parentName}</span>}</p>}
                <div className="sds--table">
                    <table className="changes" cellSpacing="0">
                        <thead>
                        <tr>
                            <th className="key">{I18n.t("history.key")}</th>
                            {auditLog.action !== 1 && <th className="old-value">{I18n.t("history.oldValue")}</th>}
                            {auditLog.action !== 3 && <th className="new-value">{I18n.t("history.newValue")}</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {Object.keys(delta).map(key =>
                            <tr key={key}>
                                <td>{key.replaceAll("_", " ")}</td>
                                {auditLog.action !== 1 &&
                                    <td>{this.getAuditLogValue(auditLog, delta[key], true, key, auditLogs)}</td>}
                                {auditLog.action !== 3 &&
                                    <td>{this.getAuditLogValue(auditLog, delta[key], false, key, auditLogs)}</td>}
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </div>);
    };

    render() {
        const {auditLogs} = this.props;
        const {selected, page} = this.state;
        const auditLogEntries = this.convertReferences(auditLogs);
        return (<div className={`activity-container`}>
            <div className={`activity`}>
                {this.renderAuditLogs(auditLogEntries, selected, page)}
                {this.renderDetail(selected, auditLogs)}
            </div>
        </div>);
    }

}
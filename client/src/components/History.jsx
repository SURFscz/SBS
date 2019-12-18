import React from "react";
import I18n from "i18n-js";
import "./History.scss";
import {DiffPatcher} from "jsondiffpatch";
import "jsondiffpatch/dist/formatters-styles/html.css";
import moment from "moment";
import {escapeDeep, isEmpty} from "../utils/Utils";

const ignoreInDiff = ["created_by", "updated_by", "created_at", "updated_at"];

export default class History extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selected: this.props.auditLogs.audit_logs[0]
        };
        this.differ = new DiffPatcher();
    }


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
                            date: moment(log.created_at * 1000).format("LLLL"),
                            collection: log.target_type
                        })}
                        {}
                    </li>)}
            </ul>
        );
    };

    getAuditLogValue = (auditLog, values, oldValue) => {
        if (auditLog.action === 1) {
            //create
            return oldValue ? "" : values[0]
        }
        if (auditLog.action === 2) {
            //update
            return oldValue ? values[0] : values[1];
        }
        if (auditLog.action === 3) {
            //delete
            return oldValue ? values[0] : "";
        }
    };

    renderDetail = auditLog => {
        if (isEmpty(auditLog)) {
            return null;
        }
        const beforeState = JSON.parse(auditLog.state_before || "{}");
        const afterState = JSON.parse(auditLog.state_after || "{}");

        [beforeState, afterState].forEach(state => {
            escapeDeep(state);
            ignoreInDiff.forEach(ignore => delete state[ignore]);
        });
        const delta = this.differ.diff(beforeState, afterState);
        return (
            <div className="details">
                <table className="changes" cellSpacing="0">
                    <thead>
                    <tr>
                        <th className="key">{I18n.t("history.key")}</th>
                        <th className="old-value">{I18n.t("history.oldValue")}</th>
                        <th className="new-value">{I18n.t("history.newValue")}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {Object.keys(delta).map(key => <tr key={key}>
                        <td>{key}</td>
                        <td>{this.getAuditLogValue(auditLog, delta[key], true)}</td>
                        <td>{this.getAuditLogValue(auditLog, delta[key], false)}</td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        );
    };

    render() {
        const {auditLogs} = this.props;
        //TODO - there are also references to other objects
        const auditLogEntries = auditLogs.audit_logs;
        const {selected} = this.state;
        return (
            <div className="history-container">
                <div className="history">
                    {this.renderAuditLogs(auditLogEntries, selected)}
                    {this.renderDetail(selected)}
                </div>
            </div>);
    }

}
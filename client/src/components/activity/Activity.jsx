import React from "react";
import I18n from "../../locale/I18n";
import "./Activity.scss";
import {DiffPatcher} from "jsondiffpatch";
import "jsondiffpatch/dist/formatters-styles/html.css";
import {escapeDeep, isEmpty} from "../../utils/Utils";
import {pseudoIso} from "../../utils/Date";
import {Pagination} from "@surfnet/sds";
import Button from "../button/Button";
import {filterAuditLogs} from "../../utils/AuditLog";
import {ReactComponent as SearchIcon} from "@surfnet/sds/icons/functional-icons/search.svg";
import CheckBox from "../checkbox/CheckBox";

const pageCount = 50;
const ignoreInDiff = ["created_by", "updated_by", "created_at", "updated_at", "last_activity_date"];
const epochAttributes = ["agreed_at", "sent_at", "last_accessed_date", "last_login_date", "expiry_date"];
const collectionMapping = {
    organisation_id: "organisations", collaboration_id: "collaborations", user_id: "users"
};


export default class Activity extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selected: null,
            page: 1,
            query: "",
            includeProperties: true,
            includeMembers: true,
            includeServices: true,
            includeConnections: true
        };
        this.differ = new DiffPatcher();
    }

    componentDidMount = () => {
        const {auditLogs, user, collectionName} = this.props;
        const isService = collectionName === "services";
        auditLogs.audit_logs = this.convertReferences(auditLogs);
        if (!user.admin && collectionName === "collaborations") {
            auditLogs.audit_logs = auditLogs.audit_logs.filter(log => {
                if (!isEmpty(log.state_after)) {
                    const stateAfter = JSON.parse(log.state_after);
                    return !(Object.keys(stateAfter).length === 1 && stateAfter.last_activity_date);
                }
                return true;
            });
        }
        const includeMembersTargets = [
            "collaboration_memberships",
            "collaboration_memberships_groups",
            "invitations",
            "service_memberships",
            "service_invitations",
            "organisation_memberships",
            "organisation_invitations",
            "join_requests"]
        const includeServicesTargets = [];
        const includeConnectionsTargets = ["service_connection_requests"]
        const includePropertiesTargets = [
            "collaborations",
            "groups",
            "tags",
            "organisations",
            "api_keys",
            "service_groups",
            "ssh_keys"];
        if (isService) {
            includePropertiesTargets.push("services");
        } else {
            ["services", "service_connection_requests"].forEach(name => includeServicesTargets.push(name));
        }
        auditLogs.audit_logs.forEach(log => {
            if (log.target_type) {
                if (log.target_type === "services" && log.parent_name === "collaborations") {
                    log.isConnection = isService;
                    log.isService = !isService;
                } else {
                    log.isService = includeServicesTargets.includes(log.target_type);
                    log.isMember = includeMembersTargets.includes(log.target_type);
                    log.isProperty = includePropertiesTargets.includes(log.target_type);
                    log.isConnection = includeConnectionsTargets.includes(log.target_type);
                }
            }
        });
        this.setState({
            selected: auditLogs.audit_logs[0],
            includeConnections: isService,
            includeServices: !isService
        });
    }

    parseJSON = state => {
        if (isEmpty(state)) {
            return {};
        }
        try {
            return JSON.parse(state);
        } catch (e) {
            return {};
        }
    }

    convertReference = (auditLogs, auditLog) => {
        if (auditLog) {
            auditLog.stateBefore = this.parseJSON(auditLog.state_before);
            auditLog.stateAfter = this.parseJSON(auditLog.state_after);
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

    userLabel = log => {
        const user = log.user;
        return user ? `${user.email} (${user.username})` : (log.user_type || "Unknown");
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
                        <tr key={log.id}
                            onClick={() =>
                                this.setState({selected: log})
                            }
                            className={`${selected && log.id === selected.id ? "selected" : ""}`}>
                            <td>{pseudoIso(log.created_at)}</td>
                            <td>{this.userLabel(log)}</td>
                            <td>{this.getSummaryTitle(log)}</td>
                        </tr>)}
                    </tbody>
                </table>
                <Pagination currentPage={page}
                            onChange={nbr => this.setState({page: nbr})}
                            total={total}
                            pageCount={pageCount}/>
            </div>);
    };

    getSummaryTitle = log => {
        const targetType = this.getTargetType(log);
        let action = I18n.t(`history.actions.${log.action}`);
        if (targetType === "service_connection_requests" && log.action === 2) {
            const status = JSON.parse(log.state_after).status
            action = I18n.t(`history.actions.${status || log.action}`)
        }
        return I18n.t("history.overview", {
            action: action,
            name: log.target_name ? ` ${log.target_name}` : " ",
            collection: I18n.t(`history.tables.${targetType}`)
        });
    }

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
        const parent = (auditLogs[auditLog.parent_name] || []).find(parent => parent.id === auditLog.parent_id);
        const parentName = parent ? parent.name : null;
        const beforeState = auditLog.stateBefore;
        const afterState = auditLog.stateAfter;

        const delta = this.differ.diff(beforeState, afterState) || {};
        const targetType = this.getTargetType(auditLog);

        return (
            <div className="details">
                {(auditLog.parent_name && [1, 3].includes(auditLog.action)) &&
                    <p className="info">{I18n.t(auditLog.action === 1 ? "history.parentNew" : "history.parentDeleted", {
                        collection: I18n.t(`history.tables.${targetType}`),
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

    getTargetType = auditLog => {
        let targetType = auditLog.target_type;
        if (auditLog.parent_name === "groups" && targetType === "collaboration_memberships") {
            targetType = "collaboration_memberships_groups";
        }
        return targetType;
    }

    exportData = auditLogEntries => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(auditLogEntries)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "history.json";
        link.click();
    };

    excludeAuditLogs = (auditLogs, includeServices, includeMembers, includeProperties, includeConnections) => {
        return auditLogs.filter(log =>
            (includeServices || !log.isService) &&
            (includeMembers || !log.isMember) &&
            (includeConnections || !log.isConnection) &&
            (includeProperties || !log.isProperty)
        )
    }

    render() {
        const {auditLogs, collectionName} = this.props;
        const isService = collectionName === "services";
        const isSystemView = collectionName === "all";
        const {
            selected,
            page,
            query,
            includeServices,
            includeMembers,
            includeProperties,
            includeConnections
        } = this.state;
        const filteredAuditLogs = filterAuditLogs(auditLogs, query);
        const auditLogEntries = this.excludeAuditLogs(filteredAuditLogs.audit_logs, includeServices, includeMembers, includeProperties, includeConnections);
        return (
            <div className="activity-container">
                {!isSystemView && <div className="action-container">
                    <div className="filter-options">
                        <CheckBox name="includeProperties"
                                  value={includeProperties}
                                  info={I18n.t("history.includeProperties")}
                                  onChange={e => this.setState({
                                      includeProperties: e.target.checked,
                                      selected: null
                                  })}
                        />
                        <CheckBox name="includeMembers"
                                  value={includeMembers}
                                  info={I18n.t("history.includeMembers")}
                                  onChange={e => this.setState({
                                      includeMembers: e.target.checked,
                                      selected: null
                                  })}
                        />
                        {!isService && <CheckBox name="includeServices"
                                                 value={includeServices}
                                                 info={I18n.t("history.includeServices")}
                                                 onChange={e => this.setState({
                                                     includeServices: e.target.checked,
                                                     selected: null
                                                 })}
                        />}
                        {isService && <CheckBox name="includeConnections"
                                                value={includeConnections}
                                                info={I18n.t("history.includeConnections")}
                                                onChange={e => this.setState({
                                                    includeConnections: e.target.checked,
                                                    selected: null
                                                })}
                        />}
                    </div>
                    <div className="search">
                        <div className={"sds--text-field sds--text-field--has-icon"}>
                            <div className="sds--text-field--shape">
                                <div className="sds--text-field--input-and-icon">
                                    <input className={"sds--text-field--input"}
                                           type="search"
                                           onChange={e =>
                                               this.setState({
                                                   query: e.target.value,
                                                   selected: null
                                               })}
                                           value={query}
                                           placeholder={I18n.t("history.searchPlaceholder")}/>
                                    <span className="sds--text-field--icon">
                                    <SearchIcon/>
                                </span>
                                </div>
                            </div>
                        </div>
                        <Button txt={I18n.t("history.export")}
                                onClick={() => this.exportData(auditLogEntries)}
                        />
                    </div>

                </div>}
                <div className="activity">
                    {this.renderAuditLogs(auditLogEntries, selected, page)}
                    {(!isEmpty(auditLogEntries) && !isEmpty(selected)) &&
                        this.renderDetail(selected, auditLogs)}
                </div>
            </div>);
    }

}

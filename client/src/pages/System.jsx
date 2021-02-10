import React from "react";
import "./System.scss";
import I18n from "i18n-js";
import {auditLogsActivity, clearAuditLogs, dbSeed, dbStats, health, outstandingRequests, suspendUsers} from "../api";
import Button from "../components/Button";
import {isEmpty} from "../utils/Utils";
import UnitHeader from "../components/redesign/UnitHeader";
import ConfirmationDialog from "../components/ConfirmationDialog";
import SpinnerField from "../components/redesign/SpinnerField";
import {AppStore} from "../stores/AppStore";
import Tabs from "../components/Tabs";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Activity from "../components/Activity";
import Select from "react-select";
import MemberJoinRequests from "../components/redesign/MemberJoinRequests";
import MemberCollaborationRequests from "../components/redesign/MemberCollaborationRequests";

const options = [25, 50, 100].map(nbr => ({value: nbr, label: nbr}));

class System extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            tab: "cron",
            suspendedUsers: {},
            outstandingRequests: {},
            databaseStats: [],
            seedResult: null,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            busy: false,
            auditLogs: {audit_logs: []},
            filteredAuditLogs: {audit_logs: []},
            limit: options[1],
            query: ""
        }
    }

    componentDidMount = () => {
        health().then(() => {
            const params = this.props.match.params;
            const tab = params.tab || this.state.tab;
            this.tabChanged(tab);
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {value: I18n.t("breadcrumb.system")}
                ];
            });

        })
    };

    clear = () => {
        this.setState({
            suspendedUsers: {},
            outstandingRequests: {},
            databaseStats: [],
            seedResult: null,
            query: "",
            auditLogs: {audit_logs: []},
            filteredAuditLogs: {audit_logs: []},
            limit: options[1],
        });
    }

    reload = () => {
        // eslint-disable-next-line
        window.location.href = window.location.href;
    }

    getCronTab = (suspendedUsers, outstandingRequests) => {
        return (<div key="cron" name="cron" label={I18n.t("home.tabs.cron")}
                     icon={<FontAwesomeIcon icon="clock"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDailyCron()}
                    {this.renderDailyCronResults(suspendedUsers)}
                    {this.renderOutstandingRequests()}
                    {this.renderOutstandingRequestsResults(outstandingRequests)}
                </section>
            </div>
        </div>)
    }

    changeLimit = val => {
        this.setState({limit: val, busy: true}, () => {
            auditLogsActivity(val.value).then(res => {
                this.setState({
                    auditLogs: res,
                    filteredAuditLogs: this.filterAuditLogs(res, this.state.query),
                    busy: false
                });
            });
        });
    }

    filterAuditLogs = (auditLogs, query) => {
        if (isEmpty(query)) {
            return auditLogs;
        }
        const lowerQuery = query.toLowerCase();
        const sub = [...auditLogs.audit_logs].filter(a => {
            let matchesParent = false;
            let matchesUser = false;
            let matchesName = false
            if (a.parent_name && auditLogs[a.parent_name]) {
                const parent = auditLogs[a.parent_name].find(obj => obj.id === a.parent_id);
                if (parent && parent.name) {
                    matchesParent = parent.name.toLowerCase().indexOf(lowerQuery) > -1;
                }
            }
            if (a.subject_id && auditLogs.users) {
                const subject = auditLogs.users.find(user => user.id === a.subject_id);
                if (subject && subject.name) {
                    matchesUser = subject.name.toLowerCase().indexOf(lowerQuery) > -1;
                }
            }
            if (a.target_name) {
                matchesName = a.target_name.toLowerCase().indexOf(lowerQuery) > -1;
            }
            return matchesParent || matchesUser || matchesName;
        });
        return {...auditLogs, audit_logs: sub};
    }

    getActivityTab = (filteredAuditLogs, limit, query, config) => {
        return (
            <div key="activity" name="activity" label={I18n.t("home.tabs.activity")}
                 icon={<FontAwesomeIcon icon="code-branch"/>}>
                <div className="mod-system">
                    <section className={"info-block-container"}>
                        <section className="search-activity">
                            <p>{I18n.t("system.activity")}</p>
                            {config.seed_allowed &&
                            <Button warningButton={true} onClick={() => this.doClearAuditLogs(true)}/>}
                            <div className={`search ${config.seed_allowed ? "" : "no-clear-logs"}`}>
                                <input type="text"
                                       onChange={this.onChangeQuery}
                                       value={query}
                                       placeholder={I18n.t("system.searchPlaceholder")}/>
                                <FontAwesomeIcon icon="search"/>
                            </div>
                            <Select
                                className="input-select-inner"
                                classNamePrefix="select-inner"
                                value={limit}
                                placeholder={I18n.t("system.searchPlaceholder")}
                                onChange={this.changeLimit}
                                options={options}
                                isSearchable={false}
                                isClearable={false}
                            />
                        </section>
                        <Activity auditLogs={filteredAuditLogs}/>
                    </section>
                </div>
            </div>)
    }

    onChangeQuery = e => {
        const query = e.target.value;
        const {auditLogs} = this.state;
        const filteredAuditLogs = this.filterAuditLogs(auditLogs, query);
        this.setState({
            filteredAuditLogs: filteredAuditLogs,
            query: query
        });
    }

    getDatabaseTab = databaseStats => {
        return (<div key="database" name="database" label={I18n.t("home.tabs.database")}
                     icon={<FontAwesomeIcon icon="database"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDbStats()}
                    {this.renderDbStatsResults(databaseStats)}
                </section>
            </div>
        </div>)
    }

    getSeedTab = seedResult => {
        return (<div key="seed" name="seed" label={I18n.t("home.tabs.seed")}
                     icon={<FontAwesomeIcon icon="seedling"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDbSeed()}
                    <p className="result">{seedResult}</p>
                </section>
            </div>
        </div>)
    }

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    doSuspendUsers = () => {
        this.setState({busy: true})
        suspendUsers().then(res => {
            this.setState({suspendedUsers: res, busy: false});
        });
    }

    doOutstandingRequests = () => {
        this.setState({busy: true})
        outstandingRequests().then(res => {
            // debugger;
            this.setState({outstandingRequests: res, busy: false});
        });
    }

    doClearAuditLogs = showConfirmation => {
        if (showConfirmation) {
            this.confirm(() => this.doClearAuditLogs(false), I18n.t("system.runClearAuditLogsConfirmation"));
        } else {
            this.setState({confirmationDialogOpen: false, busy: true,});
            clearAuditLogs().then(() => this.setState({
                auditLogs: {audit_logs: []},
                filteredAuditLogs: {audit_logs: []},
                busy: false
            }));
        }

    }

    doDbSeed = showConfirmation => {
        if (showConfirmation) {
            this.confirm(() => this.doDbSeed(false), I18n.t("system.runDbSeedConfirmation"));
        } else {
            this.setState({confirmationDialogOpen: false, busy: true,});
            const d = new Date();
            dbSeed().then(() => {
                this.setState({
                    busy: false,
                    seedResult: I18n.t("system.seedResult", {ms: new Date().getMilliseconds() - d.getMilliseconds()})
                });
            });
        }
    }

    renderDailyCron = () => {
        const {suspendedUsers} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runDailyJobsInfo")}</p>
                <div className="actions">
                    {isEmpty(suspendedUsers) && <Button txt={I18n.t("system.runDailyJobs")}
                                                        onClick={this.doSuspendUsers}/>}
                    {!isEmpty(suspendedUsers) && <Button txt={I18n.t("system.clear")}
                                                         onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderOutstandingRequests = () => {
        const {outstandingRequests} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runOutdatedRequestsInfo")}</p>
                <div className="actions">
                    {isEmpty(outstandingRequests) && <Button txt={I18n.t("system.runOutdatedRequests")}
                                                             onClick={this.doOutstandingRequests}/>}
                    {!isEmpty(outstandingRequests) && <Button txt={I18n.t("system.clear")}
                                                              onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderDbStats = () => {
        return (
            <div className="info-block">
                <p>{I18n.t("system.runDbStatsInfo")}</p>
            </div>
        );
    }

    renderDbSeed = () => {
        const {seedResult} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runDbSeedInfo")}</p>
                <div className="actions">
                    {isEmpty(seedResult) && <Button txt={I18n.t("system.runDbSeed")}
                                                    onClick={() => this.doDbSeed(true)}/>}
                    {!isEmpty(seedResult) && <Button txt={I18n.t("system.reload")}
                                                     onClick={this.reload} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderDailyCronResults = suspendedUsers => {
        return (
            <div className="results">
                {!isEmpty(suspendedUsers) && <div className="results">
                    <table className="suspended-users">
                        <thead>
                        <th>{I18n.t("system.action")}</th>
                        <th>{I18n.t("system.results")}</th>
                        </thead>
                        <tbody>
                        {Object.keys(suspendedUsers).map(key =>
                            <tr key={key}>
                                <td className="action">{I18n.t(`system.${key}`)}</td>
                                <td>
                                    {!isEmpty(suspendedUsers[key]) && <ul>
                                        {suspendedUsers[key].map(email => <li>{email}</li>)}
                                    </ul>}
                                    {isEmpty(suspendedUsers[key]) && <span>None</span>}
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>}
            </div>)
    }

    renderOutstandingRequestsResults = outstandingRequests => {
        const collaboration_requests = outstandingRequests.collaboration_requests;
        const join_requests = outstandingRequests.collaboration_join_requests;
        return (
            <div className="results">
                {!isEmpty(outstandingRequests) && <div className="results">
                    <MemberJoinRequests join_requests={join_requests} isPersonal={false} {...this.props} />
                    <MemberCollaborationRequests {...this.props} isPersonal={false} collaboration_requests={collaboration_requests}/>
                </div>}
            </div>
        )
    }

    renderDbStatsResults = databaseStats => {
        return (
            <div className="results">
                {!isEmpty(databaseStats) && <div className="results">
                    <table className="table-counts">
                        <thead>
                        <tr>
                            <th>{I18n.t("system.name")}</th>
                            <th>{I18n.t("system.count")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {databaseStats.map((stat, i) => <tr key={i}>
                            <td>{stat.name}</td>
                            <td>{stat.count}</td>
                        </tr>)}
                        </tbody>
                    </table>
                </div>}</div>)
    }

    tabChanged = name => {
        this.clear();
        this.setState({tab: name, busy: true}, () => {
            this.props.history.replace(`/system/${name}`);
        });
        if (name === "database") {
            dbStats().then(res => {
                this.setState({databaseStats: res, busy: false});
            });
        } else if (name === "activity") {
            const {limit} = this.state;
            auditLogsActivity(limit.value).then(res => {
                this.setState({
                    auditLogs: res,
                    filteredAuditLogs: this.filterAuditLogs(res, this.state.query),
                    busy: false
                });
            });
        } else {
            this.setState({busy: false});
        }
    }

    render() {
        const {admin} = this.props.user;
        if (!admin) {
            return null;
        }
        const {
            seedResult, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, outstandingRequests,
            confirmationDialogQuestion, busy, tab, filteredAuditLogs, databaseStats, suspendedUsers,
            limit, query
        } = this.state;
        const {config} = this.props;

        if (busy) {
            return <SpinnerField/>
        }
        const tabs = [
            this.getCronTab(suspendedUsers, outstandingRequests),
            config.seed_allowed ? this.getSeedTab(seedResult) : null,
            this.getDatabaseTab(databaseStats),
            this.getActivityTab(filteredAuditLogs, limit, query, config)
        ]
        return (
            <div className="mod-system-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>
                <UnitHeader obj={({name: I18n.t("system.title"), icon: "toolbox"})}/>

                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>


            </div>);
    }
}

export default System;
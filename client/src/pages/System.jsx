import React from "react";
import "./System.scss";
import I18n from "i18n-js";
import {auditLogsActivity, dbSeed, dbStats, health, suspendUsers} from "../api";
import Button from "../components/Button";
import {isEmpty} from "../utils/Utils";
import UnitHeader from "../components/redesign/UnitHeader";
import ConfirmationDialog from "../components/ConfirmationDialog";
import SpinnerField from "../components/redesign/SpinnerField";
import {AppStore} from "../stores/AppStore";
import Tabs from "../components/Tabs";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Activity from "../components/Activity";

class System extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            tab: "cron",
            suspendedUsers: {},
            databaseStats: [],
            seedResult: null,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            busy: false,
            auditLogs: {audit_logs: []},
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
                    {path: "/system", value: I18n.t("breadcrumb.system")},
                    {value: I18n.t(`home.tabs.${tab}`)}
                ];
            });
        })
    };

    clear = () => {
        this.setState({
            suspendedUsers: {},
            databaseStats: [],
            seedResult: null,
            activity: [],
        });
    }

    reload = () => {
        window.location.href = window.location.href;
    }

    getCronTab = suspendedUsers => {
        return (<div key="cron" name="cron" label={I18n.t("home.tabs.cron")}
                     icon={<FontAwesomeIcon icon="clock"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDailyCron()}
                    {this.renderDailyCronResults(suspendedUsers)}
                </section>
            </div>
        </div>)
    }

    getActivityTab = auditLogs => {
        return (<div key="activity" name="activity" label={I18n.t("home.tabs.activity")}
                     icon={<FontAwesomeIcon icon="code-branch"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    <Activity auditLogs={auditLogs}/>
                </section>
            </div>
        </div>)
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

    getSeedTab = (config, seedResult) => {
        return (<div key="seed" name="seed" label={I18n.t("home.tabs.seed")}
                     icon={<FontAwesomeIcon icon="seedling"/>}>
            <div className="mod-system">
                {config.seed_allowed && <section className={"info-block-container"}>
                    {this.renderDbSeed()}
                    <p className="result">{seedResult}</p>
                </section>}
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

    tabChanged = (name) => {
        this.clear();
        this.setState({tab: name, busy: true}, () =>
            this.props.history.replace(`/system/${name}`));
        if (name === "database") {
            dbStats().then(res => {
                this.setState({databaseStats: res, busy: false});
            });
        } else if (name === "activity") {
            auditLogsActivity().then(res => {
                this.setState({auditLogs: res, busy: false});
            })
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
            seedResult, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
            confirmationDialogQuestion, busy, tab, auditLogs, databaseStats, suspendedUsers
        } = this.state;
        const {config} = this.props;

        if (busy) {
            return <SpinnerField/>
        }
        const tabs = [
            this.getCronTab(suspendedUsers),
            this.getSeedTab(config, seedResult),
            this.getDatabaseTab(databaseStats),
            this.getActivityTab(auditLogs)
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
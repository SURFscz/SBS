import React from "react";
import "./System.scss";
import I18n from "i18n-js";
import {dbSeed, dbStats, health, suspendUsers} from "../api";
import Button from "../components/Button";
import {isEmpty} from "../utils/Utils";
import UnitHeader from "../components/redesign/UnitHeader";
import ConfirmationDialog from "../components/ConfirmationDialog";
import SpinnerField from "../components/redesign/SpinnerField";
import {AppStore} from "../stores/AppStore";

class System extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            suspendedUsers: {},
            databaseStats: [],
            seedResult: null,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            busy: false,
        }
    }

        componentDidMount = () => {
        health().then(() => {
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {path: "", value: I18n.t("breadcrumb.system")}
                ];
            });
        })
    };

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    doSuspendUsers = () => {
        suspendUsers().then(res => {
            this.setState({suspendedUsers: res});
        });
    }

    doDbStats = () => {
        dbStats().then(res => {
            this.setState({databaseStats: res});
        });
    }

    doDbSeed = showConfirmation => {
        if (showConfirmation) {
            this.confirm(() => this.doDbSeed(false), I18n.t("system.runDbSeedConfirmation"));
        } else {
            this.setState({confirmationDialogOpen: false, busy: true, })
            dbSeed().then(() => {
                this.setState({busy: false, seedResult: I18n.t("system.seedResult")});
            });
        }
    }

    renderDailyCron = () =>
        <div className="info-block">
            <p>{I18n.t("system.runDailyJobsInfo")}</p>
            <div className="actions">
                <Button txt={I18n.t("system.runDailyJobs")}
                        onClick={this.doSuspendUsers}/>
            </div>
        </div>;


    renderDbStats = () =>
        <div className="info-block">
            <p>{I18n.t("system.runDbStatsInfo")}</p>
            <div className="actions">
                <Button txt={I18n.t("system.runDbStats")}
                        onClick={this.doDbStats}/>
            </div>
        </div>;

    renderDbSeed = () =>
        <div className="info-block">
            <p>{I18n.t("system.runDbSeedInfo")}</p>
            <div className="actions">
                <Button txt={I18n.t("system.runDbSeed")}
                        onClick={() => this.doDbSeed(true)}/>
            </div>
        </div>;

    renderDailyCronResults = () => {
        const {suspendedUsers} = this.state;

        return (
            <div className="results">
                {!isEmpty(suspendedUsers) && <div className="results">
                    {Object.keys(suspendedUsers).map(key =>
                        <div key={key}>
                            <p className="category">{I18n.t(`system.${key}`)}</p>
                            {!isEmpty(suspendedUsers[key]) && <ul>
                                {suspendedUsers[key].map(email => <li>{email}</li>)}
                            </ul>}
                            {isEmpty(suspendedUsers[key]) && <span>None</span>}
                        </div>)}
                </div>}
            </div>)
    }

    renderDbStatsResults = () => {
        const {databaseStats} = this.state;

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

    render() {
        const {admin} = this.props.user;
        if (!admin) {
            return null;
        }
        const {config} = this.props;
        const {
            seedResult, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
            confirmationDialogQuestion, busy
        } = this.state;
        if (busy) {
            return <SpinnerField/>
        }
        return (
            <div className="mod-system-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>

                <div className="mod-system">
                    <UnitHeader obj={({name: I18n.t("system.title"), icon: "toolbox"})}/>
                    <section className={"info-block-container"}>
                        {this.renderDailyCron()}
                        {this.renderDailyCronResults()}
                    </section>
                    <section className={"info-block-container"}>
                        {this.renderDbStats()}
                        {this.renderDbStatsResults()}
                    </section>
                    {config.seed_allowed && <section className={"info-block-container"}>
                        {this.renderDbSeed()}
                        <p className="result">{seedResult}</p>
                    </section>}
                </div>
            </div>);
    }
    ;
}

export default System;
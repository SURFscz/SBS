import React from "react";
import "./System.scss";
import I18n from "i18n-js";
import {dbStats, suspendUsers} from "../api";
import Button from "../components/Button";
import {isEmpty} from "../utils/Utils";
import UnitHeader from "../components/redesign/UnitHeader";

class System extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            suspendedUsers: {},
            databaseStats: []
        }
    }

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
        return (
            <div className="mod-system-container">
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
                </div>
            </div>);
    }
    ;
}

export default System;
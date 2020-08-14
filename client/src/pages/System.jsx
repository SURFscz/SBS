import React from "react";
import "./System.scss";
import I18n from "i18n-js";
import {suspendUsers} from "../api";
import Button from "../components/Button";
import {isEmpty} from "../utils/Utils";

class System extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            suspendedUsers: {}
        }
    }

    doSuspendUsers = () => {
        suspendUsers().then(res => {
            this.setState({suspendedUsers: res});
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


    renderDailyCronResults = () => {
        const {suspendedUsers} = this.state;
        return (
            <div className="results">
                {!isEmpty(suspendedUsers) && <div className="results">
                    <p className="sub-title">{I18n.t("system.runDailyJobsInfoResults")}</p>
                    {}
                    {Object.keys(suspendedUsers).map(key =>
                        <div key={key}>
                            <p className="category">{key}</p>
                            <ul>
                                {suspendedUsers[key].map(email => <li>{email}</li>)}
                            </ul>
                            {isEmpty(suspendedUsers[key]) && <span>None</span>}
                        </div>)}
                </div>}
            </div>)
    }

    render() {
        const {admin} = this.props.user;
        if (!admin) {
            return null;
        }
        return (
            <div className="mod-system-container">
                <div className="mod-system">
                    <div className="title top">
                        <p>{I18n.t("system.title")}</p>
                    </div>
                    <section className={"info-block-container"}>
                        {this.renderDailyCron()}
                        {this.renderDailyCronResults()}
                    </section>
                </div>
            </div>);
    }
    ;
}

export default System;
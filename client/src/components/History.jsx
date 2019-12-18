import React from "react";
import I18n from "i18n-js";
import "./History.scss";
import {DiffPatcher, formatters} from "jsondiffpatch";
import "jsondiffpatch/dist/formatters-styles/html.css";
import moment from "moment";
import {escapeDeep, isEmpty} from "../utils/Utils";

const ignoreInDiff = ["created_by", "updated_by", "created_at", "updated_at"];

export default class History extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selected: this.props.auditLogs[0]
        };
        this.differ = new DiffPatcher();
    }


    renderAuditLogs = (auditLogs, selected) => {
        if (isEmpty(auditLogs)) {
            return  <p className="none">{I18n.t("history.none")}</p>
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
    }

    renderDiff = (beforeState, afterState) => {
        beforeState = JSON.parse(beforeState);
        afterState = JSON.parse(afterState);

        [beforeState, afterState].forEach(state => {
            escapeDeep(state);
            ignoreInDiff.forEach(ignore => delete state[ignore]);
        });

        const delta = this.differ.diff(beforeState, afterState);
        const html = formatters.html.format(delta, beforeState);
        return <div className="details"><p dangerouslySetInnerHTML={{__html: html}}/></div>
    };


    renderDetail = auditLog => {
        if (isEmpty(auditLog)) {
            return null;
        }
        return this.renderDiff(auditLog.state_before || "{}", auditLog.state_after || "{}");
    };

    render() {
        const {auditLogs} = this.props;
        const {selected} = this.state;
        return (
            <div className="history-container">
                <div className="history">
                    {this.renderAuditLogs(auditLogs, selected)}
                    {this.renderDetail(selected)}
                </div>
            </div>);
    }

}
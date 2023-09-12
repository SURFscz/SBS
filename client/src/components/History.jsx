import React from "react";
import I18n from "../locale/I18n";
import "./History.scss";
import "jsondiffpatch/dist/formatters-styles/html.css";
import {auditLogsInfo, auditLogsMe} from "../api";
import {AppStore} from "../stores/AppStore";
import {getParameterByName} from "../utils/QueryParameters";
import UnitHeader from "./redesign/UnitHeader";
import SpinnerField from "./redesign/SpinnerField";
import Activity from "./Activity";
import {isEmpty} from "../utils/Utils";

export default class History extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            auditLogs: {audit_logs: []},
            loading: true
        };
    }

    componentDidMount = () => {
        const {collection, id} = this.props.match.params;
        const promise = collection === "me" ? auditLogsMe() : auditLogsInfo(id, collection);
        promise.then(res => {
            const {user} = this.props;
            if (!user.admin && collection === "collaborations") {
                res.audit_logs = res.audit_logs.filter(log => {
                    if (!isEmpty(log.state_after)) {
                        const stateAfter = JSON.parse(log.state_after);
                        return !(Object.keys(stateAfter).length === 1 && stateAfter.last_activity_date);
                    }
                    return true;
                })
            }
            const includeMembersTargets = [
                "collaboration_memberships",
                "collaboration_memberships_groups",
                "invitations",
                "join_requests"]
            const includeServicesTargets = ["services", "service_connection_requests"];
            const includeCOPropertiesTargets = ["collaborations", "groups"];
            if (collection === "collaborations") {
                res.audit_logs.forEach(log => {
                    if (log.target_type) {
                        log.isService = includeServicesTargets.includes(log.target_type);
                        log.isMember = includeMembersTargets.includes(log.target_type);
                        log.isCOProperty = includeCOPropertiesTargets.includes(log.target_type);
                    }
                });
            }
            this.setState({
                auditLogs: res,
                loading: false
            });
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

    render() {
        const {auditLogs, loading} = this.state;
        const {collection} = this.props.match.params;
        if (loading) {
            return <SpinnerField/>
        }
        return (
            <div className="history-container">
                <UnitHeader obj={({name: I18n.t("home.history"), icon: "history"})}/>
                <Activity auditLogs={auditLogs} isCollaboration={collection === "collaborations"}/>
            </div>);
    }

}
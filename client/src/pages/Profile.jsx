import React from "react";
import I18n from "../locale/I18n";
import "./Profile.scss";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as PersonIcon} from "../icons/single-neutral-check.svg";

import UnitHeader from "../components/redesign/UnitHeader";
import Me from "./Me";
import Tabs from "../components/Tabs";
import {auditLogsMe} from "../api";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Activity from "../components/Activity";
import {filterAuditLogs} from "../utils/AuditLog";

class Profile extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            auditLogs: [],
            filteredAuditLogs: [],
            tab: "details",
            tabs: [],
            query: "",
        }
    }

    componentDidMount = () => {
        auditLogsMe().then(res => {
            this.setState({
                auditLogs: res,
                filteredAuditLogs: res,
                loading: false
            });
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {path: "", value: I18n.t("breadcrumb.profile")}
                ];
            })
        });
    };

    onChangeQuery = e => {
        const query = e.target.value;
        const {auditLogs} = this.state;
        const filteredAuditLogs = filterAuditLogs(auditLogs, query);
        this.setState({
            filteredAuditLogs: filteredAuditLogs,
            query: query
        });
    }

    getHistoryTab = (filteredAuditLogs, query) => {
        return (<div key="history" name="history" label={I18n.t("home.history")}
                     icon={<FontAwesomeIcon icon="history"/>}>
            <div className={"user-history"}>
                <section className="search-activity">
                    <h2>{I18n.t("models.allUsers.activity")}</h2>
                    <div className="search">
                        <input type="text"
                               onChange={this.onChangeQuery}
                               value={query}
                               placeholder={I18n.t("system.searchPlaceholder")}/>
                        <FontAwesomeIcon icon="search"/>
                    </div>
                </section>
                <Activity auditLogs={filteredAuditLogs}/>
            </div>
        </div>)
    }

    getDetailsTab = meProps => {
        return (
            <div key="details" name="details" label={I18n.t("home.details")}
                 icon={<FontAwesomeIcon icon="user-alt"/>}>
                <div className={"user-details"}>
                    <Me {...meProps}/>
                </div>
            </div>
        )
    }

    tabChanged = name => {
        this.setState({tab: name}, () =>
            this.props.history.replace(`/profile/${name}`));
    }

    render() {
        const {tab, filteredAuditLogs, query} = this.state;
        const {user} = this.props;
        const meProps = {...this.props}
        const tabs = [this.getDetailsTab(meProps), this.getHistoryTab(filteredAuditLogs, query),]
        return (
            <div className="mod-user-profile">
                <UnitHeader obj={({name: user.name, svg: PersonIcon})}
                            mayEdit={false}
                            history={this.props.history}
                            auditLogPath={"me/me"}
                            svg={PersonIcon}
                            name={user.name}>
                    <p>{I18n.t("models.users.username")}<span className={"username"}>{user.username}</span></p>
                </UnitHeader>
                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>

            </div>);
    }

}

export default Profile;
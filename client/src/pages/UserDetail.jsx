import React from "react";
import {auditLogsUser, findUserById} from "../api";
import I18n from "i18n-js";
import "./UserDetail.scss";
import {AppStore} from "../stores/AppStore";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import moment from "moment";
import {filterAuditLogs} from "../utils/AuditLog";
import InputField from "../components/InputField";
import {isEmpty} from "../utils/Utils";
import {ReactComponent as PersonIcon} from "../icons/personal_info.svg";

import UnitHeader from "../components/redesign/UnitHeader";
import SpinnerField from "../components/redesign/SpinnerField";
import Tabs from "../components/Tabs";
import Activity from "../components/Activity";

class UserDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            user: {},
            auditLogs: [],
            filteredAuditLogs: [],
            tab: "details",
            tabs: [],
            query: ""
        }
    }

    componentDidMount = () => {
        const {id} = this.props.match.params;
        Promise.all([findUserById(id), auditLogsUser(id)])
            .then(res => {
                const user = res[0];
                const auditLogs = res[1];
                AppStore.update(s => {
                    s.breadcrumb.paths = [
                        {path: "/", value: I18n.t("breadcrumb.home")},
                        {path: "/home/users", value: I18n.t("breadcrumb.users")},
                        {path: "", value: user.name}
                    ];
                });
                const tab = this.props.match.params.tab || "details";
                this.setState({
                    loading: false, user: user, auditLogs: auditLogs, filteredAuditLogs: auditLogs,
                    tab: tab
                });
            })
    };

    getDetailsTab = user => {
        const attributes = ["name", "email", "username", "uid", "affiliation", "entitlement", "schac_home_organisation", "eduperson_principal_name"];
        return (<div key="details" name="details" label={I18n.t("home.details")}
                     icon={<FontAwesomeIcon icon="id-badge"/>}>
            <div className={"user-profile"}>
                {attributes.map(attr => <InputField noInput={true} disabled={true} value={user[attr] || "-"}
                                                    name={I18n.t(`models.allUsers.${attr}`)}/>)}
                <InputField noInput={true} disabled={true} value={moment(user.last_login_date * 1000).format("LLL")}
                            name={I18n.t("models.allUsers.last_login_date")}/>
                <InputField noInput={true} disabled={true} value={user.ssh_keys.length}
                            name={I18n.t("user.ssh_key")}/>
                <div className="input-field">
                    <label>{I18n.t("models.organisations.title")}</label>
                    {isEmpty(user.organisation_memberships) && "-"}
                    {!isEmpty(user.organisation_memberships) && <ul>
                        {user.organisation_memberships.map(ms =>
                            <li>{`${ms.organisation.name} (${I18n.t('profile.' + ms.role)})`}</li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("models.collaborations.title")}</label>
                    {isEmpty(user.collaboration_memberships) && "-"}
                    {!isEmpty(user.collaboration_memberships) && <ul>
                        {user.collaboration_memberships.map(ms =>
                            <li>{`${ms.collaboration.name} (${I18n.t('profile.' + ms.role)})`}</li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("collaborations.requests")}</label>
                    {isEmpty(user.join_requests) && "-"}
                    {!isEmpty(user.join_requests) && <ul>
                        {user.join_requests.map(jr =>
                            <li>{`${jr.collaboration.name} (${moment(jr.created_at * 1000).format("LLL")})`}</li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("organisations.collaborationRequests")}</label>
                    {isEmpty(user.collaboration_requests) && "-"}
                    {!isEmpty(user.collaboration_requests) && <ul>
                        {user.collaboration_requests.map(cr =>
                            <li>{`${cr.name} (${cr.status})`}</li>)}
                    </ul>}
                </div>
            </div>
        </div>)
    }

    getHistoryTab = (filteredAuditLogs, query) => {
        return (<div key="history" name="history" label={I18n.t("home.history")}
                     icon={<FontAwesomeIcon icon="history"/>}>
            <div className={"user-history"}>
                <section className="search-activity">
                    <p>{I18n.t("models.allUsers.activity")}</p>
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

    onChangeQuery = e => {
        const query = e.target.value;
        const {auditLogs} = this.state;
        const filteredAuditLogs = filterAuditLogs(auditLogs, query);
        this.setState({
            filteredAuditLogs: filteredAuditLogs,
            query: query
        });
    }

    tabChanged = (name, id) => {
        const userId = id || this.props.match.params.id;
        this.setState({tab: name}, () =>
            this.props.history.replace(`/users/${userId}/${name}`));
    }

    render() {
        const {loading, tab, user, filteredAuditLogs, query} = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const tabs = [
            this.getDetailsTab(user),
            this.getHistoryTab(filteredAuditLogs, query),
        ]
        return (
            <div className="mod-user-details">
                <UnitHeader obj={({name: user.name, svg: PersonIcon})}
                            mayEdit={false}
                            svg={PersonIcon}
                            name={user.name}>
                    <p>{I18n.t("models.users.subOtherProfile", {
                        name: user.name,
                        date: moment(user.created_at * 1000).format("LLL")
                    })}</p>
                </UnitHeader>
                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    };

}

export default UserDetail;
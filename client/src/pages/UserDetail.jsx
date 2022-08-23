import React from "react";
import {auditLogsUser, findUserById, ipNetworks} from "../api";
import I18n from "i18n-js";
import "./UserDetail.scss";

import {AppStore} from "../stores/AppStore";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import moment from "moment";
import {filterAuditLogs} from "../utils/AuditLog";
import InputField from "../components/InputField";
import {isEmpty, stopEvent} from "../utils/Utils";
import {ReactComponent as PersonIcon} from "../icons/personal_info.svg";

import UnitHeader from "../components/redesign/UnitHeader";
import SpinnerField from "../components/redesign/SpinnerField";
import Tabs from "../components/Tabs";
import Activity from "../components/Activity";
import UserDetailSshDialog from "./UserDetailSshDialog";
import {Link} from "react-router-dom";

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
            query: "",
            showSshKeys: false,
            user_ip_networks: []
        }
    }

    componentDidMount = () => {
        const {user: currentUser} = this.props;
        const {id} = this.props.match.params;
        const promises = [findUserById(id)];
        if (currentUser.admin) {
            promises.push(auditLogsUser(id));
        }
        Promise.all(promises)
            .then(res => {
                const user = res[0];
                const auditLogs = currentUser.admin ? res[1] : [];
                AppStore.update(s => {
                    s.breadcrumb.paths = [
                        {path: "/", value: I18n.t("breadcrumb.home")},
                        {path: "/home/users", value: I18n.t("breadcrumb.users")},
                        {path: "", value: user.name}
                    ];
                });
                const tab = this.props.match.params.tab || "details";
                this.setState({
                    loading: false,
                    user: user,
                    auditLogs: auditLogs,
                    filteredAuditLogs: auditLogs,
                    tab: tab
                });
                if (!isEmpty(res[0].user_ip_networks)) {
                    Promise.all(res[0].user_ip_networks.map(n => ipNetworks(n.network_value, n.id)))
                        .then(res => {
                            this.setState({"user_ip_networks": res});
                        });
                }
            })
    };

    displayCollaboration = (collMembership, currentUser) => {
        if (currentUser.admin) {
            return true;
        }
        const organisationId = collMembership.collaboration.organisation_id;
        const organisationIdentifiers = currentUser.organisation_memberships.map(orgMembership => orgMembership.organisation_id);
        return organisationIdentifiers.includes(organisationId);
    }

    getDetailsTab = (user, currentUser) => {
        const attributes = ["name", "email", "username", "uid", "affiliation", "entitlement", "schac_home_organisation", "eduperson_principal_name"];
        return (<div key="details" name="details" label={I18n.t("home.details")}
                     icon={<FontAwesomeIcon icon="id-badge"/>}>
            <div className={"user-profile"}>
                {attributes.map((attr, index) =>
                    <div key={index}>
                        <InputField noInput={true} disabled={true} value={user[attr] || "-"}
                                    name={I18n.t(`models.allUsers.${attr}`)}/>
                    </div>)}
                <InputField noInput={true} disabled={true} value={moment(user.last_login_date * 1000).format("LLL")}
                            name={I18n.t("models.allUsers.last_login_date")}/>
                <div className="ssh-keys">
                    <InputField noInput={true} disabled={true} value={user.ssh_keys.length}
                                name={I18n.t("user.ssh_key")}/>
                    {user.ssh_keys.length > 0 &&
                    <a href="/ssh" onClick={this.toggleSsh}>{I18n.t("models.allUsers.showSsh")}</a>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("models.organisations.title")}</label>
                    {isEmpty(user.organisation_memberships) && "-"}
                    {!isEmpty(user.organisation_memberships) && <ul>
                        {user.organisation_memberships.map(ms =>
                            <li key={`organisation_membership_${ms.id}`}>
                                <Link to={`/organisations/${ms.organisation.id}`}>{`${ms.organisation.name} (${I18n.t('profile.' + ms.role)})`}</Link>
                            </li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("models.collaborations.title")}</label>
                    {isEmpty(user.collaboration_memberships) && "-"}
                    {!isEmpty(user.collaboration_memberships) && <ul>
                        {user.collaboration_memberships
                            .filter(collMembership => this.displayCollaboration(collMembership, currentUser))
                            .map((ms, index) =>
                            <li key={`${ms.role}_${index}`}>
                               <Link to={`/collaborations/${ms.collaboration.id}`}>{`${ms.collaboration.name} (${I18n.t('profile.' + ms.role)})`}</Link>
                            </li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("collaborations.requests")}</label>
                    {isEmpty(user.join_requests) && "-"}
                    {!isEmpty(user.join_requests) && <ul>
                        {user.join_requests.map((jr, index) =>
                            <li key={index}>
                                <Link to={`/collaborations/${jr.collaboration.id}/joinrequests`}>
                                    {`${jr.collaboration.name} (${moment(jr.created_at * 1000).format("LLL")})`}
                                </Link>
                            </li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("organisations.collaborationRequests")}</label>
                    {isEmpty(user.collaboration_requests) && "-"}
                    {!isEmpty(user.collaboration_requests) && <ul>
                        {user.collaboration_requests.map(cr =>
                            <li key={`collaboration_request_${cr.id}`}>
                                <Link to={`/organisations/${cr.organisation.id}/collaboration_requests`}>{`${cr.name} (${cr.status})`}</Link>
                            </li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("models.services.title")}</label>
                    {isEmpty(user.service_memberships) && "-"}
                    {!isEmpty(user.service_memberships) && <ul>
                        {user.service_memberships.map(sm =>
                            <li key={`service_membership_${sm.id}`}>
                               <Link to={`/services/${sm.service.id}`}>{`${sm.service.name} (${I18n.t('profile.' + sm.role)})`}</Link>
                            </li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("profile.network")}</label>
                    {isEmpty(user.user_ip_networks) && "-"}
                    {!isEmpty(user.user_ip_networks) && <ul>
                        {user.user_ip_networks.map(n =>
                            <li key={`user_ip_networks_${n.id}`}>{n.network_value}</li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t("aup.multiple")}</label>
                    {isEmpty(user.service_aups) && "-"}
                    {!isEmpty(user.service_aups) && <ul>
                        {user.service_aups.map(sm =>
                            <li key={`service_aup_${sm.id}`}>
                                <Link to={`/services/${sm.service.id}`}>{sm.service.name}</Link>
                            </li>)}
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

    toggleSsh = e => {
        stopEvent(e);
        this.setState({showSshKeys: !this.state.showSshKeys})
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
        const {loading, tab, user, filteredAuditLogs, query, showSshKeys} = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const {user: currentUser} = this.props;
        const tabs = [this.getDetailsTab(user, currentUser)];
        if (currentUser.admin) {
            tabs.push(this.getHistoryTab(filteredAuditLogs, query));
        }
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
                {showSshKeys && <UserDetailSshDialog user={user} toggle={this.toggleSsh}/>}
            </div>);
    };

}

export default UserDetail;
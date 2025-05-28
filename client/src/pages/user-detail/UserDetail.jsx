import React from "react";
import {
    activateUserForCollaboration,
    auditLogsUser,
    deleteOtherUser,
    findUserById,
    organisationNameById, reset2faOther
} from "../../api";
import I18n from "../../locale/I18n";
import "./UserDetail.scss";

import {AppStore} from "../../stores/AppStore";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import moment from "moment";
import {filterAuditLogs} from "../../utils/AuditLog";
import InputField from "../../components/input-field/InputField";
import {isEmpty, stopEvent} from "../../utils/Utils";
import {ReactComponent as PersonIcon} from "../../icons/personal_info.svg";

import UnitHeader from "../../components/_redesign/UnitHeader";
import SpinnerField from "../../components/_redesign/SpinnerField";
import Tabs from "../../components/tabs/Tabs";
import Activity from "../../components/activity/Activity";
import UserDetailSshDialog from "../user-detail-ssh-dialog/UserDetailSshDialog";
import {Link} from "react-router-dom";
import Button from "../../components/button/Button";
import ConfirmationDialog from "../../components/confirmation-dialog/ConfirmationDialog";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import {Loader} from "@surfnet/sds";

class UserDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            loadingAuditLogs: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            user: {},
            auditLogs: [],
            filteredAuditLogs: [],
            tab: "details",
            tabs: [],
            query: "",
            showSshKeys: false
        }
    }

    componentDidMount = () => {
        const {user: currentUser} = this.props;
        const {id, org_id} = this.props.match.params;
        const promises = [findUserById(id)];
        if (org_id) {
            promises.push(organisationNameById(org_id))
        }
        Promise.all(promises)
            .then(res => {
                if (currentUser.admin) {
                    this.setState({loadingAuditLogs: true})
                    auditLogsUser(id).then(auditLogs => {
                        this.setState({
                            auditLogs: auditLogs,
                            filteredAuditLogs: auditLogs,
                            loadingAuditLogs: false
                        });
                    });
                }
                const user = res[0];
                let middlePath;
                if (org_id) {
                    middlePath = {
                        path: `/organisations/${org_id}/users`,
                        value: I18n.t("breadcrumb.organisation", {name: res[res.length - 1].name})
                    }
                } else {
                    middlePath = {path: "/home/users", value: I18n.t("breadcrumb.users")};
                }
                AppStore.update(s => {
                    s.breadcrumb.paths = [
                        {path: "/", value: I18n.t("breadcrumb.home")},
                        middlePath,
                        {path: "", value: user.name}
                    ];
                });
                const tab = this.props.match.params.tab || "details";
                this.setState({
                    loading: false,
                    user: user,
                    tab: tab
                });
            })
    };

    deleteUser = showConfirmation => {
        const {user} = this.state;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => this.deleteUser(false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("user.deleteOtherConfirmation", {name: user.name})
            });
        } else {
            deleteOtherUser(user.id).then(() => this.props.history.push("/home/users"));
        }
    }

    unsuspendUser = showConfirmation => {
        const {user} = this.state;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => this.unsuspendUser(false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("user.unsuspendOtherConfirmation", {name: user.name})
            });
        } else {
            activateUserForCollaboration(null, user.id).then(() => {
                this.setState({confirmationDialogOpen: false});
                this.componentDidMount();
            })
        }
    }

    reset2fa = showConfirmation => {
        const {user} = this.state;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => this.reset2fa(false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("user.reset2faConfirmation", {name: user.name})
            });
        } else {
            reset2faOther(user.id).then(() => {
                this.setState({confirmationDialogOpen: false});
                this.componentDidMount();
            })
        }
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
                <InputField noInput={true}
                            disabled={true}
                            value={user.last_login_date ? moment(user.last_login_date * 1000).format("LLL") : "-"}
                            name={I18n.t("models.allUsers.last_login_date")}/>
                {currentUser.admin && <div className="ssh-keys">
                    <InputField noInput={true} disabled={true} value={user.ssh_keys.length}
                                name={I18n.t("user.ssh_key")}/>
                    {user.ssh_keys.length > 0 &&
                        <a href="/ssh" onClick={this.toggleSsh}>{I18n.t("models.allUsers.showSsh")}</a>}
                </div>}
                <div className="input-field">
                    <label>{I18n.t(`models.organisations.title`)}</label>
                    {isEmpty(user.organisation_memberships) && "-"}
                    {!isEmpty(user.organisation_memberships) && <ul>
                        {user.organisation_memberships.map(ms =>
                            <li key={`organisation_membership_${ms.id}`}>
                                <Link
                                    to={`/organisations/${ms.organisation.id}`}>{`${ms.organisation.name} (${I18n.t('profile.' + ms.role)})`}</Link>
                            </li>)}
                    </ul>}
                </div>
                <div className="input-field">
                    <label>{I18n.t(`models.collaborations.${currentUser.admin ? "title" : "titleForOrgAdmin"}`)}</label>
                    {isEmpty(user.collaboration_memberships) && "-"}
                    {!isEmpty(user.collaboration_memberships) && <ul>
                        {user.collaboration_memberships
                            .map((ms, index) =>
                                <li key={`${ms.role}_${index}`}>
                                    <Link
                                        to={`/collaborations/${ms.collaboration.id}`}>{`${ms.collaboration.name} (${I18n.t('profile.' + ms.role)})`}</Link>
                                </li>)}
                    </ul>}
                </div>
                {currentUser.admin && <div className="input-field">
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
                </div>}
                {currentUser.admin && <div className="input-field">
                    <label>{I18n.t("organisations.collaborationRequests")}</label>
                    {isEmpty(user.collaboration_requests) && "-"}
                    {!isEmpty(user.collaboration_requests) && <ul>
                        {user.collaboration_requests.map(cr =>
                            <li key={`collaboration_request_${cr.id}`}>
                                <Link
                                    to={`/organisations/${cr.organisation.id}/collaboration_requests`}>{`${cr.name} (${cr.status})`}</Link>
                            </li>)}
                    </ul>}
                </div>}
                {currentUser.admin && <div className="input-field">
                    <label>{I18n.t("models.services.title")}</label>
                    {isEmpty(user.service_memberships) && "-"}
                    {!isEmpty(user.service_memberships) && <ul>
                        {user.service_memberships.map(sm =>
                            <li key={`service_membership_${sm.id}`}>
                                <Link
                                    to={`/services/${sm.service.id}`}>{`${sm.service.name} (${I18n.t('profile.' + sm.role)})`}</Link>
                            </li>)}
                    </ul>}
                </div>}
                {currentUser.admin && <div className="input-field">
                    <label>{I18n.t("aup.multiple")}</label>
                    {isEmpty(user.service_aups) && "-"}
                    {!isEmpty(user.service_aups) && <ul>
                        {user.service_aups.map(sm =>
                            <li key={`service_aup_${sm.id}`}>
                                <Link to={`/services/${sm.service.id}`}>{sm.service.name}</Link>
                            </li>)}
                    </ul>}
                </div>}
                <div className={"actions"}>
                    {currentUser.admin &&
                        <Button warningButton={true}
                                txt={I18n.t("user.deleteOther")}
                                onClick={() => this.deleteUser(true)}/>}
                    {(user.suspended && currentUser.admin) &&
                        <Button warningButton={true}
                                txt={I18n.t("user.unsuspend")}
                                onClick={() => this.unsuspendUser(true)}/>}
                    {(isUserAllowed(ROLES.ORG_ADMIN, currentUser) && user.mfa_reset_token) &&
                        <Button warningButton={true}
                                txt={I18n.t("user.reset2fa")}
                                onClick={() => this.reset2fa(true)}/>}
                </div>
            </div>
        </div>)
    }

    getHistoryTab = (filteredAuditLogs, query, loadingAuditLogs) => {
        return (
            <div key="history" name="history" label={I18n.t("home.history")}
                 icon={<FontAwesomeIcon icon="history"/>}>
                <div className={"user-history"}>
                    {!loadingAuditLogs && <Activity auditLogs={filteredAuditLogs} collectionName={"users"} user={this.props.user}/>}
                    {loadingAuditLogs && <Loader children={
                        <div className={"loader-msg"}><span>{I18n.t("models.allUsers.loading")}</span></div>}/>}
                </div>
            </div>
        )
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
        const {
            loading, tab, user, filteredAuditLogs, query, showSshKeys, loadingAuditLogs,
            confirmationDialogAction, confirmationDialogOpen, cancelDialogAction, confirmationQuestion
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const {user: currentUser} = this.props;
        const tabs = [this.getDetailsTab(user, currentUser)];
        if (currentUser.admin) {
            tabs.push(this.getHistoryTab(filteredAuditLogs, query, loadingAuditLogs));
        }
        return (
            <div className="mod-user-details">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    question={confirmationQuestion}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}/>
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
            </div>
        );
    }

}

export default UserDetail;

import React from "react";
import "./System.scss";
import I18n from "i18n-js";
import JsonFormatter from 'react-json-formatter'

import {
    activateUserForCollaboration,
    auditLogsActivity,
    cleanSlate,
    cleanupNonOpenRequests,
    clearAuditLogs,
    composition,
    dbDemoSeed,
    dbHumanTestingSeed,
    dbSeed,
    dbStats,
    deleteOrphanUsers,
    expireCollaborationMemberships,
    expireCollaborations,
    getSuspendedUsers,
    health,
    outstandingRequests,
    plscSync,
    scheduledJobs,
    suspendCollaborations,
    suspendUsers,
    userLoginsSummary,
    validations
} from "../api";
import ReactJson from "react-json-view";
import Button from "../components/Button";
import {isEmpty} from "../utils/Utils";
import UnitHeader from "../components/redesign/UnitHeader";
import ConfirmationDialog from "../components/ConfirmationDialog";
import SpinnerField from "../components/redesign/SpinnerField";
import {AppStore} from "../stores/AppStore";
import Tabs from "../components/Tabs";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Activity from "../components/Activity";
import Select from "react-select";
import MemberJoinRequests from "../components/redesign/MemberJoinRequests";
import MemberCollaborationRequests from "../components/redesign/MemberCollaborationRequests";
import {logout} from "../utils/Login";
import {filterAuditLogs} from "../utils/AuditLog";
import SelectField from "../components/SelectField";
import moment from "moment";
import OrganisationInvitations from "../components/redesign/OrganisationInvitations";
import OrganisationsWithoutAdmin from "../components/redesign/OrganisationsWithoutAdmin";
import ServicesWithoutAdmin from "../components/redesign/ServicesWithoutAdmin";
import {dateFromEpoch} from "../utils/Date";
import DOMPurify from "dompurify";
import Scim from "./Scim";
import CheckBox from "../components/CheckBox";
import ClipBoardCopy from "../components/redesign/ClipBoardCopy";

const options = [25, 50, 100, 150, 200, 250, 500].map(nbr => ({value: nbr, label: nbr}));

class System extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.allTables = Object.entries(I18n.translations[I18n.locale].history.tables)
            .map(arr => ({value: arr[0], label: arr[1]}))
            .sort((t1, t2) => t1.label.localeCompare(t2.label));
        this.state = {
            tab: "validations",
            suspendedUsers: {},
            suspendedCollaborations: {},
            expiredCollaborations: {},
            deletedUsers: {},
            expiredMemberships: {},
            outstandingRequests: {},
            cleanedRequests: {},
            databaseStats: [],
            userLoginStats: [],
            cronJobs: [],
            seedResult: null,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            busy: false,
            auditLogs: {audit_logs: []},
            filteredAuditLogs: {audit_logs: []},
            validationData: {"organisations": [], "organisation_invitations": [], "services": []},
            limit: options[1],
            query: "",
            serverQuery: "",
            selectedTables: [],
            showOrganisationsWithoutAdmin: true,
            showServicesWithoutAdmin: true,
            plscData: {},
            plscView: false,
            compositionData: {},
            currentlySuspendedUsers: []
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
                    {value: I18n.t("breadcrumb.system")}
                ];
            });

        })
    };

    clear = () => {
        this.setState({
            suspendedUsers: {},
            suspendedCollaborations: {},
            expiredCollaborations: {},
            deletedUsers: {},
            expiredMemberships: {},
            outstandingRequests: {},
            cleanedRequests: {},
            databaseStats: [],
            cronJobs: [],
            seedResult: null,
            demoSeedResult: null,
            query: "",
            auditLogs: {audit_logs: []},
            filteredAuditLogs: {audit_logs: []},
            limit: options[1],
        });
    }

    reload = () => {
        // eslint-disable-next-line
        window.location.href = window.location.href;
    }

    getCronTab = (suspendedUsers, outstandingRequests, cleanedRequests, expiredCollaborations, suspendedCollaborations,
                  expiredMemberships, deletedUsers, cronJobs) => {
        return (<div key="cron" name="cron" label={I18n.t("home.tabs.cron")}
                     icon={<FontAwesomeIcon icon="clock"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDailyCron()}
                    {this.renderDailyCronResults(suspendedUsers)}
                    {this.renderExpiredCollaborations()}
                    {this.renderExpiredCollaborationsResults(expiredCollaborations)}
                    {this.renderSuspendedCollaborations()}
                    {this.renderSuspendedCollaborationsResults(suspendedCollaborations)}
                    {this.renderExpiredMemberships()}
                    {this.renderExpiredMembershipsResults(expiredMemberships)}
                    {this.renderOrphanUsers()}
                    {this.renderOrphanUsersResults(deletedUsers)}
                    {this.renderOutstandingRequests()}
                    {this.renderOutstandingRequestsResults(outstandingRequests)}
                    {this.renderCleanedRequests()}
                    {this.renderCleanedRequestsResults(cleanedRequests)}
                    {this.renderCronJobs()}
                    {this.renderCronJobsResults(cronJobs)}
                </section>
            </div>
        </div>)
    }

    changeLimit = val => {
        this.setState({limit: val, busy: true}, () => {
            const {selectedTables, serverQuery} = this.state;
            auditLogsActivity(val.value, selectedTables, serverQuery).then(res => {
                this.setState({
                    auditLogs: res,
                    filteredAuditLogs: filterAuditLogs(res, this.state.query),
                    busy: false
                });
            });
        });
    }

    fetchActivities = () => {
        const {selectedTables, limit, serverQuery} = this.state;
        this.setState({busy: true}, () => {
            auditLogsActivity(limit.value, selectedTables, serverQuery).then(res => {
                this.setState({
                    auditLogs: res,
                    filteredAuditLogs: filterAuditLogs(res, this.state.query),
                    busy: false
                });
            });
        });
    }

    selectedTablesChanged = selectedOptions => {
        if (selectedOptions === null) {
            this.setState({selectedTables: []});
        } else {
            const newSelectedOptions = Array.isArray(selectedOptions) ? [...selectedOptions] : [selectedOptions];
            this.setState({selectedTables: newSelectedOptions});
        }
    }


    getActivityTab = (filteredAuditLogs, limit, query, config, selectedTables, serverQuery) => {
        return (
            <div key="activity" name="activity" label={I18n.t("home.tabs.activity")}
                 icon={<FontAwesomeIcon icon="code-branch"/>}>
                <div className="mod-system">
                    <section className={"info-block-container"}>
                        <section className="search-activity">
                            <p>{I18n.t("system.activity", {count: filteredAuditLogs.audit_logs.length})}</p>
                            {config.seed_allowed &&
                            <Button warningButton={true} onClick={() => this.doClearAuditLogs(true)}/>}
                            <div className={`search ${config.seed_allowed ? "" : "no-clear-logs"}`}>
                                <input type="text"
                                       onChange={this.onChangeQuery}
                                       value={query}
                                       placeholder={I18n.t("system.searchPlaceholder")}/>
                                <FontAwesomeIcon icon="search"/>
                            </div>
                            <Select
                                className="input-select-inner"
                                classNamePrefix="select-inner"
                                value={limit}
                                placeholder={I18n.t("system.searchPlaceholder")}
                                onChange={this.changeLimit}
                                options={options}
                                isSearchable={false}
                                isClearable={false}
                            />
                        </section>
                        <section className="table-selection">
                            <SelectField value={selectedTables}
                                         options={this.allTables
                                             .filter(table => !selectedTables.find(st => st.value === table.value))}
                                         name={I18n.t("history.activities.tables")}
                                         toolTip={I18n.t("history.activities.tablesTooltip")}
                                         isMulti={true}
                                         searchable={true}
                                         placeholder={I18n.t("history.activities.tablesPlaceHolder")}
                                         onChange={this.selectedTablesChanged}/>
                            <div className="search server-side">
                                <input type="text"
                                       onChange={e => this.setState({serverQuery: e.target.value})}
                                       value={serverQuery}
                                       placeholder={I18n.t("system.searchPlaceholderServer")}/>
                                <FontAwesomeIcon icon="search"/>
                            </div>

                            <div className="action-container">
                                <Button txt={I18n.t("history.activities.submit")} onClick={this.fetchActivities}/>
                            </div>

                        </section>
                        <Activity auditLogs={filteredAuditLogs}/>
                    </section>
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

    getPlscTab = (plscData, plscView) => {
        const jsonStyle = {
            propertyStyle: {color: "black"},
            stringStyle: {color: "green"},
            numberStyle: {color: 'darkorange'}
        }
        const plscJson = JSON.stringify(plscData);
        return (<div key="plsc" name="plsc" label={I18n.t("home.tabs.plsc")}
                     icon={<FontAwesomeIcon icon="table"/>}>
            <div className="mod-system">
                <section className="info-block-container">
                    <div className={"toggle-json"}>
                        <CheckBox name={"toggle-json"}
                                  value={plscView}
                                  info={I18n.t("system.toggleJson")}
                                  onChange={() => this.setState({plscView: !plscView})}/>
                        <ClipBoardCopy txt={plscJson}/>
                    </div>
                    {plscView &&
                    <ReactJson src={plscData} collapsed={1}/>}
                    {!plscView &&
                    <JsonFormatter json={plscJson} tabWith={4} jsonStyle={jsonStyle}/>}

                </section>
            </div>
        </div>)

    }

    getCompositionTab = compositionData => {
        return (<div key="composition" name="composition" label={I18n.t("home.tabs.composition")}
                     icon={<FontAwesomeIcon icon="book-open"/>}>
            <div className="mod-system">
                <section className="info-block-container">
                    <ReactJson src={compositionData} collapsed={1}/>
                </section>
            </div>
        </div>)

    }

    toggleShowOrganisationsWithoutAdmin = show => this.setState({showOrganisationsWithoutAdmin: show});

    toggleShowServicesWithoutAdmin = show => this.setState({showServicesWithoutAdmin: show});

    getValidationTab = (validationData, showOrganisationsWithoutAdmin, showServicesWithoutAdmin) => {
        const organisation_invitations = validationData.organisation_invitations;
        const organisations = validationData.organisations;
        const services = validationData.services;
        return (<div key="validations" name="validations" label={I18n.t("home.tabs.validation")}
                     icon={<FontAwesomeIcon icon="calendar-check"/>}>
            <div className="mod-system">
                <section className="info-block-container">
                    <OrganisationInvitations organisation_invitations={organisation_invitations}
                                             toggleShowOrganisationsWithoutAdmin={this.toggleShowOrganisationsWithoutAdmin}
                                             toggleShowServicesWithoutAdmin={this.toggleShowServicesWithoutAdmin}
                                             refresh={callback => this.componentDidMount(callback)}/>
                </section>
                {showOrganisationsWithoutAdmin &&
                <section className="info-block-container">
                    <OrganisationsWithoutAdmin organisations={organisations} {...this.props}/>
                </section>}
                {showServicesWithoutAdmin &&
                <section className="info-block-container">
                    <ServicesWithoutAdmin services={services} {...this.props}/>
                </section>}
            </div>
        </div>)

    }

    getDatabaseTab = (databaseStats, config) => {
        return (<div key="database" name="database" label={I18n.t("home.tabs.database")}
                     icon={<FontAwesomeIcon icon="database"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDbStats()}
                    {this.renderDbStatsResults(databaseStats)}
                </section>
                {config.seed_allowed && <div className={"delete-all"}>
                    <Button warningButton={true}
                            icon={<FontAwesomeIcon icon="trash"/>}
                            onClick={() => this.doCleanSlate(true)}/>
                </div>}
            </div>
        </div>)
    }

    getUserLoginTab = userLoginStats => {
        return (<div key="userlogins" name="userlogins" label={I18n.t("home.tabs.userlogins")}
                     icon={<FontAwesomeIcon icon="users"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderUserLoginStats()}
                    {this.renderUserLoginResults(userLoginStats)}
                </section>
            </div>
        </div>)
    }

    getScimTab = () => {
        return (<div key="scim" name="scim" label={I18n.t("home.tabs.scim")}
                     icon={<FontAwesomeIcon icon="snowflake"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    <Scim {...this.props}/>
                </section>
            </div>
        </div>)
    }

    activateUser = user => {
        this.setState({busy: true});
        activateUserForCollaboration(null, user.id).then(() => {
            getSuspendedUsers().then(res => this.setState({currentlySuspendedUsers: res, busy: false}))
        })
    }

    getSuspendedUsersTab = currentlySuspendedUsers => {
        const zeroState = currentlySuspendedUsers.length === 0;
        return (<div key="suspended-users"
                     name="suspended-users"
                     label={I18n.t("home.tabs.suspendedUsers")}
                     icon={<FontAwesomeIcon icon="user-lock"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    <p>{I18n.t(`system.suspendedUsers.${zeroState ? "titleZeroState" : "title"}`)}</p>
                    {!zeroState && <table className={"suspended-users"}>
                        <thead>
                        <tr>
                            <th>{I18n.t("system.suspendedUsers.name")}</th>
                            <th>{I18n.t("system.suspendedUsers.email")}</th>
                            <th>{I18n.t("system.suspendedUsers.lastLogin")}</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {currentlySuspendedUsers.map(user => <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.last_login_date ? dateFromEpoch(user.last_login_date) : "-"}</td>
                            <td>
                                {<Button txt={I18n.t("system.suspendedUsers.activate")}
                                         onClick={() => this.activateUser(user)}/>}
                            </td>
                        </tr>)}
                        </tbody>
                    </table>}
                </section>
            </div>
        </div>)
    }

    getSeedTab = (seedResult, demoSeedResult, humanTestingSeedResult) => {
        return (<div key="seed" name="seed" label={I18n.t("home.tabs.seed")}
                     icon={<FontAwesomeIcon icon="seedling"/>}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDbSeed()}
                    <p className="result">{seedResult}</p>
                </section>
                <section className={"info-block-container"}>
                    {this.renderDbDemoSeed()}
                    <p className="result">{demoSeedResult}</p>
                </section>
                <section className={"info-block-container"}>
                    {this.renderDbHumanTestingSeed()}
                    <p className="result">{humanTestingSeedResult}</p>
                </section>
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

    doExpireCollaborations = () => {
        this.setState({busy: true})
        expireCollaborations().then(res => {
            this.setState({expiredCollaborations: res, busy: false});
        });
    }

    doExpireMemberships = () => {
        this.setState({busy: true})
        expireCollaborationMemberships().then(res => {
            this.setState({expiredMemberships: res, busy: false});
        });
    }

    doOrphanUsers = () => {
        this.setState({busy: true})
        deleteOrphanUsers().then(res => {
            this.setState({deletedUsers: res, busy: false});
        });
    }

    doSuspendCollaborations = () => {
        this.setState({busy: true})
        suspendCollaborations().then(res => {
            this.setState({suspendedCollaborations: res, busy: false});
        });
    }

    doOutstandingRequests = () => {
        this.setState({busy: true})
        outstandingRequests().then(res => {
            this.setState({outstandingRequests: res, busy: false});
        });
    }

    doCleanupNonOpenRequests = () => {
        this.setState({busy: true})
        cleanupNonOpenRequests().then(res => {
            this.setState({cleanedRequests: res, busy: false});
        });
    }

    doCronJobs = () => {
        this.setState({busy: true})
        scheduledJobs().then(res => {
            this.setState({cronJobs: res, busy: false});
        });
    }

    doClearAuditLogs = showConfirmation => {
        if (showConfirmation) {
            this.confirm(() => this.doClearAuditLogs(false), I18n.t("system.runClearAuditLogsConfirmation"));
        } else {
            this.setState({confirmationDialogOpen: false, busy: true,});
            clearAuditLogs().then(() => this.setState({
                auditLogs: {audit_logs: []},
                filteredAuditLogs: {audit_logs: []},
                busy: false
            }));
        }
    }

    doCleanSlate = showConfirmation => {
        if (showConfirmation) {
            this.confirm(() => this.doCleanSlate(false), I18n.t("system.runCleanSlate"));
        } else {
            this.setState({confirmationDialogOpen: false, busy: true,});
            cleanSlate().then(() => logout());
        }
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

    doDbDemoSeed = showConfirmation => {
        if (showConfirmation) {
            this.confirm(() => this.doDbDemoSeed(false), I18n.t("system.runDbSeedConfirmation"));
        } else {
            this.setState({confirmationDialogOpen: false, busy: true,});
            const d = new Date();
            dbDemoSeed().then(() => {
                this.setState({
                    busy: false,
                    demoSeedResult: I18n.t("system.seedResult", {ms: new Date().getMilliseconds() - d.getMilliseconds()})
                });
            });
        }
    }

    doDbHumanTestingSeed = showConfirmation => {
        if (showConfirmation) {
            this.confirm(() => this.doDbHumanTestingSeed(false), I18n.t("system.runDbSeedConfirmation"));
        } else {
            this.setState({confirmationDialogOpen: false, busy: true,});
            const d = new Date();
            dbHumanTestingSeed().then(() => {
                this.setState({
                    busy: false,
                    humanTestingSeedResult: I18n.t("system.seedResult", {ms: (new Date().getMilliseconds() - d.getMilliseconds())})
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

    renderExpiredCollaborations = () => {
        const {expiredCollaborations} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runExpiredCollaborations")}</p>
                <div className="actions">
                    {isEmpty(expiredCollaborations) && <Button txt={I18n.t("system.runDailyJobs")}
                                                               onClick={this.doExpireCollaborations}/>}
                    {!isEmpty(expiredCollaborations) && <Button txt={I18n.t("system.clear")}
                                                                onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderExpiredMemberships = () => {
        const {expiredMemberships} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runExpiredMemberships")}</p>
                <div className="actions">
                    {isEmpty(expiredMemberships) && <Button txt={I18n.t("system.runDailyJobs")}
                                                            onClick={this.doExpireMemberships}/>}
                    {!isEmpty(expiredMemberships) && <Button txt={I18n.t("system.clear")}
                                                             onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderOrphanUsers = () => {
        const {deletedUsers} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runOrphanUsers")}</p>
                <div className="actions">
                    {isEmpty(deletedUsers) && <Button txt={I18n.t("system.runDailyJobs")}
                                                      onClick={this.doOrphanUsers}/>}
                    {!isEmpty(deletedUsers) && <Button txt={I18n.t("system.clear")}
                                                       onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderSuspendedCollaborations = () => {
        const {suspendedCollaborations} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runSuspendedCollaborations")}</p>
                <div className="actions">
                    {isEmpty(suspendedCollaborations) && <Button txt={I18n.t("system.runDailyJobs")}
                                                                 onClick={this.doSuspendCollaborations}/>}
                    {!isEmpty(suspendedCollaborations) && <Button txt={I18n.t("system.clear")}
                                                                  onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderOutstandingRequests = () => {
        const {outstandingRequests} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runOutdatedRequestsInfo")}</p>
                <div className="actions">
                    {isEmpty(outstandingRequests) && <Button txt={I18n.t("system.runOutdatedRequests")}
                                                             onClick={this.doOutstandingRequests}/>}
                    {!isEmpty(outstandingRequests) && <Button txt={I18n.t("system.clear")}
                                                              onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderCleanedRequests = () => {
        const {cleanedRequests} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runCleanedRequestsInfo")}</p>
                <div className="actions">
                    {isEmpty(cleanedRequests) && <Button txt={I18n.t("system.runCleanedRequests")}
                                                         onClick={this.doCleanupNonOpenRequests}/>}
                    {!isEmpty(cleanedRequests) && <Button txt={I18n.t("system.clear")}
                                                          onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderCronJobs = () => {
        const {cronJobs} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.showDailyJobsInfo")}</p>
                <div className="actions">
                    {isEmpty(cronJobs) && <Button txt={I18n.t("system.showDailyJobs")}
                                                  onClick={this.doCronJobs}/>}
                    {!isEmpty(cronJobs) && <Button txt={I18n.t("system.clear")}
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

    renderUserLoginStats = () => {
        return (
            <div className="info-block">
                <p>{I18n.t("system.userLoginInfo")}</p>
            </div>
        );
    }
    renderDbSeed = () => {
        const {seedResult} = this.state;
        return (
            <div className="info-block">
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("system.runDbSeedInfo"))}}/>
                <div className="actions">
                    {isEmpty(seedResult) && <Button txt={I18n.t("system.runDbSeed")}
                                                    onClick={() => this.doDbSeed(true)}/>}
                    {!isEmpty(seedResult) && <Button txt={I18n.t("system.reload")}
                                                     onClick={this.reload} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderDbDemoSeed = () => {
        const {demoSeedResult} = this.state;
        return (
            <div className="info-block">
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("system.runDbDemoSeedInfo"))}}/>
                <div className="actions">
                    {isEmpty(demoSeedResult) && <Button txt={I18n.t("system.runDbSeed")}
                                                        onClick={() => this.doDbDemoSeed(true)}/>}
                    {!isEmpty(demoSeedResult) && <Button txt={I18n.t("system.reload")}
                                                         onClick={this.reload} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderDbHumanTestingSeed = () => {
        const {humanTestingSeedResult} = this.state;
        return (
            <div className="info-block">
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("system.runDbHumanTestingSeedInfo"))}}/>
                <div className="actions">
                    {isEmpty(humanTestingSeedResult) && <Button txt={I18n.t("system.runDbSeed")}
                                                                onClick={() => this.doDbHumanTestingSeed(true)}/>}
                    {!isEmpty(humanTestingSeedResult) && <Button txt={I18n.t("system.reload")}
                                                                 onClick={this.reload} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderExpiredCollaborationsResults = expiredCollaborations => {
        return (
            <div className="results">
                {!isEmpty(expiredCollaborations) && <div className="results">
                    <table className="expired-collaborations">
                        <thead>
                        <tr>
                            <th>{I18n.t("system.action")}</th>
                            <th>{I18n.t("system.results")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.keys(expiredCollaborations).map(key =>
                            <tr key={key}>
                                <td className="action">{I18n.t(`system.${key}`)}</td>
                                <td>
                                    {!isEmpty(expiredCollaborations[key]) && <ul>
                                        {expiredCollaborations[key].map(coll => <li>{coll.name}</li>)}
                                    </ul>}
                                    {isEmpty(expiredCollaborations[key]) && <span>None</span>}
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>}
            </div>)
    }

    renderOrphanUsersResults = deletedUsers => {
        return (
            <div className="results">
                {!isEmpty(deletedUsers) && <div className="results">
                    <table className="expired-memberships">
                        <thead>
                        <tr>
                            <th>{I18n.t("system.action")}</th>
                            <th>{I18n.t("system.results")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.keys(deletedUsers).map(key =>
                            <tr key={key}>
                                <td className="action">{I18n.t(`system.${key}`)}</td>
                                <td>
                                    {!isEmpty(deletedUsers[key]) && <ul>
                                        {deletedUsers[key].map(email =>
                                            <li>{email}</li>)}
                                    </ul>}
                                    {isEmpty(deletedUsers[key]) && <span>None</span>}
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>}
            </div>)
    }


    renderExpiredMembershipsResults = expiredMemberships => {
        return (
            <div className="results">
                {!isEmpty(expiredMemberships) && <div className="results">
                    <table className="expired-memberships">
                        <thead>
                        <tr>
                            <th>{I18n.t("system.action")}</th>
                            <th>{I18n.t("system.results")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.keys(expiredMemberships).map(key =>
                            <tr key={key}>
                                <td className="action">{I18n.t(`system.${key}`)}</td>
                                <td>
                                    {!isEmpty(expiredMemberships[key]) && <ul>
                                        {expiredMemberships[key].map(mb =>
                                            <li>{`${mb.user.name} (${mb.collaboration.name})`}</li>)}
                                    </ul>}
                                    {isEmpty(expiredMemberships[key]) && <span>None</span>}
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>}
            </div>)
    }

    renderSuspendedCollaborationsResults = suspendedCollaborations => {
        return (
            <div className="results">
                {!isEmpty(suspendedCollaborations) && <div className="results">
                    <table className="suspended-collaborations">
                        <thead>
                        <tr>
                            <th>{I18n.t("system.action")}</th>
                            <th>{I18n.t("system.results")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.keys(suspendedCollaborations).map(key =>
                            <tr key={key}>
                                <td className="action">{I18n.t(`system.${key}`)}</td>
                                <td>
                                    {!isEmpty(suspendedCollaborations[key]) && <ul>
                                        {suspendedCollaborations[key].map(coll => <li>{coll.name}</li>)}
                                    </ul>}
                                    {isEmpty(suspendedCollaborations[key]) && <span>None</span>}
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>}
            </div>)

    }

    renderDailyCronResults = suspendedUsers => {
        return (
            <div className="results">
                {!isEmpty(suspendedUsers) && <div className="results">
                    <table className="suspended-users">
                        <thead>
                        <tr>
                            <th>{I18n.t("system.action")}</th>
                            <th>{I18n.t("system.results")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.keys(suspendedUsers).map(key =>
                            <tr key={key}>
                                <td className="action">{I18n.t(`system.${key}`)}</td>
                                <td>
                                    {!isEmpty(suspendedUsers[key]) && <ul>
                                        {suspendedUsers[key].map(email => <li key={email}>{email}</li>)}
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

    renderOutstandingRequestsResults = outstandingRequests => {
        const collaboration_requests = outstandingRequests.collaboration_requests;
        const join_requests = outstandingRequests.collaboration_join_requests;
        return (
            <div className="results">
                {!isEmpty(outstandingRequests) && <div className="results">
                    <MemberJoinRequests join_requests={join_requests} isPersonal={false} {...this.props} />
                    <MemberCollaborationRequests {...this.props} isPersonal={false}
                                                 collaboration_requests={collaboration_requests}/>
                </div>}
            </div>
        )
    }

    renderCronJobsResults = cronJobs => {
        return (
            <div className="results">
                {!isEmpty(cronJobs) && <div className="results">
                    <table className="table-counts">
                        <thead>
                        <tr>
                            <th>{I18n.t("system.jobName")}</th>
                            <th>{I18n.t("system.jobNextRun")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {cronJobs.map((job, i) => <tr key={i}>
                            <td>{job.name}</td>
                            <td>{moment(job.next_run_time * 1000).format("LLLL")}</td>
                        </tr>)}
                        </tbody>
                    </table>

                </div>}
            </div>
        )
    }

    renderCleanedRequestsResults = cleanedRequests => {
        const collaboration_requests = cleanedRequests.collaboration_requests;
        const join_requests = cleanedRequests.collaboration_join_requests;
        return (
            <div className="results">
                {!isEmpty(cleanedRequests) && <div className="results">
                    <MemberJoinRequests join_requests={join_requests} isPersonal={false}
                                        isDeleted={true} {...this.props} />
                    <MemberCollaborationRequests {...this.props} isPersonal={false} isDeleted={true}
                                                 collaboration_requests={collaboration_requests}/>
                </div>}
            </div>
        )
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
                </div>}
            </div>)
    }

    renderUserLoginResults = userLoginStats => {
        return (<div className="results">
            <table className="table-counts table-logins">
                <thead>
                <tr>
                    <th className={"type"}>{I18n.t("system.userlogins.loginType")}</th>
                    <th className={"total"}>{I18n.t("system.userlogins.total")}</th>
                    <th className={"succeeded"}>{I18n.t("system.userlogins.succeeded")}</th>
                    <th className={"failed"}>{I18n.t("system.userlogins.failed")}</th>
                </tr>
                </thead>
                <tbody>
                {userLoginStats.map((stat, i) => <tr key={i}>
                    {["login_type", "count", "succeeded", "failed"].map(col => <td className={col}>{stat[col]}</td>)}
                </tr>)}

                </tbody>
            </table>
        </div>)

    }

    tabChanged = name => {
        this.clear();
        this.setState({tab: name, busy: true}, () => {
            this.props.history.replace(`/system/${name}`);
        });
        if (name === "database") {
            dbStats().then(res => {
                this.setState({databaseStats: res, busy: false});
            });
        } else if (name === "activity") {
            const {limit, selectedTables, serverQuery} = this.state;
            auditLogsActivity(limit.value, selectedTables, serverQuery).then(res => {
                this.setState({
                    auditLogs: res,
                    filteredAuditLogs: filterAuditLogs(res, this.state.query),
                    busy: false
                });
            });
        } else if (name === "validations") {
            validations().then(res => {
                res.organisation_invitations.forEach(inv => inv.invite = true);
                this.setState({
                    validationData: res,
                    showOrganisationsWithoutAdmin: true,
                    showServicesWithoutAdmin: true,
                    busy: false
                })
            });
        } else if (name === "plsc") {
            plscSync().then(res => this.setState({plscData: res, busy: false}));
        } else if (name === "composition") {
            composition().then(res => this.setState({compositionData: res, busy: false}));
        } else if (name === "suspended-users") {
            getSuspendedUsers().then(res => this.setState({currentlySuspendedUsers: res, busy: false}));
        } else if (name === "userlogins") {
            userLoginsSummary().then(res => this.setState({userLoginStats: res, busy: false}))
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
            seedResult,
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            outstandingRequests,
            confirmationDialogQuestion,
            busy,
            tab,
            filteredAuditLogs,
            databaseStats,
            suspendedUsers,
            cleanedRequests,
            limit,
            query,
            selectedTables,
            expiredCollaborations,
            suspendedCollaborations,
            expiredMemberships,
            cronJobs,
            validationData,
            showOrganisationsWithoutAdmin,
            showServicesWithoutAdmin,
            plscData,
            compositionData,
            currentlySuspendedUsers,
            userLoginStats,
            deletedUsers,
            serverQuery,
            demoSeedResult,
            humanTestingSeedResult,
            plscView
        } = this.state;
        const {config} = this.props;

        if (busy) {
            return <SpinnerField/>
        }
        const tabs = [
            this.getValidationTab(validationData, showOrganisationsWithoutAdmin, showServicesWithoutAdmin),
            this.getCronTab(suspendedUsers, outstandingRequests, cleanedRequests, expiredCollaborations,
                suspendedCollaborations, expiredMemberships, deletedUsers, cronJobs),
            config.seed_allowed ? this.getSeedTab(seedResult, demoSeedResult, humanTestingSeedResult) : null,
            this.getDatabaseTab(databaseStats, config),
            this.getActivityTab(filteredAuditLogs, limit, query, config, selectedTables, serverQuery),
            this.getPlscTab(plscData, plscView),
            config.seed_allowed ? this.getCompositionTab(compositionData) : null,
            this.getSuspendedUsersTab(currentlySuspendedUsers),
            this.getUserLoginTab(userLoginStats),
            this.getScimTab()
        ]

        return (
            <div className="mod-system-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>
                <UnitHeader obj={({name: I18n.t("system.title"), icon: "toolbox"})}/>

                <Tabs activeTab={tab} tabChanged={this.tabChanged} busy={true}>
                    {tabs}
                </Tabs>


            </div>);
    }
}

export default System;
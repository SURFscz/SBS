import React from "react";
import "./System.scss";
import I18n from "../locale/I18n";
import JsonFormatter from 'react-json-formatter'
import {ReactComponent as ThrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import {
    activateUserForCollaboration,
    auditLogsActivity,
    cleanSlate,
    cleanupNonOpenRequests,
    clearAuditLogs,
    composition,
    dbDemoSeed,
    dbSeed,
    dbStats,
    deleteOrphanUsers,
    expireCollaborationMemberships,
    expireCollaborations,
    getResetTOTPRequestedUsers,
    getRateLimitedUsers,
    resetRateLimitedUser,
    getSuspendedUsers,
    health,
    invitationExpirations,
    invitationReminders,
    openRequests,
    outstandingRequests,
    parseMetaData,
    plscSync,
    reset2faOther,
    scheduledJobs,
    suspendCollaborations,
    suspendUsers,
    sweepAllServices,
    userLoginsSummary,
    validations
} from "../api";
import ReactJson from "react-json-view";
import Button from "../components/button/Button";
import {isEmpty} from "../utils/Utils";
import UnitHeader from "../components/_redesign/UnitHeader";
import ConfirmationDialog from "../components/ConfirmationDialog";
import SpinnerField from "../components/_redesign/SpinnerField";
import {AppStore} from "../stores/AppStore";
import Tabs from "../components/Tabs";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Activity from "../components/activity/Activity";
import Select from "react-select";
import MemberJoinRequests from "../components/_redesign/MemberJoinRequests";
import MemberCollaborationRequests from "../components/_redesign/MemberCollaborationRequests";
import {logout} from "../utils/Login";
import {filterAuditLogs} from "../utils/AuditLog";
import SelectField from "../components/SelectField";
import moment from "moment";
import OrganisationInvitations from "../components/_redesign/OrganisationInvitations";
import OrganisationsWithoutAdmin from "../components/_redesign/OrganisationsWithoutAdmin";
import ServicesWithoutAdmin from "../components/_redesign/ServicesWithoutAdmin";
import {dateFromEpoch} from "../utils/Date";
import DOMPurify from "dompurify";
import Scim from "./Scim";
import CheckBox from "../components/checkbox/CheckBox";
import ClipBoardCopy from "../components/_redesign/ClipBoardCopy";
import Stats from "./Stats";
import PAM from "./PAM";
import ProxyLogin from "./ProxyLogin";
import SyncApplications from "./SyncApplications";

const options = [25, 50, 100, 150, 200, 250, 500].map(nbr => ({value: nbr, label: nbr}));

const jsonStyle = {
    propertyStyle: {color: "black"},
    stringStyle: {color: "green"},
    numberStyle: {color: 'darkorange'}
}

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
            invitationReminders: [],
            invitationExpirations: [],
            deletedUsers: {},
            expiredMemberships: {},
            outstandingRequests: {},
            openRequests: {},
            parsedMetaData: {},
            parsedMetaDataView: false,
            cleanedRequests: {},
            databaseStats: [],
            userLoginStats: [],
            cronJobs: [],
            sweepResults: null,
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
            currentlySuspendedUsers: [],
            resetTOTPRequestedUsers: [],
            rateLimitedUsers: []
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
            invitationReminders: [],
            invitationExpirations: [],
            outstandingRequests: {},
            openRequests: {},
            parsedMetaData: {},
            cleanedRequests: {},
            databaseStats: [],
            cronJobs: [],
            sweepResults: null,
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

    getCronTab = (suspendedUsers, outstandingRequests, openRequests, cleanedRequests, expiredCollaborations, suspendedCollaborations,
                  expiredMemberships, invitationReminders, invitationExpirations, deletedUsers, sweepResults, cronJobs, parsedMetaData, parsedMetaDataView) => {
        return (<div key="cron" name="cron" label={I18n.t("home.tabs.cron")}>
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
                    {this.renderInvitationReminders()}
                    {this.renderInvitationRemindersResults(invitationReminders)}
                    {this.renderInvitationExpirations()}
                    {this.renderInvitationExpirationsResults(invitationExpirations)}
                    {this.renderOrphanUsers()}
                    {this.renderOrphanUsersResults(deletedUsers)}
                    {this.renderOutstandingRequests()}
                    {this.renderOutstandingRequestsResults(outstandingRequests)}
                    {this.renderOpenRequests()}
                    {this.renderOpenRequestsResults(openRequests)}
                    {this.renderCleanedRequests()}
                    {this.renderCleanedRequestsResults(cleanedRequests)}
                    {this.renderParsedMetaData()}
                    {this.renderParsedMetaDataResults(parsedMetaData, parsedMetaDataView)}
                    {this.renderSweep()}
                    {this.renderSweepResults(sweepResults)}
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
            <div key="activity" name="activity" label={I18n.t("home.tabs.activity")}>
                <div className="mod-system">
                    <section className={"info-block-container"}>
                        <section className="search-activity">
                            <span>{I18n.t("system.activity", {count: filteredAuditLogs.audit_logs.length})}</span>
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
                        <Activity auditLogs={filteredAuditLogs} collectionName={"all"} user={this.props.user}/>
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
        const plscJson = JSON.stringify(plscData);
        return (<div key="plsc" name="plsc" label={I18n.t("home.tabs.plsc")}>
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
        return (<div key="composition" name="composition" label={I18n.t("home.tabs.composition")}>
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
        return (<div key="validations" name="validations" label={I18n.t("home.tabs.validation")}>
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
        return (<div key="database" name="database" label={I18n.t("home.tabs.database")}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDbStats()}
                    {this.renderDbStatsResults(databaseStats)}
                </section>
                {config.seed_allowed && <div className={"delete-all"}>
                    <Button warningButton={true}
                            icon={<ThrashIcon/>}
                            onClick={() => this.doCleanSlate(true)}/>
                </div>}
            </div>
        </div>)
    }

    getUserLoginTab = userLoginStats => {
        return (<div key="userlogins" name="userlogins" label={I18n.t("home.tabs.userlogins")}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderUserLoginStats()}
                    {this.renderUserLoginResults(userLoginStats)}
                </section>
            </div>
        </div>)
    }

    getScimTab = () => {
        return (<div key="scim" name="scim" label={I18n.t("home.tabs.scim")}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    <Scim {...this.props}/>
                </section>
            </div>
        </div>)
    }

    getStatsTab = () => {
        return (<div key="stats" name="stats" label={I18n.t("home.tabs.stats")}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    <Stats {...this.props}/>
                </section>
            </div>
        </div>)
    }

    getPamTab = () => {
        return (<div key="pam" name="pam" label={I18n.t("home.tabs.pam")}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    <PAM {...this.props}/>
                </section>
            </div>
        </div>)
    }

    getProxyTab = () => {
        return (
            <div key="proxy" name="proxy" label={I18n.t("home.tabs.proxy")}>
                <div className="mod-system">
                    <section className={"info-block-container"}>
                        <ProxyLogin {...this.props}/>
                    </section>
                </div>
            </div>
        );
    }

    getSyncApplicationsTab = () => {
        return (
            <div key="sync" name="sync" label={I18n.t("home.tabs.sync")}>
                <div className="mod-system">
                    <section className={"info-block-container"}>
                        <SyncApplications {...this.props}/>
                    </section>
                </div>
            </div>
        );
    }

    activateUser = user => {
        this.setState({busy: true});
        activateUserForCollaboration(null, user.id).then(() => {
            getSuspendedUsers().then(res => this.setState({currentlySuspendedUsers: res, busy: false}))
        })
    }

    resetUser = user => {
        this.setState({busy: true});
        reset2faOther(user.id).then(() => {
            getResetTOTPRequestedUsers().then(res => this.setState({resetTOTPRequestedUsers: res, busy: false}))
        })
    }

    doResetRateLimitUser = user => {
        this.setState({busy: true});
        resetRateLimitedUser(user.id).then(() => {
            getRateLimitedUsers().then(res => this.setState({rateLimitedUsers: res, busy: false}))
        })
    }

    getSuspendedUsersTab = (currentlySuspendedUsers, resetTOTPRequestedUsers, rateLimitedUsers) => {
        const zeroState = currentlySuspendedUsers.length === 0;
        return (
            <div key="suspended-users"
                     name="suspended-users"
                     label={I18n.t("home.tabs.suspendedUsers")}>
            <div className="mod-system  sds--table">
                <section className={"info-block-container"}>
                    <p className={"title"}>{I18n.t(`system.suspendedUsers.${zeroState ? "titleZeroState" : "title"}`)}</p>
                    {!zeroState &&
                        <table className={"suspended-users"}>
                            <thead>
                            <tr>
                                <th className={"name"}>{I18n.t("system.suspendedUsers.name")}</th>
                                <th className={"email"}>{I18n.t("system.suspendedUsers.email")}</th>
                                <th className={"lastLogin"}>{I18n.t("system.suspendedUsers.lastLogin")}</th>
                                <th className={"actions"}></th>
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
                <section className={"info-block-container"}>
                    <p className={"title"}>{I18n.t(`system.resetTOTPRequestedUsers.${resetTOTPRequestedUsers.length === 0 ? "titleZeroState" : "title"}`)}</p>
                    {resetTOTPRequestedUsers.length !== 0 &&
                        <table className={"suspended-users"}>
                            <thead>
                            <tr>
                                <th className={"name"}>{I18n.t("system.suspendedUsers.name")}</th>
                                <th className={"email"}>{I18n.t("system.suspendedUsers.email")}</th>
                                <th className={"lastLogin"}>{I18n.t("system.suspendedUsers.lastLogin")}</th>
                                <th className={"actions"}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {resetTOTPRequestedUsers.map(user => <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.last_login_date ? dateFromEpoch(user.last_login_date) : "-"}</td>
                                <td>
                                    {<Button txt={I18n.t("system.resetTOTPRequestedUsers.reset")}
                                             onClick={() => this.resetUser(user)}/>}
                                </td>
                            </tr>)}
                            </tbody>
                        </table>}
                </section>
                <section className={"info-block-container"}>
                    <p className={"title"}>{I18n.t(`system.rateLimitedUsers.${rateLimitedUsers.length === 0 ? "titleZeroState" : "title"}`)}</p>
                    {rateLimitedUsers.length !== 0 &&
                        <table className={"suspended-users"}>
                            <thead>
                            <tr>
                                <th className={"name"}>{I18n.t("system.suspendedUsers.name")}</th>
                                <th className={"email"}>{I18n.t("system.suspendedUsers.email")}</th>
                                <th className={"lastLogin"}>{I18n.t("system.suspendedUsers.lastLogin")}</th>
                                <th className={"actions"}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {rateLimitedUsers.map(user => <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.last_login_date ? dateFromEpoch(user.last_login_date) : "-"}</td>
                                <td>
                                    {<Button txt={I18n.t("system.rateLimitedUsers.reset")}
                                             onClick={() => this.doResetRateLimitUser(user)}/>}
                                </td>
                            </tr>)}
                            </tbody>
                        </table>}
                </section>
            </div>
        </div>)
    }

    getSeedTab = (seedResult, demoSeedResult) => {
        return (<div key="seed" name="seed" label={I18n.t("home.tabs.seed")}>
            <div className="mod-system">
                <section className={"info-block-container"}>
                    {this.renderDbSeed()}
                    <p className="result">{seedResult}</p>
                </section>
                <section className={"info-block-container"}>
                    {this.renderDbDemoSeed()}
                    <p className="result">{demoSeedResult}</p>
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

    doInvitationReminders = () => {
        this.setState({busy: true})
        invitationReminders().then(res => {
            this.setState({invitationReminders: res, busy: false});
        });
    }

    doInvitationExpirations = () => {
        this.setState({busy: true})
        invitationExpirations().then(res => {
            this.setState({invitationExpirations: res, busy: false});
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

    doOpenRequests = () => {
        this.setState({busy: true})
        openRequests().then(res => {
            this.setState({openRequests: res, busy: false});
        });
    }

    doCleanupNonOpenRequests = () => {
        this.setState({busy: true})
        cleanupNonOpenRequests().then(res => {
            this.setState({cleanedRequests: res, busy: false});
        });
    }

    doParseMetaData = () => {
        this.setState({busy: true})
        parseMetaData().then(res => {
            this.setState({parsedMetaData: res, busy: false});
        });
    }

    doRunSweep = () => {
        this.setState({busy: true})
        sweepAllServices().then(res => {
            this.setState({sweepResults: res, busy: false});
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
                    seedResult: I18n.t("system.seedResult", {
                        seed: "Test",
                        ms: new Date().getMilliseconds() - d.getMilliseconds()
                    })
                }, () => window.location.reload());
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
                    demoSeedResult: I18n.t("system.seedResult", {
                        seed: "Demo",
                        ms: new Date().getMilliseconds() - d.getMilliseconds()
                    })
                }, () => window.location.reload());
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

    renderInvitationReminders = () => {
        const {invitationReminders} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runInvitationReminders")}</p>
                <div className="actions">
                    {isEmpty(invitationReminders) && <Button txt={I18n.t("system.runDailyJobs")}
                                                             onClick={this.doInvitationReminders}/>}
                    {!isEmpty(invitationReminders) && <Button txt={I18n.t("system.clear")}
                                                              onClick={this.clear} cancelButton={true}/>}
                </div>
            </div>
        );
    }

    renderInvitationExpirations = () => {
        const {invitationExpirations} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runInvitationExpirations")}</p>
                <div className="actions">
                    {isEmpty(invitationExpirations) && <Button txt={I18n.t("system.runDailyJobs")}
                                                               onClick={this.doInvitationExpirations}/>}
                    {!isEmpty(invitationExpirations) && <Button txt={I18n.t("system.clear")}
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

    renderOpenRequests = () => {
        const {openRequests} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runOpenRequestsInfo")}</p>
                <div className="actions">
                    {isEmpty(openRequests) && <Button txt={I18n.t("system.runOutdatedRequests")}
                                                      onClick={this.doOpenRequests}/>}
                    {!isEmpty(openRequests) && <Button txt={I18n.t("system.clear")}
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

    renderSweep = () => {
        const {sweepResults} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.runSweepResults")}</p>
                <div className="actions">
                    {isEmpty(sweepResults) && <Button txt={I18n.t("system.runSweep")}
                                                      onClick={this.doRunSweep}/>}
                    {!isEmpty(sweepResults) && <Button txt={I18n.t("system.clear")}
                                                       onClick={this.clear}
                                                       cancelButton={true}/>}
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

    renderParsedMetaData = () => {
        const {parsedMetaData} = this.state;
        return (
            <div className="info-block">
                <p>{I18n.t("system.showParsedMetaDataInfo")}</p>
                <div className="actions">
                    {isEmpty(parsedMetaData) && <Button txt={I18n.t("system.parseMetaData")}
                                                        onClick={this.doParseMetaData}/>}
                    {!isEmpty(parsedMetaData) && <Button txt={I18n.t("system.clear")}
                                                         onClick={this.clear}
                                                         cancelButton={true}/>}
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
                                        {expiredCollaborations[key].map((coll, index) => <li
                                            key={index}>{coll.name}</li>)}
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

    renderInvitationRemindersResults = invitationReminders => {
        return (
            <div className="results">
                {!isEmpty(invitationReminders) && <div className="results">
                    <table className="expired-memberships">
                        <thead>
                        <tr>
                            <th className="invitation-reminders">{I18n.t("system.invitationReminders.invitations")}</th>
                            <th className="invitation-reminders">{I18n.t("system.invitationReminders.organisationInvitations")}</th>
                            <th className="invitation-reminders">{I18n.t("system.invitationReminders.serviceInvitations")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td className="action">
                                <div className="invitation_reminders">
                                    {invitationReminders.invitations.map(email => <span>{email}</span>)}
                                </div>
                            </td>
                            <td className="action">
                                <div className="invitation_reminders">
                                    {invitationReminders.organisation_invitations.map(email => <span>{email}</span>)}
                                </div>
                            </td>
                            <td className="action">
                                <div className="invitation_reminders">
                                    {invitationReminders.service_invitations.map(email => <span>{email}</span>)}
                                </div>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>}
            </div>)
    }

    renderInvitationExpirationsResults = invitationExpirations => {
        return (
            <div className="results">
                {!isEmpty(invitationExpirations) && <div className="results">
                    <table className="expired-memberships">
                        <thead>
                        <tr>
                            <th className="invitation-expirations">{I18n.t("system.invitationExpirations.invitations")}</th>
                            <th className="invitation-expirations">{I18n.t("system.invitationExpirations.apiInvitations")}</th>
                            <th className="invitation-expirations">{I18n.t("system.invitationExpirations.organisationInvitations")}</th>
                            <th className="invitation-expirations">{I18n.t("system.invitationExpirations.serviceInvitations")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td className="action">
                                <div className="invitation_expirations">
                                    {invitationExpirations.invitations.map(email => <span>{email}</span>)}
                                </div>
                            </td>
                            <td className="action">
                                <div className="invitation_expirations">
                                    {invitationExpirations.api_invitations.map(email => <span>{email}</span>)}
                                </div>
                            </td>
                            <td className="action">
                                <div className="invitation_expirations">
                                    {invitationExpirations.organisation_invitations.map(email => <span>{email}</span>)}
                                </div>
                            </td>
                            <td className="action">
                                <div className="invitation_expirations">
                                    {invitationExpirations.service_invitations.map(email => <span>{email}</span>)}
                                </div>
                            </td>
                        </tr>
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

    renderOpenRequestsResults = openRequests => {
        return (
            <div className="results">
                {!isEmpty(openRequests) && <div className="results">
                    <table className="open-requests">
                        <thead>
                        <tr>
                            <th className="recipient">{I18n.t("system.openRequests.recipient")}</th>
                            <th className="service_requests">{I18n.t("system.openRequests.service_requests")}</th>
                            <th className="service_connection_requests">{I18n.t("system.openRequests.service_connection_requests")}</th>
                            <th className="join_requests">{I18n.t("system.openRequests.join_requests")}</th>
                            <th className="collaboration_requests">{I18n.t("system.openRequests.collaboration_requests")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.keys(openRequests).map((recipient, index) =>
                            <tr key={index}>
                                <td>{recipient}</td>
                                <td>{openRequests[recipient].service_requests.map((sr, i) =>
                                    <div key={i} className={"open-requests"}>
                                        <span>{I18n.t("system.openRequests.service_name")}: {sr.name}</span>
                                        <span>{I18n.t("system.openRequests.requester")}: {sr.requester}</span>
                                    </div>
                                )}</td>
                                <td>{openRequests[recipient].service_connection_requests.map((scr, i) =>
                                    <div key={i} className={"open-requests"}>
                                        <span>{I18n.t("system.openRequests.organisation_name")}: {scr.organisation}</span>
                                        <span>{I18n.t("system.openRequests.service_name")}: {scr.service}</span>
                                        <span>{I18n.t("system.openRequests.requester")}: {scr.requester}</span>
                                    </div>
                                )}</td>
                                <td>{openRequests[recipient].join_requests.map((jr, i) =>
                                    <div key={i} className={"open-requests"}>
                                        <span>{I18n.t("system.openRequests.collaboration_name")}: {jr.name}</span>
                                        <span>{I18n.t("system.openRequests.requester")}: {jr.requester}</span>
                                    </div>
                                )}</td>
                                <td>{openRequests[recipient].collaboration_requests.map((cr, i) =>
                                    <div key={i} className={"open-requests"}>
                                        <span>{I18n.t("system.openRequests.collaboration_name")}: {cr.name}</span>
                                        <span>{I18n.t("system.openRequests.requester")}: {cr.requester}</span>
                                        <span>{I18n.t("units.column")}: {cr.units}</span>
                                    </div>
                                )}</td>
                            </tr>
                        )}
                        </tbody>
                    </table>

                </div>}
            </div>
        )
    }

    renderSweepResults = sweepResults => {
        const sweepJson = JSON.stringify(sweepResults);
        return (
            <div>
                {!isEmpty(sweepResults) &&
                    <JsonFormatter json={sweepJson} tabWith={4} jsonStyle={jsonStyle}/>}
            </div>
        );
    }

    renderParsedMetaDataResults = (parsedMetaData, parsedMetaDataView) => {
        if (isEmpty(parsedMetaData)) {
            return null;
        }
        const parsedMetaDataJson = JSON.stringify(parsedMetaData);
        return (
            <div className="results">
                <div className={"toggle-json"}>
                    <CheckBox name={"toggle-json"}
                              value={parsedMetaDataView}
                              info={I18n.t("system.toggleJson")}
                              onChange={() => this.setState({parsedMetaDataView: !parsedMetaDataView})}/>
                    <ClipBoardCopy txt={parsedMetaDataJson}/>
                </div>
                {parsedMetaDataView &&
                    <ReactJson src={parsedMetaData} collapsed={1}/>}
                {!parsedMetaDataView &&
                    <JsonFormatter json={parsedMetaDataJson} tabWith={4} jsonStyle={jsonStyle}/>}
            </div>
        );
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
            Promise.all([getSuspendedUsers(), getResetTOTPRequestedUsers(), getRateLimitedUsers()])
                .then(res => this.setState({
                    currentlySuspendedUsers: res[0],
                    resetTOTPRequestedUsers: res[1],
                    rateLimitedUsers: res[2],
                    busy: false
                }));
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
            openRequests,
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
            invitationReminders,
            invitationExpirations,
            sweepResults,
            cronJobs,
            parsedMetaData,
            parsedMetaDataView,
            validationData,
            showOrganisationsWithoutAdmin,
            showServicesWithoutAdmin,
            plscData,
            compositionData,
            currentlySuspendedUsers,
            rateLimitedUsers,
            resetTOTPRequestedUsers,
            userLoginStats,
            deletedUsers,
            serverQuery,
            demoSeedResult,
            plscView
        } = this.state;
        const {config} = this.props;

        if (busy) {
            return <SpinnerField/>
        }
        const tabs = [
            this.getValidationTab(validationData, showOrganisationsWithoutAdmin, showServicesWithoutAdmin),
            this.getCronTab(suspendedUsers, outstandingRequests, openRequests, cleanedRequests, expiredCollaborations,
                suspendedCollaborations, expiredMemberships, invitationReminders, invitationExpirations, deletedUsers, sweepResults, cronJobs, parsedMetaData, parsedMetaDataView),
            config.seed_allowed ? this.getSeedTab(seedResult, demoSeedResult) : null,
            this.getDatabaseTab(databaseStats, config),
            this.getActivityTab(filteredAuditLogs, limit, query, config, selectedTables, serverQuery),
            this.getPlscTab(plscData, plscView),
            config.seed_allowed ? this.getCompositionTab(compositionData) : null,
            this.getSuspendedUsersTab(currentlySuspendedUsers, resetTOTPRequestedUsers, rateLimitedUsers),
            this.getUserLoginTab(userLoginStats),
            this.getScimTab(),
            this.getStatsTab(),
            this.getPamTab(),
            this.getProxyTab(),
            this.getSyncApplicationsTab()
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

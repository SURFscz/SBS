import React from "react";
import {
    allServiceConnectionRequests,
    deleteServiceMembership,
    resetLdapPassword,
    resetTokenValue,
    searchOrganisations,
    serviceAupDelete,
    serviceById,
    serviceInvitationAccept,
    serviceInvitationByHash
} from "../api";
import "./ServiceDetail.scss";
import I18n from "i18n-js";
import Tabs from "../components/Tabs";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as DetailsIcon} from "../icons/services.svg";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {ReactComponent as RefreshIcon} from "../icons/common-file-text-refresh.svg";
import {ReactComponent as ServiceConnectionRequestsIcon} from "../icons/connections.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as UserAdminIcon} from "../icons/users.svg";

import Collaborations from "../components/redesign/Collaborations";
import ServiceOrganisations from "../components/redesign/ServiceOrganisations";
import SpinnerField from "../components/redesign/SpinnerField";
import {isEmpty, removeDuplicates} from "../utils/Utils";
import {actionMenuUserRole, isUserServiceAdmin} from "../utils/UserRole";
import ServiceConnectionRequests from "../components/redesign/ServiceConnectionRequests";
import {ReactComponent as GroupsIcon} from "../icons/ticket-group.svg";
import ServiceGroups from "../components/redesign/ServiceGroups";
import ServiceAdmins from "../components/redesign/ServiceAdmins";
import {setFlash} from "../utils/Flash";
import ServiceWelcomeDialog from "../components/ServiceWelcomeDialog";
import ConfirmationDialog from "../components/ConfirmationDialog";
import InputField from "../components/InputField";
import {ReactComponent as LeaveIcon} from "../icons/safety-exit-door-left.svg";
import LastAdminWarning from "../components/redesign/LastAdminWarning";
import ServiceOverview from "./ServiceOverview";

class ServiceDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            invitation: null,
            isInvitation: false,
            organisations: [],
            serviceConnectionRequests: [],
            firstTime: false,
            loading: true,
            tab: "details",
            tabs: [],
            confirmationDialogOpen: false,
            cancelDialogAction: null,
            confirmationDialogAction: null,
            confirmationTxt: null,
            confirmationHeader: null,
            isWarning: false,
            ldapPassword: null,
            tokenValue: null,
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.hash) {
            serviceInvitationByHash(params.hash).then(res => {
                this.setState({
                    invitation: res,
                    service: res.service,
                    loading: false,
                    firstTime: true,
                    isInvitation: true,
                    tabs: [this.getAdminsTab(res.service)]
                });
            }).catch(() => this.props.history.push("/404"));

        } else if (params.id) {
            const {user} = this.props;
            const userServiceAdmin = isUserServiceAdmin(user, {id: parseInt(params.id, 10)}) || user.admin;
            if (userServiceAdmin) {
                Promise.all([serviceById(params.id), searchOrganisations("*"),
                    allServiceConnectionRequests(params.id)])
                    .then(res => {
                        const service = res[0];
                        const organisations = res[1];
                        const serviceConnectionRequests = res[2];
                        const tabs = [
                            this.getDetailsTab(service, user.admin, userServiceAdmin),
                            this.getOrganisationsTab(service, organisations, user.admin, userServiceAdmin),
                            this.getCollaborationsTab(service, user.admin, userServiceAdmin),
                            this.getAdminsTab(service),
                        ];
                        if (user.admin) {
                            tabs.push(this.getServiceGroupsTab(service))
                        }
                        if (serviceConnectionRequests.length > 0) {
                            tabs.push(this.getServiceConnectionRequestTab(service, serviceConnectionRequests));
                        }
                        this.afterFetch(params, service, organisations, serviceConnectionRequests, tabs);
                    }).catch(e => this.props.history.push("/404"));
            } else {
                serviceById(params.id)
                    .then(res => {
                        const tabs = [];
                        this.afterFetch(params, res, [], [], tabs);
                    }).catch(e => this.props.history.push("/404"));
            }
        } else {
            this.props.history.push("/404");
        }
    };

    doTokenResetAction = () => {
        const {service} = this.state;
        resetTokenValue(service).then(res => {
            this.setState({
                confirmationTxt: I18n.t("userTokens.reset.close"),
                confirmationHeader: I18n.t("userTokens.reset.copy"),
                cancelDialogAction: null,
                lastAdminWarning: false,
                confirmationDialogQuestion: I18n.t("userTokens.reset.info"),
                tokenValue: res.token_value,
                confirmationDialogAction: this.doCancelDialogAction
            });
        })
    }

    doLdapResetAction = () => {
        const {service} = this.state;
        resetLdapPassword(service).then(res => {
            this.setState({
                confirmationTxt: I18n.t("service.ldap.close"),
                confirmationHeader: I18n.t("service.ldap.copy"),
                cancelDialogAction: null,
                lastAdminWarning: false,
                confirmationDialogQuestion: I18n.t("service.ldap.info"),
                ldapPassword: res.ldap_password,
                confirmationDialogAction: this.doCancelDialogAction
            });
        })
    }

    doCancelDialogAction = () => {
        this.setState({confirmationDialogOpen: false},
            () => setTimeout(() => this.setState({ldapPassword: null, tokenValue: null}), 75)
        );
    }

    resetAups = () => {
        this.doCancelDialogAction();
        const {service} = this.state;
        this.setState({loading: true});
        serviceAupDelete(service).then(() => {
            this.setState({loading: false});
            setFlash(I18n.t("service.aup.flash", {name: service.name}));
        })
    }

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    afterFetch = (params, service, organisations, serviceConnectionRequests, tabs) => {
        const tab = params.tab || this.state.tab;
        this.tabChanged(tab, service);
        this.setState({
            service: service,
            organisations: organisations,
            serviceConnectionRequests: serviceConnectionRequests,
            tab: tab,
            tabs: tabs,
            loading: false
        });
    }

    updateBreadCrumb(service) {
        const currentService = service || this.state.service;
        AppStore.update(s => {
            s.breadcrumb.paths = [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {
                    path: `/services/${currentService.id}`,
                    value: I18n.t("breadcrumb.service", {name: currentService.name})
                },
            ];
        });
    }

    doAcceptInvitation = () => {
        const {invitation, isInvitation} = this.state;
        if (isInvitation) {
            serviceInvitationAccept(invitation).then(() => {
                this.props.refreshUser(() => {
                    const path = encodeURIComponent(`/services/${invitation.service_id}`);
                    this.props.history.push(`/refresh-route/${path}`);
                });
            }).catch(e => {
                if (e.response && e.response.json) {
                    e.response.json().then(res => {
                        if (res.message && res.message.indexOf("already a member") > -1) {
                            this.setState({errorOccurred: true, firstTime: false}, () =>
                                setFlash(I18n.t("organisationInvitation.flash.alreadyMember"), "error"));
                        }
                    });
                } else {
                    throw e;
                }
            });
        } else {
            this.setState({firstTime: false});
        }
    }

    refresh = callback => {
        const params = this.props.match.params;
        const {organisations} = this.state;
        this.setState({loading: true});
        const {user} = this.props;
        const userServiceAdmin = isUserServiceAdmin(user, {id: parseInt(params.id, 10)}) || user.admin;
        Promise.all([serviceById(params.id), allServiceConnectionRequests(params.id)])
            .then(res => {
                const service = res[0];
                const serviceConnectionRequests = res[1];
                const tabs = [
                    this.getDetailsTab(service, user.admin, userServiceAdmin),
                    this.getOrganisationsTab(service, organisations, user.admin, userServiceAdmin),
                    this.getCollaborationsTab(service, user.admin, userServiceAdmin),
                    this.getAdminsTab(service)
                ];
                if (user.admin) {
                    tabs.push(this.getServiceGroupsTab(service))
                }
                if (serviceConnectionRequests.length > 0) {
                    tabs.push(this.getServiceConnectionRequestTab(service, serviceConnectionRequests));
                }
                this.setState({
                    service: service,
                    serviceConnectionRequests: serviceConnectionRequests,
                    tabs: tabs,
                    loading: false
                }, callback);
            }).catch(e => {
            this.props.history.push("/404")
        });
    };

    getDetailsTab = (service, userAdmin, serviceAdmin) => {
        return (<div key="details" name="details"
                     label={I18n.t("home.tabs.details")}
                     icon={<DetailsIcon/>}>
            <ServiceOverview {...this.props}
                             refresh={this.refresh}
                             service={service}
                             userAdmin={userAdmin}
                             serviceAdmin={serviceAdmin}/>
        </div>)
    }

    getOrganisationsTab = (service, organisations, userAdmin, serviceAdmin) => {
        return (<div key="organisations" name="organisations"
                     label={I18n.t("home.tabs.serviceOrganisations", {count: organisations.length})}
                     icon={<OrganisationsIcon/>}>
            <ServiceOrganisations {...this.props}
                                  refresh={this.refresh}
                                  service={service}
                                  organisations={organisations}
                                  userAdmin={userAdmin}
                                  serviceAdmin={serviceAdmin}/>
        </div>)
    }

    getAdminsTab = service => {
        const openInvitations = (service.service_invitations || []).length;
        return (<div key="admins" name="admins"
                     label={I18n.t("home.tabs.serviceAdmins", {count: service.service_memberships.length})}
                     icon={<UserAdminIcon/>}
                     notifier={openInvitations > 0 ? openInvitations : null}>
            <ServiceAdmins {...this.props} service={service}
                           refresh={this.refresh}/>
        </div>)
    }

    getTokenTab = (service, user) => {
        const openInvitations = (service.service_invitations || []).length;
        return (<div key="admins" name="admins"
                     label={I18n.t("home.tabs.serviceAdmins", {count: service.service_memberships.length})}
                     icon={<UserAdminIcon/>}
                     notifier={openInvitations > 0 ? openInvitations : null}>
            <ServiceAdmins {...this.props} service={service}
                           refresh={this.refresh}/>
        </div>)
    }

    getServiceGroupsTab = (service) => {
        return (<div key="groups" name="groups"
                     label={I18n.t("home.tabs.groups", {count: service.service_groups.length})}
                     icon={<GroupsIcon/>}>
            {<ServiceGroups {...this.props} service={service}
                            refresh={this.refresh}/>}
        </div>)
    }

    getCollaborationsTab = (service, userAdmin, userServiceAdmin) => {
        const collaborations = service.collaborations;
        collaborations.forEach(coll => coll.fromCollaboration = true);
        const collFromOrganisations = service.service_organisation_collaborations;
        collFromOrganisations.forEach(coll => coll.fromCollaboration = false);
        const colls = removeDuplicates(collaborations.concat(collFromOrganisations), "id");
        return (
            <div key="collaborations" name="collaborations"
                 label={I18n.t("home.tabs.serviceCollaborations", {count: colls.length})}
                 icon={<CollaborationsIcon/>}>
                <Collaborations mayCreate={false}
                                showOrigin={true}
                                service={service}
                                collaborations={colls}
                                userServiceAdmin={userServiceAdmin}
                                userAdmin={userAdmin}
                                showTagFilter={false}
                                refresh={this.refresh}
                                modelName={"serviceCollaborations"}
                                {...this.props} />
            </div>);
    }

    getServiceConnectionRequestTab = (service, serviceConnectionRequests) => {
        const nbr = (serviceConnectionRequests || []).length;
        return (
            <div key="serviceConnectionRequests" name="serviceConnectionRequests"
                 label={I18n.t("home.tabs.serviceConnectionRequests", {count: serviceConnectionRequests.length})}
                 icon={<ServiceConnectionRequestsIcon/>}
                 notifier={nbr > 0 ? nbr : null}>
                <ServiceConnectionRequests
                    service={service}
                    refresh={this.refresh}
                    serviceConnectionRequests={serviceConnectionRequests}
                    modelName={"serviceConnectionRequests"}
                    {...this.props} />
            </div>);

    }

    tabChanged = (name, service) => {
        const serviceId = service ? service.id : this.state.service.id;
        this.updateBreadCrumb(service);
        this.setState({tab: name}, () =>
            this.props.history.replace(`/services/${serviceId}/${name}`));
    }

    compliancy = service => {
        const compliancies = [];
        if (service.sirtfi_compliant) {
            compliancies.push("Sirtfi")
        }
        if (service.code_of_conduct_compliant) {
            compliancies.push("CoCo")
        }
        if (service.research_scholarship_compliant) {
            compliancies.push("R&S")
        }
        if (compliancies.length === 0) {
            return null;
        }
        let compliant = compliancies.join(` ${I18n.t("service.compliancySeparator")} `);
        if (compliancies.length > 2) {
            const upToLast = compliancies.slice(0, compliancies.length - 1).join(", ");
            compliant = `${upToLast} ${I18n.t("service.compliancySeparator")} ${compliancies[compliancies.length - 1]}`
        }
        return I18n.t("service.compliancyLong", {compliant: compliant});
    }

    doDeleteMe = () => {
        this.setState({confirmationDialogOpen: false, loading: true});
        const {user} = this.props;
        const {service} = this.state;
        deleteServiceMembership(service.id, user.id)
            .then(() => {
                this.props.refreshUser(() => {
                    this.setState({confirmationDialogOpen: false, loading: false});
                    setFlash(I18n.t("organisationDetail.flash.memberDeleted", {name: user.name}));
                    if (user.admin) {
                        this.componentDidMount();
                    } else {
                        this.props.history.push("/home");
                    }
                });
            });
    };

    deleteMe = () => {
        const {user} = this.props;
        const {service} = this.state;
        const admins = service.service_memberships.filter(m => m.role === "admin");
        const lastAdminWarning = admins.length === 1 && admins[0].user_id === user.id;
        this.setState({
            confirmationDialogOpen: true,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            confirmationHeader: I18n.t("confirmationDialog.title"),
            lastAdminWarning: lastAdminWarning,
            confirmationDialogQuestion: I18n.t("service.confirmation.leave"),
            tokenValue: null,
            isWarning: true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationDialogAction: this.doDeleteMe
        });
    };

    getActions = (user, service) => {
        const actions = [];
        const serviceAdmin = isUserServiceAdmin(user, service);
        const pmDecision = true;
        if (user.admin || serviceAdmin) {
            // actions.push({
            //     icon: "pencil-alt",
            //     name: I18n.t("home.edit"),
            //     perform: () => this.props.history.push("/edit-service/" + service.id)
            // });
            if (pmDecision) {
                actions.push({
                    icon: "key",
                    name: I18n.t("service.ldap.title"),
                    perform: () => {
                        this.setState({
                            ldapPassword: null,
                            tokenValue: null,
                            confirmationDialogOpen: true,
                            cancelDialogAction: this.doCancelDialogAction,
                            confirmationDialogAction: this.doLdapResetAction,
                            isWarning: false,
                            lastAdminWarning: false,
                            confirmationHeader: I18n.t("confirmationDialog.title"),
                            confirmationDialogQuestion: I18n.t("service.ldap.confirmation", {name: service.name}),
                            confirmationTxt: I18n.t("confirmationDialog.confirm"),
                        });
                    }
                });
            }
            if (pmDecision) {
                actions.push({
                    svg: RefreshIcon,
                    name: I18n.t("service.aup.title"),
                    perform: () => {
                        this.setState({
                            ldapPassword: null,
                            tokenValue: null,
                            confirmationDialogOpen: true,
                            cancelDialogAction: this.doCancelDialogAction,
                            isWarning: true,
                            confirmationDialogAction: this.resetAups,
                            confirmationHeader: I18n.t("confirmationDialog.title"),
                            lastAdminWarning: false,
                            confirmationDialogQuestion: I18n.t("service.aup.confirmation", {name: service.name}),
                            confirmationTxt: I18n.t("confirmationDialog.confirm"),
                        });
                    }
                });
            }
            if (pmDecision && (service.token_enabled || service.pam_web_sso_enabled)) {
                actions.push({
                    icon: "unlock",
                    name: I18n.t("userTokens.actionTitle"),
                    perform: () => {
                        this.setState({
                            tokenValue: null,
                            confirmationDialogOpen: true,
                            cancelDialogAction: this.doCancelDialogAction,
                            isWarning: false,
                            confirmationDialogAction: this.doTokenResetAction,
                            confirmationHeader: I18n.t("confirmationDialog.title"),
                            lastAdminWarning: false,
                            confirmationDialogQuestion: I18n.t("userTokens.reset.confirmation", {name: service.name}),
                            confirmationTxt: I18n.t("confirmationDialog.confirm"),
                        });
                    }
                });
            }
            if (serviceAdmin)
                actions.push({
                    svg: LeaveIcon,
                    name: I18n.t("service.leave"),
                    perform: this.deleteMe
                });

        }
        return actions;
    }

    renderLdapPassword = ldapPassword => {
        return (
            <div className="ldap-password">
                <InputField copyClipBoard={true} disabled={true} value={ldapPassword}/>
            </div>
        );
    }

    render() {
        const {
            tabs, service, loading, tab, firstTime, ldapPassword, tokenValue,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
            confirmationDialogQuestion, confirmationTxt, confirmationHeader, isWarning, lastAdminWarning
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        return (
            <div className="mod-service-container">
                <ServiceWelcomeDialog name={service.name}
                                      isOpen={firstTime}
                                      close={this.doAcceptInvitation}/>

                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={isWarning}
                                    largeWidth={!isEmpty(tokenValue)}
                                    confirmationTxt={confirmationTxt}
                                    confirmationHeader={confirmationHeader}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}>
                    {ldapPassword && this.renderLdapPassword(ldapPassword)}
                    {tokenValue && this.renderLdapPassword(tokenValue)}
                    {lastAdminWarning && <LastAdminWarning organisation={service}
                                                           currentUserDeleted={true}
                                                           localePrefix={"service.confirmation"}/>}
                </ConfirmationDialog>

                <UnitHeader obj={service}
                            mayEdit={user.admin || isUserServiceAdmin(user, service)}
                            history={user.admin && this.props.history}
                            auditLogPath={`services/${service.id}`}
                            breadcrumbName={I18n.t("breadcrumb.service", {name: service.name})}
                            name={service.name}
                            firstTime={user.admin ? this.onBoarding : undefined}
                            dropDownTitle={actionMenuUserRole(user, null, null, service, true)}
                            actions={this.getActions(user, service)}>
                    <p>{service.description}</p>
                    <div className="org-attributes-container-grid">
                        <div className="org-attributes">
                            <span>{I18n.t("service.uri")}</span>
                            <span>{service.uri ?
                                <a href={service.uri} target="_blank" rel="noopener noreferrer">{service.uri}</a> :
                                I18n.t("service.none")}</span>
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("service.contact_email")}</span>
                            <span className="multiple-attributes">
                            {service.contact_email &&
                            <a href={`mailto:${service.contact_email}`}>{service.contact_email}</a>}
                                {service.service_memberships
                                    .filter(sm => sm.user && sm.user.email !== service.contact_email)
                                    .map(sm => sm.user &&
                                        <a key={sm.user.id} href={`mailto:${sm.user.email}`}>{sm.user.email}</a>)}
                            </span>

                        </div>
                        {service.support_email &&
                        <div className="org-attributes">
                            <span>{I18n.t("service.support_email")}</span>
                            <span>
                                <a href={`mailto:${service.support_email}`}>{service.support_email}</a>
                            </span>
                        </div>}
                        <div className="org-attributes">
                            <span>{I18n.t("service.privacy_policy")}</span>
                            {service.privacy_policy && <span>
                                <a href={service.privacy_policy} target="_blank" rel="noopener noreferrer">
                                    {service.privacy_policy}</a></span>}
                            {!service.privacy_policy && <span>{I18n.t("service.none")}</span>}
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("service.accepted_user_policy")}</span>
                            {service.accepted_user_policy && <span>
                                <a href={service.accepted_user_policy} target="_blank" rel="noopener noreferrer">
                                    {service.accepted_user_policy}</a></span>}
                            {!service.accepted_user_policy && <span>{I18n.t("service.none")}</span>}
                        </div>
                        <div className="org-attributes">
                            <span className={"orphan"}>{this.compliancy(service)}</span>
                        </div>
                    </div>
                </UnitHeader>
                <div className="mod-service-container">
                    <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                        {tabs}
                    </Tabs>
                </div>
            </div>);
    }
    ;
}

export default ServiceDetail;
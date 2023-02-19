import React from "react";
import {
    allServiceConnectionRequests,
    createServiceMembershipRole,
    deleteServiceMembership,
    health,
    searchOrganisations,
    serviceById,
    serviceInvitationAccept,
    serviceInvitationByHash,
    userTokensOfUser
} from "../api";
import "./ServiceDetail.scss";
import I18n from "i18n-js";
import Tabs from "../components/Tabs";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as DetailsIcon} from "../icons/services.svg";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {
    ReactComponent as UserTokensIcon,
    ReactComponent as ServiceConnectionRequestsIcon
} from "../icons/connections.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as UserAdminIcon} from "../icons/users.svg";
import ServiceOrganisations from "../components/redesign/ServiceOrganisations";
import SpinnerField from "../components/redesign/SpinnerField";
import {removeDuplicates} from "../utils/Utils";
import {actionMenuUserRole, isUserServiceAdmin} from "../utils/UserRole";
import ServiceConnectionRequests from "../components/redesign/ServiceConnectionRequests";
import {ReactComponent as GroupsIcon} from "../icons/ticket-group.svg";
import ServiceGroups from "../components/redesign/ServiceGroups";
import ServiceAdmins from "../components/redesign/ServiceAdmins";
import {setFlash} from "../utils/Flash";
import ServiceWelcomeDialog from "../components/ServiceWelcomeDialog";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {ReactComponent as LeaveIcon} from "../icons/safety-exit-door-left.svg";
import LastAdminWarning from "../components/redesign/LastAdminWarning";
import ServiceOverview from "./ServiceOverview";
import {ReactComponent as EyeViewIcon} from "../icons/eye-svgrepo-com.svg";
import {socket, subscriptionIdCookieName} from "../utils/SocketIO";
import UserTokens from "../components/redesign/UserTokens";
import ServiceCollaborations from "../components/redesign/ServiceCollaborations";

class ServiceDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            invitation: null,
            isInvitation: false,
            organisations: [],
            userTokens: [],
            serviceConnectionRequests: [],
            firstTime: false,
            loading: true,
            tab: "details",
            confirmationDialogOpen: false,
            cancelDialogAction: null,
            confirmationDialogAction: null,
            confirmationTxt: null,
            confirmationHeader: null,
            isWarning: false,
            showServiceAdminView: false,
            socketSubscribed: false
        };
    }

    componentWillUnmount = () => {
        const params = this.props.match.params;
        if (params.id) {
            const service_id = parseInt(params.id, 10);
            socket.then(s => s.off(`service_${service_id}`));
        }
        AppStore.update(s => {
            s.sideComponent = null;
        });
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
                });
            }).catch(() => this.props.history.push("/404"));
        } else if (params.id) {
            const {user} = this.props;
            const userServiceAdmin = isUserServiceAdmin(user, {id: parseInt(params.id, 10)}) || user.admin;
            if (userServiceAdmin) {
                Promise.all([serviceById(params.id), searchOrganisations("*"),
                    allServiceConnectionRequests(params.id), userTokensOfUser(params.id)])
                    .then(res => {
                        const service = res[0];
                        const organisations = res[1];
                        const serviceConnectionRequests = res[2];
                        this.afterFetch(params, service, organisations, serviceConnectionRequests, res[3]);
                    }).catch(() => this.props.history.push("/"));
            } else {
                Promise.all([serviceById(params.id), userTokensOfUser(params.id)])
                    .then(res => {
                        this.afterFetch(params, res[0], [], [], res[1]);
                    }).catch(() => this.props.history.push("/"));
            }
        } else {
            this.props.history.push("/404");
        }
    };

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    afterFetch = (params, service, organisations, serviceConnectionRequests, userTokens) => {
        const tab = params.tab || this.state.tab;
        const {socketSubscribed} = this.state;
        if (!socketSubscribed) {
            socket.then(s => s.on(`service_${service.id}`, data => {
                const subscriptionIdSessionStorage = sessionStorage.getItem(subscriptionIdCookieName);
                if (subscriptionIdSessionStorage !== data.subscription_id) {
                    this.props.refreshUser(() => this.componentDidMount());
                }
            }));
            this.setState({socketSubscribed: true})
        }
        this.tabChanged(tab, service);
        this.setState({
            service: service,
            organisations: organisations,
            serviceConnectionRequests: serviceConnectionRequests,
            userTokens: userTokens,
            tab: tab,
            loading: false
        });
    }

    updateBreadCrumb(service) {
        const currentService = service || this.state.service;
        const {user} = this.props;
        AppStore.update(s => {
            s.breadcrumb.paths = [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {
                    path: `/services/${currentService.id}`,
                    value: I18n.t("breadcrumb.service", {name: currentService.name})
                },
            ];
            s.sideComponent = user.admin ? this.eyeView() : null;
        });
    }

    eyeView = () => {
        return (
            <div className={`eye-view`} onClick={() => {
                health().then(() => {
                    const {showServiceAdminView, tab} = this.state;
                    const newTab = tab === "groups" ? "details" : tab;
                    this.setState({
                            showServiceAdminView: !showServiceAdminView,
                            tab: newTab
                        },
                        () => {
                            AppStore.update(s => {
                                s.sideComponent = this.eyeView();
                            });

                        });
                });
            }}>
                <EyeViewIcon/>
                <span>{I18n.t(`service.viewAs${this.state.showServiceAdminView ? "PlatformAdmin" : "ServiceAdmin"}`)}</span>
            </div>
        );
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
        this.setState({loading: true});
        const {user} = this.props;
        const userServiceAdmin = isUserServiceAdmin(user, {id: parseInt(params.id, 10)}) || user.admin;
        if (userServiceAdmin) {
            Promise.all([serviceById(params.id), allServiceConnectionRequests(params.id), userTokensOfUser(params.id)])
                .then(res => {
                    this.setState({
                        service: res[0],
                        serviceConnectionRequests: res[1],
                        userTokens: res[2],
                        loading: false
                    }, callback);
                }).catch(() => {
                this.props.history.push("/404")
            });
        } else {
            Promise.all([serviceById(params.id), userTokensOfUser(params.id)])
                .then(res => {
                    this.setState({
                        service: res[0],
                        userTokens: res[1],
                        loading: false
                    }, callback);
                }).catch(() => {
                this.props.history.push("/404")
            });

        }
    };
    getDetailsTab = (service, userAdmin, serviceAdmin, showServiceAdminView, organisations) => {
        return (<div key="details" name="details"
                     label={I18n.t("home.tabs.details")}
                     icon={<DetailsIcon/>}>
            <ServiceOverview {...this.props}
                             refresh={this.refresh}
                             service={service}
                             organisations={organisations}
                             showServiceAdminView={showServiceAdminView}
                             userAdmin={userAdmin}
                             serviceAdmin={serviceAdmin}/>
        </div>)
    }

    getOrganisationsTab = (service, organisations, userAdmin, serviceAdmin, showServiceAdminView) => {
        return (<div key="organisations"
                     name="organisations"
                     label={I18n.t("home.tabs.serviceOrganisations", {count: organisations.length})}
                     icon={<OrganisationsIcon/>}>
            <ServiceOrganisations {...this.props}
                                  refresh={this.refresh}
                                  service={service}
                                  organisations={organisations}
                                  showServiceAdminView={showServiceAdminView}
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

    getTokenTab = service => {
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

    getCollaborationsTab = (service, showServiceAdminView) => {
        const collaborations = service.collaborations;
        collaborations.forEach(coll => coll.fromCollaboration = true);
        const collFromOrganisations = service.service_organisation_collaborations;
        collFromOrganisations.forEach(coll => coll.fromCollaboration = false);
        const colls = removeDuplicates(collaborations.concat(collFromOrganisations), "id");
        return (
            <div key="collaborations" name="collaborations"
                 label={I18n.t("home.tabs.serviceCollaborations", {count: colls.length})}
                 icon={<CollaborationsIcon/>}>
                <ServiceCollaborations
                    service={service}
                    showServiceAdminView={showServiceAdminView}
                    collaborations={colls}
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

    getUserTokensTab = (userTokens, service) => {
        return (<div key="tokens" name="tokens"
                     label={I18n.t("home.tabs.userTokens", {count: (userTokens || []).length})}
                     icon={<UserTokensIcon/>}>
            {<UserTokens {...this.props}
                         services={[service]}
                         service={service}
                         userTokens={userTokens}
                         refresh={this.refresh}/>}
        </div>)
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
            isWarning: true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationDialogAction: this.doDeleteMe
        });
    };

    getActions = (user, service, showServiceAdminView) => {
        const actions = [];
        const serviceAdmin = isUserServiceAdmin(user, service);
        if (serviceAdmin || showServiceAdminView)
            actions.push({
                svg: LeaveIcon,
                disabled: !serviceAdmin,
                name: I18n.t("service.leave"),
                perform: this.deleteMe
            });
        if (user.admin && !serviceAdmin && !showServiceAdminView) {
            actions.push({
                icon: "plus-circle",
                name: I18n.t("service.addMe"),
                perform: this.addMe
            })
        }
        return actions;
    }

    addMe = () => {
        const {service} = this.state;
        this.setState({loading: true});
        createServiceMembershipRole(service.id).then(() => {
            this.props.refreshUser(() => {
                this.setState({confirmationDialogOpen: false, loading: false});
                this.componentDidMount();
            });
        })
    }

    render() {
        const {
            service, loading, tab, firstTime, showServiceAdminView, serviceConnectionRequests,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, organisations,
            confirmationDialogQuestion, confirmationTxt, confirmationHeader, isWarning, lastAdminWarning, userTokens
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        let tabs = [];
        const params = this.props.match.params;
        const userServiceAdmin = isUserServiceAdmin(user, {id: parseInt(params.id, 10)}) || user.admin;
        if (params.hash) {
            tabs = [this.getAdminsTab(service)];
        } else if (userServiceAdmin) {
            tabs = [
                this.getDetailsTab(service, user.admin, userServiceAdmin, showServiceAdminView, organisations),
                this.getAdminsTab(service),
                this.getServiceGroupsTab(service),
                this.getOrganisationsTab(service, organisations, user.admin, userServiceAdmin, showServiceAdminView),
                this.getCollaborationsTab(service, showServiceAdminView),
            ];
            if (serviceConnectionRequests.length > 0) {
                tabs.push(this.getServiceConnectionRequestTab(service, serviceConnectionRequests));
            }
        }
        if (service.token_enabled) {
            tabs.push(this.getUserTokensTab(userTokens, service));
        }
        return (
            <div className="mod-service-container">
                <ServiceWelcomeDialog name={service.name}
                                      isOpen={firstTime}
                                      close={this.doAcceptInvitation}/>

                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={isWarning}
                                    confirmationTxt={confirmationTxt}
                                    confirmationHeader={confirmationHeader}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}>
                    {lastAdminWarning && <LastAdminWarning organisation={service}
                                                           currentUserDeleted={true}
                                                           localePrefix={"service.confirmation"}/>}
                </ConfirmationDialog>

                <UnitHeader obj={service}
                            mayEdit={user.admin || isUserServiceAdmin(user, service)}
                            history={user.admin && !showServiceAdminView && this.props.history}
                            auditLogPath={`services/${service.id}`}
                            breadcrumbName={I18n.t("breadcrumb.service", {name: service.name})}
                            name={service.name}
                            firstTime={(user.admin && !showServiceAdminView) ? this.onBoarding : undefined}
                            dropDownTitle={showServiceAdminView ? I18n.t("service.fakeServiceAdmin") : actionMenuUserRole(user, null, null, service, true)}
                            actions={this.getActions(user, service, showServiceAdminView)}>
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
                        <div className="org-attributes">
                            <span>{I18n.t("service.infoUri")}</span>
                            <span>{service.uri_info ?
                                <a href={service.uri_info} target="_blank"
                                   rel="noopener noreferrer">{service.uri_info}</a> :
                                I18n.t("service.none")}</span>
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
}

export default ServiceDetail;
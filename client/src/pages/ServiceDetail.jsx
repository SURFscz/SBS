import React from "react";
import {
    allServiceConnectionRequests,
    createServiceMembershipRole,
    deleteServiceMembership,
    health,
    searchOrganisations,
    serviceById,
    serviceInvitationAccept,
    serviceInvitationByHash
} from "../api";
import "./ServiceDetail.scss";
import I18n from "../locale/I18n";
import Tabs from "../components/Tabs";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as DetailsIcon} from "../icons/services.svg";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {ReactComponent as WebsiteIcon} from "../icons/network-information.svg";
import {ReactComponent as ServiceConnectionRequestsIcon} from "../icons/connections.svg";
import {ReactComponent as AboutIcon} from "../icons/common-file-text-home.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as UserAdminIcon} from "../icons/users.svg";
import {ReactComponent as ConnectedIcon} from "../icons/groups.svg";
import ServiceOrganisations from "../components/redesign/ServiceOrganisations";
import SpinnerField from "../components/redesign/SpinnerField";
import {capitalize, isEmpty, removeDuplicates, splitListSemantically, stopEvent} from "../utils/Utils";
import {actionMenuUserRole, isUserServiceAdmin} from "../utils/UserRole";
import ServiceConnectionRequests from "../components/redesign/ServiceConnectionRequests";
import {ReactComponent as GroupsIcon} from "../icons/ticket-group.svg";
import ServiceGroups from "../components/redesign/ServiceGroups";
import ServiceAdmins from "../components/redesign/ServiceAdmins";
import {setFlash} from "../utils/Flash";
import ServiceWelcomeDialog from "../components/ServiceWelcomeDialog";
import ConfirmationDialog from "../components/ConfirmationDialog";
import LastAdminWarning from "../components/redesign/LastAdminWarning";
import ServiceOverview from "./ServiceOverview";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../utils/SocketIO";
import ServiceCollaborations from "../components/redesign/ServiceCollaborations";
import {ButtonType} from "@surfnet/sds";
import AboutService from "../components/redesign/AboutService";
import DOMPurify from "dompurify";

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
            s.objectRole = null;
            s.actions = [];
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
                    allServiceConnectionRequests(params.id)])
                    .then(res => {
                        const service = res[0];
                        const organisations = res[1];
                        const serviceConnectionRequests = res[2];
                        this.afterFetch(params, service, organisations, serviceConnectionRequests);
                    }).catch(() => this.props.history.push("/"));
            } else {
                this.props.history.push("/404");
            }
        } else {
            this.props.history.push("/404");
        }
    };

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    afterFetch = (params, service, organisations, serviceConnectionRequests) => {
        const tab = params.tab || this.state.tab;
        const {socketSubscribed} = this.state;
        if (!socketSubscribed) {
            socket.then(s => s.on(`service_${service.id}`, data => {
                const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
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
            tab: tab,
            loading: false
        });
    }

    updateBreadCrumb(service) {
        const {showServiceAdminView} = this.state;
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
            s.actions = this.getHeaderActions(user, currentService);
            s.objectRole = showServiceAdminView ? I18n.t("service.fakeServiceAdmin") :
                actionMenuUserRole(user, null, null, currentService, true)
        });
    }

    toggleAdminMemberView = () => {
        health().then(() => {
            const {showServiceAdminView, tab} = this.state;
            const newTab = tab === "groups" ? "details" : tab;
            this.setState({
                showServiceAdminView: !showServiceAdminView,
                tab: newTab
            }, this.updateBreadCrumb);
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
        const {user} = this.props;
        const userServiceAdmin = isUserServiceAdmin(user, {id: parseInt(params.id, 10)}) || user.admin;
        if (userServiceAdmin) {
            Promise.all([serviceById(params.id), allServiceConnectionRequests(params.id)])
                .then(res => {
                    this.setState({
                        service: res[0],
                        serviceConnectionRequests: res[1],
                        loading: false
                    }, callback);
                }).catch(() => {
                this.props.history.push("/404")
            });
        } else {
            Promise.all([serviceById(params.id)])
                .then(res => {
                    this.setState({
                        service: res[0],
                        loading: false
                    }, callback);
                }).catch(() => {
                this.props.history.push("/404")
            });

        }
    };

    getDetailsTab = (service, userAdmin, serviceAdmin, showServiceAdminView) => {
        return (<div key="details" name="details"
                     label={I18n.t("home.tabs.details")}
                     icon={<DetailsIcon/>}>
            <ServiceOverview {...this.props}
                             refresh={this.refresh}
                             service={service}
                             showServiceAdminView={showServiceAdminView}
                             userAdmin={userAdmin}
                             serviceAdmin={serviceAdmin}/>
        </div>)
    }

    getOrganisationsTab = (service, organisations, userAdmin, serviceAdmin, showServiceAdminView) => {
        const availableOrganisations = service.allow_restricted_orgs ? organisations : organisations.filter(org => !org.services_restricted);
        return (<div key="organisations"
                     name="organisations"
                     label={I18n.t("home.tabs.serviceOrganisations", {count: availableOrganisations.length})}
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
                     label={I18n.t("home.tabs.groups", {count: (service.service_groups || []).length})}
                     icon={<GroupsIcon/>}>
            {<ServiceGroups {...this.props} service={service}
                            refresh={this.refresh}/>}
        </div>)
    }

    getCollaborationsTab = (service, showServiceAdminView) => {
        const collaborations = this.allCollaborationsForService(service);
        return (
            <div key="collaborations" name="collaborations"
                 label={I18n.t("home.tabs.serviceCollaborations", {count: collaborations.length})}
                 icon={<CollaborationsIcon/>}>
                <ServiceCollaborations
                    service={service}
                    showServiceAdminView={showServiceAdminView}
                    goToOrganisationsTab={() => this.tabChanged("organisations")}
                    collaborations={collaborations}
                    refresh={this.refresh}
                    modelName={"serviceCollaborations"}
                    {...this.props} />
            </div>);
    }

    allCollaborationsForService = service => {
        const collaborations = service.collaborations || [];
        collaborations.forEach(coll => coll.fromCollaboration = true);
        const collFromOrganisations = service.service_organisation_collaborations || [];
        collFromOrganisations.forEach(coll => coll.fromCollaboration = false);
        const colls = removeDuplicates(collaborations.concat(collFromOrganisations), "id");
        return colls;
    }

    getAboutTab = service => {
        return (<div key="about" name="about" label={I18n.t("home.tabs.about")} icon={<AboutIcon/>}>
            <AboutService service={service}
                          tabChanged={this.tabChanged}
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
            return I18n.t("service.none");
        }
        return splitListSemantically(compliancies, I18n.t("service.compliancySeparator"));

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

    deleteMe = e => {
        stopEvent(e);
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

    getHeaderActions = (user, service) => {
        const actions = [];
        const serviceAdmin = isUserServiceAdmin(user, service);
        if (serviceAdmin)
            actions.push({
                name: I18n.t("service.leave"),
                perform: this.deleteMe
            });
        return actions;
    }

    getActions = (user, service, showServiceAdminView) => {
        const actions = [];
        const serviceAdmin = isUserServiceAdmin(user, service);
        if (user.admin) {
            actions.push({
                buttonType: ButtonType.Secondary,
                name: I18n.t(`service.viewAs${this.state.showServiceAdminView ? "PlatformAdmin" : "ServiceAdmin"}`),
                perform: () => this.toggleAdminMemberView()
            });
        }
        if (user.admin && !serviceAdmin && !showServiceAdminView) {
            actions.push({
                buttonType: ButtonType.Chevron,
                name: I18n.t("service.addMe"),
                perform: this.addMe
            })
        }
        return actions;
    }

    addMe = e => {
        stopEvent(e);
        const {service} = this.state;
        this.setState({loading: true});
        createServiceMembershipRole(service.id).then(() => {
            this.props.refreshUser(() => {
                this.setState({confirmationDialogOpen: false, loading: false});
                this.componentDidMount();
            });
        })
    }

    getCollaborationHeaderInfo = service => {
        const collaborations = this.allCollaborationsForService(service);
        const notConnected = isEmpty(collaborations);
        if (notConnected) {
            return (
                <span
                    dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("servicePageHeaders.notConnected"))}}/>
            );
        }
        return (
            <span dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                    I18n.t(`servicePageHeaders.${collaborations.length === 1 ? "connectedToSingle" : "connectedToMultiple"}`,
                        {count: collaborations.length})
                )
            }}/>
        );
    }

    getInstitutionsHeadersInfo = service => {
        const allowedForAll = service.access_allowed_for_all || service.non_member_users_access_allowed;
        const accessibleService = service.automatic_connection_allowed || allowedForAll;
        const allowed = (service.allowed_organisations || []).length;
        const always = (service.automatic_connection_allowed_organisations || []).length;
        const notAvailable = !accessibleService && allowed === 0 && always === 0;
        if (notAvailable) {
            return (
                <span
                    dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("servicePageHeaders.notAvailable"))}}/>
            );
        }
        const count = allowedForAll ? I18n.t("servicePageHeaders.all") : (allowed + always);
        return (
            <span dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                    I18n.t(`servicePageHeaders.${(count === 1 && !allowedForAll) ? "availableSingle" : "availableMultiple"}`,
                        {count: count})
                )
            }}/>
        );
    }

    getIconListItems = iconListItems => {
        return (
            <div className={"icon-list-items"}>
                {iconListItems.map((item, index) => <div className={"icon-list-item"} key={index}>
                    {item.Icon}
                    {item.value}
                </div>)}
            </div>);
    }

    render() {
        const {
            service, loading, tab, firstTime, showServiceAdminView, serviceConnectionRequests,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, organisations,
            confirmationDialogQuestion, confirmationTxt, confirmationHeader, isWarning, lastAdminWarning
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user, invitation} = this.props;
        let tabs = [];
        const params = this.props.match.params;
        const userServiceAdmin = isUserServiceAdmin(user, {id: parseInt(params.id, 10)}) || user.admin;
        if (params.hash) {
            tabs = [this.getAdminsTab(service)];
        } else if (userServiceAdmin) {
            tabs = [
                this.getDetailsTab(service, user.admin, userServiceAdmin, showServiceAdminView),
                this.getAdminsTab(service),
                this.getServiceGroupsTab(service),
                this.getOrganisationsTab(service, organisations, user.admin, userServiceAdmin, showServiceAdminView),
                this.getCollaborationsTab(service, showServiceAdminView),
            ];
            if (serviceConnectionRequests.length > 0) {
                tabs.push(this.getServiceConnectionRequestTab(service, serviceConnectionRequests));
            }
        }
        if (!userServiceAdmin) {
            tabs.push(this.getAboutTab(service));
        }
        const iconListItems = [
            {
                Icon: <ConnectedIcon/>,
                value:
                    <span>{this.getCollaborationHeaderInfo(service)}{this.getInstitutionsHeadersInfo(service)}</span>
            }
        ];
        if (service.uri_info || service.uri) {
            iconListItems.push({
                Icon: <WebsiteIcon/>,
                value: <span>
                    {service.uri && <a href={service.uri} target="_blank" rel="noopener noreferrer">
                        {I18n.t("servicePageHeaders.launch")}
                    </a>}
                    {(service.uri && service.uri_info) && <span>{I18n.t("service.or")}</span>}
                    {service.uri_info && <a href={service.uri_info} target="_blank" rel="noopener noreferrer">
                        {service.uri ? I18n.t("servicePageHeaders.visit") : capitalize(I18n.t("servicePageHeaders.visit"))}
                    </a>}
                </span>
            })
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
                            displayDescription={false}
                            displayShortName={true}
                            mayEdit={user.admin || isUserServiceAdmin(user, service)}
                            history={user.admin && !showServiceAdminView && this.props.history}
                            auditLogPath={`services/${service.id}`}
                            breadcrumbName={I18n.t("breadcrumb.service", {name: service.name})}
                            name={service.name}
                            firstTime={(user.admin && !showServiceAdminView) ? this.onBoarding : undefined}
                            actions={this.getActions(user, service, showServiceAdminView)}>
                    <p>
                        <span>{I18n.t("service.abbreviation")}:</span>
                        <span className="abbreviation">{service.abbreviation}</span>
                    </p>
                    {!invitation && this.getIconListItems(iconListItems)}
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
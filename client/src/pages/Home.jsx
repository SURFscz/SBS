import React from "react";
import "./Home.scss";
import sheep from "./sram_sheep.ogg";
import I18n from "../locale/I18n";
import {ReactComponent as Logo} from "../icons/ram.svg";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as MembersIcon} from "../icons/single-neutral.svg";
import {ReactComponent as PlatformAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {AppStore} from "../stores/AppStore";
import {isUserServiceAdmin, rawGlobalUserRole, ROLES} from "../utils/UserRole";
import Tabs from "../components/Tabs";
import Organisations from "../components/redesign/Organisations";
import UnitHeader from "../components/redesign/UnitHeader";
import PlatformAdmins from "../components/redesign/PlatformAdmins";
import Services from "../components/redesign/Services";
import SpinnerField from "../components/redesign/SpinnerField";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import Collaborations from "../components/redesign/Collaborations";
import {isEmpty} from "../utils/Utils";
import {ReactComponent as JoinRequestsIcon} from "../icons/single-neutral-question.svg";
import MemberJoinRequests from "../components/redesign/MemberJoinRequests";
import {ReactComponent as CollaborationRequestsIcon} from "../icons/faculty.svg";
import MemberCollaborationRequests from "../components/redesign/MemberCollaborationRequests";
import Users from "../components/redesign/Users";
import ServiceRequests from "../components/redesign/ServiceRequests";

class Home extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            tabs: [],
            role: ROLES.USER,
            loading: true,
            tab: "organisations"
        };
    }

    componentDidMount = callback => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const refresh = urlSearchParams.get("refresh");
        if (refresh) {
            history.pushState(null, "", location.protocol + '//' + location.host + location.pathname);
            this.refreshUserHook();
        } else {
            const params = this.props.match.params;
            let tab = params.tab || this.state.tab;
            const {user} = this.props;
            const tabs = [];
            const role = rawGlobalUserRole(user);
            const nbrOrganisations = user.organisation_memberships.length;
            const nbrCollaborations = user.collaboration_memberships.length;
            const nbrServices = user.service_memberships.length;
            const canStayInHome = !isEmpty(user.service_requests) || !isEmpty(user.collaboration_requests) || !isEmpty(user.join_requests) || nbrServices > 0;
            switch (role) {
                case ROLES.PLATFORM_ADMIN:
                    tabs.push(this.getOrganisationsTab(user.total_organisations));
                    tabs.push(this.getCollaborationsTab(true, user.total_collaborations));
                    tabs.push(this.getPlatformAdminsTab(user.total_platform_admins));
                    tabs.push(this.getServicesTab(user.total_services));
                    tabs.push(this.getUsersTab(user.total_users));
                    if (user.total_service_requests > 0) {
                        tabs.push(this.getServiceRequestsTab(false, null, this.refreshUserHook, user.total_service_requests, user.total_open_service_requests));
                    }
                    break;
                case ROLES.ORG_ADMIN:
                case ROLES.ORG_MANAGER:
                    if (nbrOrganisations === 1 && nbrCollaborations === 0 && !canStayInHome) {
                        setTimeout(() => this.props.history.push(`/organisations/${user.organisation_memberships[0].organisation_id}`), 50);
                        return;
                    } else {
                        tabs.push(this.getOrganisationsTab(nbrOrganisations));
                        if (nbrCollaborations > 0) {
                            tabs.push(this.getCollaborationsTab(false, nbrCollaborations));
                        }
                    }
                    break;
                case ROLES.COLL_ADMIN:
                case ROLES.COLL_MEMBER:
                    if (nbrOrganisations === 0 && nbrCollaborations === 1 && !canStayInHome) {
                        setTimeout(() => this.props.history.push(`/collaborations/${user.collaboration_memberships[0].collaboration_id}`), 50);
                        return;
                    } else {
                        tabs.push(this.getCollaborationsTab(false, nbrCollaborations));
                        tab = "collaborations";
                        if (nbrOrganisations > 0) {
                            tabs.push(this.getOrganisationsTab(nbrOrganisations));
                        }
                    }
                    break;
                default:
                    if (!canStayInHome) {
                        this.props.history.push("/welcome");
                        return;
                    }
            }
            const tabSuggestion = this.addRequestsTabs(user, this.refreshUserHook, tabs, tab);
            if (role === ROLES.USER) {
                tab = tabSuggestion;
            }
            if (isUserServiceAdmin(user) && !user.admin) {
                if (nbrServices === 1 && tabs.length === 0) {
                    setTimeout(() => this.props.history.push(`/services/${user.service_memberships[0].service_id}`), 50);
                } else {
                    tabs.push(this.getServicesTab(nbrServices));
                    tab = tabs[0].key;
                }
            }
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")}
                ];
            });
            this.tabChanged(tab);
            callback && callback();
            this.setState({role: role, loading: false, tabs: tabs.filter(t => t !== null), tab});
        }
    };

    refreshUserHook = callback => {
        const {refreshUser} = this.props;
        refreshUser(() => this.componentDidMount(callback));
    }

    addRequestsTabs = (user, refreshUserHook, tabs, tab) => {
        if (!isEmpty(user.join_requests)) {
            tabs.push(this.getMemberJoinRequestsTab(user.join_requests, refreshUserHook));
            tab = (tab !== "collaboration_requests") ? "joinrequests" : tab;
        }
        if (!isEmpty(user.collaboration_requests)) {
            tabs.push(this.getCollaborationRequestsTab(user.collaboration_requests, refreshUserHook));
            if (isEmpty(user.join_requests)) {
                tab = "collaboration_requests"
            }
        }
        if (!isEmpty(user.service_requests) && !user.admin) {
            tabs.push(this.getServiceRequestsTab(true, user.service_requests, refreshUserHook));
        }
        return tab;
    }

    getOrganisationsTab = count =>
        <div key="organisations" name="organisations" label={I18n.t("home.tabs.organisations", {count: count})}
             icon={<OrganisationsIcon/>}>
            <Organisations {...this.props}/>
        </div>

    getPlatformAdminsTab = count => {
        return (<div key="platformAdmins" name="platformAdmins"
                     label={I18n.t("home.tabs.platformAdmins", {count: count})}
                     icon={<PlatformAdminIcon/>}>
            <PlatformAdmins {...this.props}/>
        </div>)
    }

    getUsersTab = count => {
        return (<div key="users" name="users"
                     label={I18n.t("home.tabs.users", {count: count})}
                     icon={<MembersIcon/>}>
            <Users {...this.props}
                   adminSearch={true}/>
        </div>)
    }

    getServicesTab = count => {
        return (<div key="services" name="services"
                     label={I18n.t("home.tabs.services", {count: count})}
                     icon={<ServicesIcon/>}>
            <Services {...this.props}/>
        </div>)
    }

    getCollaborationsTab = (platformAdmin, count) => {
        return (<div key="collaborations" name="collaborations"
                     label={I18n.t("home.tabs.collaborations", {count: count})}
                     icon={<CollaborationsIcon/>}>
            <Collaborations {...this.props}/>
        </div>)
    }

    getMemberJoinRequestsTab = (join_requests, refreshUserHook) => {
        const openJoinRequests = (join_requests || []).filter(jr => jr.status === "open").length;
        return (<div key="joinrequests"
                     name="joinrequests"
                     label={I18n.t("home.tabs.joinRequests", {count: (join_requests || []).length})}
                     icon={<JoinRequestsIcon/>}
                     notifier={openJoinRequests > 0 ? openJoinRequests : null}>
            <MemberJoinRequests join_requests={join_requests} refreshUserHook={refreshUserHook} {...this.props} />
        </div>)
    }

    getCollaborationRequestsTab = (collaboration_requests, refreshUserHook) => {
        const crl = (collaboration_requests || []).filter(cr => cr.status === "open").length;
        return (<div key="collaboration_requests"
                     name="collaboration_requests"
                     label={I18n.t("home.tabs.collaborationRequests", {count: (collaboration_requests || []).length})}
                     notifier={crl > 0 ? crl : null}
                     icon={<CollaborationRequestsIcon/>}>
            <MemberCollaborationRequests {...this.props} refreshUserHook={refreshUserHook}
                                         collaboration_requests={collaboration_requests}/>
        </div>)
    }

    getServiceRequestsTab = (personal, service_requests = null, refreshUserHook = null, serviceRequestCount = null, openCount = null) => {
        return (<div key="service_requests"
                     name="service_requests"
                     label={I18n.t("home.tabs.serviceRequests", {count: serviceRequestCount ? serviceRequestCount : (service_requests || []).length})}
                     notifier={openCount > 0 && !personal}
                     icon={<ServicesIcon/>}>
            <ServiceRequests {...this.props}
                             refreshUserHook={refreshUserHook}
                             personal={personal}
                             service_requests={service_requests}/>
        </div>)
    }

    tabChanged = (name) => {
        this.setState({tab: name}, () =>
            this.props.history.replace(`/home/${name}`));
    }


    render() {
        const {tabs, loading, tab} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        const noMemberships = user.collaboration_memberships.length === 0 && user.organisation_memberships.length === 0
            && user.service_memberships === 0;
        return (
            <div className="mod-home-container">
                {(user.admin || noMemberships) && <UnitHeader obj={({name: I18n.t("home.sram"), svg: Logo})}
                                                              svgClick={() => new Audio(sheep).play()}/>}
                <Tabs standAlone={!user.admin} activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    }
}

export default Home;
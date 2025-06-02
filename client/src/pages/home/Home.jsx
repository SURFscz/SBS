import React from "react";
import "./Home.scss";
import I18n from "../../locale/I18n";
import {ReactComponent as Logo} from "../../icons/ram.svg";
import {AppStore} from "../../stores/AppStore";
import {getUserRequests, isUserServiceAdmin, rawGlobalUserRole, ROLES} from "../../utils/UserRole";
import Tabs from "../../components/tabs/Tabs";
import Organisations from "../../components/_redesign/organisations/Organisations";
import UnitHeader from "../../components/_redesign/unit-header/UnitHeader";
import PlatformAdmins from "../../components/_redesign/platform-admins/PlatformAdmins";
import Services from "../../components/_redesign/services/Services";
import SpinnerField from "../../components/_redesign/spinner-field/SpinnerField";
import Collaborations from "../../components/_redesign/collaborations/Collaborations";
import {isEmpty} from "../../utils/Utils";
import Users from "../../components/_redesign/users/Users";
import ServiceRequests from "../../components/_redesign/service-requests/ServiceRequests";
import EmptyCollaborations from "../../components/_redesign/empty-collaborations/EmptyCollaborations";
import MyRequests from "../../components/_redesign/my-requests/MyRequests";

class Home extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            tabs: [],
            role: ROLES.USER,
            loading: true,
            tab: "organisations",
            winking: false
        };
    }

    componentDidMount = callback => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const refresh = urlSearchParams.get("refresh");
        const redirect = urlSearchParams.get("redirect");
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
            const userRequests = getUserRequests(user);
            const canStayInHome = nbrServices > 0 || (!isEmpty(user.organisations_from_user_schac_home) && redirect) || !isEmpty(userRequests);
            let hasAnyRoles = true;
            switch (role) {
                case ROLES.PLATFORM_ADMIN:
                    tabs.push(this.getOrganisationsTab());
                    tabs.push(this.getCollaborationsTab());
                    tabs.push(this.getPlatformAdminsTab());
                    tabs.push(this.getServicesTab());
                    tabs.push(this.getUsersTab());
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
                        tabs.push(this.getOrganisationsTab());
                        if (nbrCollaborations > 0) {
                            tabs.push(this.getCollaborationsTab());
                        }
                    }
                    break;
                case ROLES.COLL_ADMIN:
                case ROLES.COLL_MEMBER:
                    if (nbrOrganisations === 0 && nbrCollaborations === 1 && !canStayInHome) {
                        setTimeout(() => this.props.history.push(`/collaborations/${user.collaboration_memberships[0].collaboration_id}`), 50);
                        return;
                    } else {
                        tabs.push(this.getCollaborationsTab());
                        tab = "collaborations";
                        if (nbrOrganisations > 0) {
                            tabs.push(this.getOrganisationsTab());
                        }
                    }
                    break;
                default:
                    hasAnyRoles = false;
            }
            const collaborationTabPresent = tabs.some(t => t.key === "collaborations")
            if (isUserServiceAdmin(user) && !user.admin) {
                if (nbrCollaborations > 0 && !collaborationTabPresent) {
                    tabs.push(this.getCollaborationsTab());
                } else if (!isEmpty(user.organisations_from_user_schac_home) && !collaborationTabPresent) {
                    tabs.push(this.getEmptyCollaborationsTab());
                }
                if (nbrServices === 1 && tabs.length === 0 && !redirect && isEmpty(userRequests)) {
                    setTimeout(() => this.props.history.push(`/services/${user.service_memberships[0].service_id}`), 50);
                    return;
                } else {
                    tabs.push(this.getServicesTab(nbrServices));
                    if (nbrServices > 0 && nbrCollaborations === 0) {
                        tab = "services";
                    } else {
                        tab = tabs[0].key;
                    }

                }
            }
            const tabSuggestion = this.addRequestsTabs(user, this.refreshUserHook, tabs, tab, userRequests);
            if (role === ROLES.USER) {
                tab = tabSuggestion;
            }
            if (tabs.length === 0 || (tabs.length === 1 && tab === "my_requests" && !hasAnyRoles)) {
                this.props.history.push("/_welcome");
                return;
            }
            if ((role === ROLES.COLL_ADMIN || role === ROLES.COLL_MEMBER) && !isUserServiceAdmin(user) && nbrCollaborations < 6) {
                this.props.history.push("/collaborations-overview");
                return;
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

    addRequestsTabs = (user, refreshUserHook, tabs, tab, userRequests) => {
        if (!isEmpty(userRequests)) {
            tabs.push(this.getMyRequestsTab(userRequests, refreshUserHook));
            return "my_requests";
        }
        return tab;
    }

    getOrganisationsTab = () => {
        return (
            <div key="organisations" name="organisations" label={I18n.t("home.tabs.organisations")}>
                <Organisations {...this.props}/>
            </div>
        )
    }


    getPlatformAdminsTab = () => {
        return (
            <div key="platformAdmins" name="platformAdmins"
                 label={I18n.t("home.tabs.platformAdmins")}>
                <PlatformAdmins {...this.props}/>
            </div>)
    }

    getUsersTab = () => {
        return (
            <div key="users" name="users"
                 label={I18n.t("home.tabs.users")}>
                <Users {...this.props}
                       adminSearch={true}/>
            </div>)
    }

    getServicesTab = () => {
        return (<div key="services" name="services"
                     label={I18n.t("home.tabs.services")}
        >
            <Services {...this.props}/>
        </div>)
    }

    getCollaborationsTab = () => {
        return (<div key="collaborations"
                     name="collaborations"
                     label={I18n.t("home.tabs.collaborations")}
        >
            <Collaborations {...this.props}/>
        </div>)
    }

    getEmptyCollaborationsTab = () => {
        return (<div key="collaborations" name="collaborations"
                     label={I18n.t("home.tabs.collaborations", {count: 0})}
        >
            <EmptyCollaborations {...this.props}/>
        </div>)
    }

    getMyRequestsTab = (requests, refreshUserHook) => {
        return (<div key="my_requests"
                     name="my_requests"
                     label={I18n.t("home.tabs.myRequests", {count: requests.length})}
        >
            <MyRequests requests={requests}
                        standAlone={false}
                        refreshUserHook={refreshUserHook} {...this.props} />
        </div>)
    }

    getServiceRequestsTab = (personal, service_requests = null, refreshUserHook = null, serviceRequestCount = null, openCount = null) => {
        return (<div key="service_requests"
                     name="service_requests"
                     label={I18n.t("home.tabs.serviceRequests", {count: serviceRequestCount ? serviceRequestCount : (service_requests || []).length})}
                     notifier={openCount > 0 && !personal}>
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

    winky = () => {
        this.setState({winking: true});
        setTimeout(() => this.setState({winking: false}), 850);
    }


    render() {
        const {tabs, loading, tab, winking} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        const noMemberships = user.collaboration_memberships.length === 0 && user.organisation_memberships.length === 0
            && user.service_memberships === 0;
        return (
            <div className="mod-home-container">
                {(user.admin || noMemberships) &&
                    <UnitHeader obj={({name: I18n.t("home.sram"), svg: Logo, style: winking ? "wink" : ""})}
                                svgClick={() => this.winky()}/>}
                <Tabs standAlone={!user.admin} activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    }
}

export default Home;

import React from "react";
import "./Home.scss";
import goat from "./goat.wav";
import I18n from "i18n-js";
import {ReactComponent as Logo} from "../icons/ram.svg";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as MembersIcon} from "../icons/single-neutral.svg";
import {ReactComponent as PlatformAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {AppStore} from "../stores/AppStore";
import {rawGlobalUserRole, ROLES} from "../utils/UserRole";
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

    componentDidMount = () => {
        const params = this.props.match.params;
        let tab = params.tab || this.state.tab;
        const {user} = this.props;
        const tabs = [];
        const role = rawGlobalUserRole(user);
        const nbrOrganisations = user.organisation_memberships.length;
        const nbrCollaborations = user.collaboration_memberships.length;
        if (user.needsSuperUserConfirmation) {
            this.props.history.push("/confirmation");
            return;
        }
        const canStayInHome = !isEmpty(user.collaboration_requests) || !isEmpty(user.join_requests);
        switch (role) {
            case ROLES.PLATFORM_ADMIN:
                tabs.push(this.getOrganisationsTab());
                tabs.push(this.getCollaborationsTab(true));
                tabs.push(this.getPlatformAdminsTab());
                tabs.push(this.getServicesTab());
                tabs.push(this.getUsersTab());
                break;
            case ROLES.ORG_ADMIN:
            case ROLES.ORG_MANAGER:
                if (nbrOrganisations === 1 && nbrCollaborations === 0 && !canStayInHome) {
                    setTimeout(() => this.props.history.push(`/organisations/${user.organisation_memberships[0].organisation_id}`), 50);
                    return;
                } else {
                    tabs.push(this.getOrganisationsTab());
                    if (nbrCollaborations > 0) {
                        tabs.push(this.getCollaborationsTab(false));
                    }
                }
                break;
            case ROLES.COLL_ADMIN:
            case ROLES.COLL_MEMBER:
                if (nbrOrganisations === 0 && nbrCollaborations === 1 && !canStayInHome) {
                    setTimeout(() => this.props.history.push(`/collaborations/${user.collaboration_memberships[0].collaboration_id}`), 50);
                    return;
                } else {
                    tabs.push(this.getCollaborationsTab(false));
                    tab = "collaborations";
                    if (nbrOrganisations > 0) {
                        tabs.push(this.getOrganisationsTab());
                    }
                }
                break;
            default:
                if (!canStayInHome) {
                    this.props.history.push("/welcome");
                    return;
                }
        }
        const tabSuggestion = this.addRequestsTabs(user, tabs, tab);
        if (role === ROLES.USER) {
            tab = tabSuggestion;
        }
        AppStore.update(s => {
            s.breadcrumb.paths = [
                {path: "/", value: I18n.t("breadcrumb.home")}
            ];
        });
        this.tabChanged(tab);
        this.setState({role: role, loading: false, tabs, tab});
    };

    addRequestsTabs = (user, tabs, tab) => {
        if (!isEmpty(user.join_requests)) {
            tabs.push(this.getMemberJoinRequestsTab(user.join_requests));
            tab = (tab !== "collaboration_requests") ? "joinrequests" : tab;
        }
        if (!isEmpty(user.collaboration_requests)) {
            tabs.push(this.getCollaborationRequestsTab(user.collaboration_requests));
            if (isEmpty(user.join_requests)) {
                tab = "collaboration_requests"
            }
        }
        return tab;
    }

    getOrganisationsTab = () =>
        <div key="organisations" name="organisations" label={I18n.t("home.tabs.organisations")}
             icon={<OrganisationsIcon/>}>
            <Organisations {...this.props}/>
        </div>

    getPlatformAdminsTab = () => {
        return (<div key="platformAdmins" name="platformAdmins" label={I18n.t("home.tabs.platformAdmins")}
                     icon={<PlatformAdminIcon/>}>
            <PlatformAdmins {...this.props}/>
        </div>)
    }

    getUsersTab = () => {
        return (<div key="users" name="users" label={I18n.t("home.tabs.users")}
                     icon={<MembersIcon/>}>
            <Users {...this.props}/>
        </div>)
    }

    getServicesTab = () => {
        return (<div key="services" name="services" label={I18n.t("home.tabs.services")} icon={<ServicesIcon/>}>
            <Services {...this.props}/>
        </div>)
    }

    getCollaborationsTab = platformAdmin => {
        return (<div key="collaborations" name="collaborations" label={I18n.t("home.tabs.collaborations")}
                     icon={<CollaborationsIcon/>}>
            <Collaborations {...this.props} platformAdmin={platformAdmin} showExpiryDate={true}
                            showLastActivityDate={true}/>
        </div>)
    }

    getMemberJoinRequestsTab = join_requests => {
        const openJoinRequests = (join_requests || []).filter(jr => jr.status === "open").length;
        return (<div key="joinrequests" name="joinrequests" label={I18n.t("home.tabs.joinRequests")}
                     icon={<JoinRequestsIcon/>}
                     notifier={openJoinRequests > 0 ? openJoinRequests : null}>
            <MemberJoinRequests join_requests={join_requests} {...this.props} />
        </div>)
    }

    getCollaborationRequestsTab = collaboration_requests => {
        const crl = (collaboration_requests || []).filter(cr => cr.status === "open").length;
        return (<div key="collaboration_requests" name="collaboration_requests"
                     label={I18n.t("home.tabs.collaborationRequests")}
                     notifier={crl > 0 ? crl : null}
                     icon={<CollaborationRequestsIcon/>}>
            <MemberCollaborationRequests {...this.props} collaboration_requests={collaboration_requests}/>
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
        const noMemberships = user.collaboration_memberships.length === 0 && user.organisation_memberships.length === 0;
        return (
            <div className="mod-home-container">
                {(user.admin || noMemberships) && <UnitHeader obj={({name: I18n.t("home.sram"), svg: Logo})}
                                                              svgClick={() => new Audio(goat).play()}/>}
                <Tabs standAlone={!user.admin} activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    };
}

export default Home;
import React from "react";
import {
    collaborationAccessAllowed,
    collaborationById,
    collaborationLiteById,
    health,
    organisationByUserSchacHomeOrganisation
} from "../api";
import "./CollaborationDetail.scss";
import I18n from "i18n-js";
import {collaborationRoles} from "../forms/constants";
import {AppStore} from "../stores/AppStore";
import UnitHeader from "../components/redesign/UnitHeader";
import Tabs from "../components/Tabs";
import {ReactComponent as CoAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {ReactComponent as EyeViewIcon} from "../icons/eye-svgrepo-com.svg";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {ReactComponent as MemberIcon} from "../icons/personal_info.svg";
import {ReactComponent as GroupsIcon} from "../icons/groups.svg";
import {ReactComponent as JoinRequestsIcon} from "../icons/connections.svg";
import {ReactComponent as AboutIcon} from "../icons/common-file-text-home.svg";
import CollaborationAdmins from "../components/redesign/CollaborationAdmins";
import SpinnerField from "../components/redesign/SpinnerField";
import UsedServices from "../components/redesign/UsedServices";
import Groups from "../components/redesign/Groups";
import AboutCollaboration from "../components/redesign/AboutCollaboration";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {isUserAllowed, ROLES} from "../utils/UserRole";
import Button from "../components/Button";
import {getParameterByName} from "../utils/QueryParameters";
import WelcomeDialog from "../components/WelcomeDialog";
import {isEmpty} from "../utils/Utils";
import JoinRequests from "../components/redesign/JoinRequests";


class CollaborationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.roleOptions = collaborationRoles.map(role => ({
            value: role,
            label: I18n.t(`profile.${role}`)
        }));

        this.state = {
            collaboration: null,
            schacHomeOrganisation: null,
            adminOfCollaboration: false,
            showMemberView: true,
            viewAsMember: false,
            loading: true,
            firstTime: false,
            tab: "admins",
            tabs: []
        }
    }

    componentDidMount = callback => {
        const params = this.props.match.params;
        if (params.id) {
            const collaboration_id = parseInt(params.id, 10);
            collaborationAccessAllowed(collaboration_id)
                .then(json => {
                    const adminOfCollaboration = json.access === "full";
                    const promises = adminOfCollaboration ? [collaborationById(collaboration_id)] :
                        [collaborationLiteById(collaboration_id), organisationByUserSchacHomeOrganisation()];
                    Promise.all(promises).then(res => {
                        const {user} = this.props;
                        let tab = params.tab || (adminOfCollaboration ? this.state.tab : "about");
                        const collaboration = res[0];
                        //mainly due to seed data
                        collaboration.join_requests = (collaboration.join_requests || [])
                            .filter(jr => !collaboration.collaboration_memberships.find(cm => cm.user.id === jr.user.id));
                        tab = collaboration.join_requests.length === 0 && tab === "joinrequests" ? "admins" : tab;
                        const schacHomeOrganisation = adminOfCollaboration ? null : res[1];
                        const orgManager = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id, null);
                        const firstTime = getParameterByName("first", window.location.search) === "true";
                        this.setState({
                            collaboration: collaboration,
                            adminOfCollaboration: adminOfCollaboration,
                            schacHomeOrganisation: schacHomeOrganisation,
                            loading: false,
                            firstTime: firstTime,
                            tabs: this.getTabs(collaboration, schacHomeOrganisation, adminOfCollaboration, false),
                            tab: tab,
                        }, () => {
                            callback && callback();
                            this.updateAppStore(collaboration, adminOfCollaboration, orgManager);
                            this.tabChanged(tab, collaboration.id);
                        });
                    });
                }).catch(() => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    componentWillUnmount() {
        AppStore.update(s => {
            s.sideComponent = null;
        });
    }

    updateAppStore = (collaboration, adminOfCollaboration, orgManager) => {
        AppStore.update(s => {
            s.breadcrumb.paths = orgManager ? [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {value: I18n.t("breadcrumb.organisations")},
                {path: `/organisations/${collaboration.organisation_id}`, value: collaboration.organisation.name},
                {value: I18n.t("breadcrumb.collaborations")},
                {path: "/", value: collaboration.name}
            ] : [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {value: I18n.t("breadcrumb.collaborations")},
                {value: collaboration.name}
            ];
            s.sideComponent = adminOfCollaboration ? this.eyeView() : null;
        });
    }

    eyeView = () => {
        const {showMemberView, adminOfCollaboration} = this.state;
        return (
            <div className={`eye-view ${showMemberView ? "admin" : "member"}`} onClick={() => {
                health().then(() => {
                    const {showMemberView, collaboration, schacHomeOrganisation} = this.state;
                    const newTab = showMemberView ? "about" : "admins";
                    this.tabChanged(newTab, collaboration.id);
                    this.setState({
                            showMemberView: !showMemberView,
                            tabs: this.getTabs(collaboration, schacHomeOrganisation, adminOfCollaboration, showMemberView),
                            tab: newTab
                        },
                        () => {
                            AppStore.update(s => {
                                s.sideComponent = this.eyeView();
                            });

                        });
                });
            }}>
                {
                    <EyeViewIcon/>}<span>{I18n.t(`models.collaboration.${showMemberView ? "viewAsMember" : "viewAsAdmin"}`)}</span>
            </div>
        );
    }

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    getTabs = (collaboration, schacHomeOrganisation, adminOfCollaboration, showMemberView) => {
        //Actually this collaboration is not for members to view
        if ((!adminOfCollaboration || showMemberView) && !collaboration.disclose_member_information) {
            return [this.getAboutTab(collaboration, showMemberView)];
        }
        const tabs = (adminOfCollaboration && !showMemberView) ?
            [
                this.getCollaborationAdminsTab(collaboration),
                this.getMembersTab(collaboration, showMemberView),
                this.getGroupsTab(collaboration, showMemberView),
                this.getServicesTab(collaboration),
                this.getJoinRequestsTab(collaboration),
            ] : [
                this.getAboutTab(collaboration, showMemberView),
                this.getMembersTab(collaboration, showMemberView),
                this.getGroupsTab(collaboration, showMemberView),
            ];
        return tabs.filter(tab => tab !== null);
    }


    getCollaborationAdminsTab = collaboration => {
        return (<div key="admins" name="admins" label={I18n.t("home.tabs.coAdmins")}
                     icon={<CoAdminIcon/>}>
            <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={true}
                                 refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getMembersTab = (collaboration, showMemberView) => {
        return (<div key="members" name="members" label={I18n.t("home.tabs.members")}
                     icon={<MemberIcon/>}>
            <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={false}
                                 showMemberView={showMemberView}
                                 refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getGroupsTab = (collaboration, showMemberView) => {
        return (<div key="groups" name="groups" label={I18n.t("home.tabs.groups")}
                     icon={<GroupsIcon/>}>
            <Groups {...this.props} collaboration={collaboration} showMemberView={showMemberView}
                    refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getJoinRequestsTab = (collaboration) => {
        return (<div key="joinrequests" name="joinrequests" label={I18n.t("home.tabs.joinRequests")}
                     icon={<JoinRequestsIcon/>}>
            <JoinRequests collaboration={collaboration}
                          refresh={callback => this.componentDidMount(callback)}
                          {...this.props} />
        </div>)
    }

    getServicesTab = collaboration => {
        return (<div key="services" name="services" label={I18n.t("home.tabs.coServices")} icon={<ServicesIcon/>}>
            <UsedServices collaboration={collaboration}
                          refresh={callback => this.componentDidMount(callback)}
                          {...this.props} />
        </div>);
    }

    getAboutTab = (collaboration, showMemberView) => {
        return (<div key="about" name="about" label={I18n.t("home.tabs.about")} icon={<AboutIcon/>}>
            <AboutCollaboration showMemberView={showMemberView}
                                collaboration={collaboration}
                                tabChanged={this.tabChanged}
                                {...this.props} />
        </div>);
    }

    tabChanged = (name, id) => {
        const collId = id || this.state.collaboration.id;
        this.setState({tab: name}, () =>
            this.props.history.replace(`/collaborations/${collId}/${name}`));
    }


    getAdminHeader = collaboration => {
        if (!collaboration.disclose_member_information) {
            return I18n.t("models.collaboration.discloseNoMemberInformation");
        }
        const admins = collaboration.collaboration_memberships
            .filter(m => m.role === "admin")
            .map(m => m.user);

        if (admins.length === 0) {
            return I18n.t("models.collaboration.noAdminsHeader");
        }
        if (admins.length === 1) {
            return I18n.t("models.collaboration.adminsHeader", {name: admins[0].name});
        }
        return I18n.t("models.collaboration.multipleAdminsHeader", {name: admins[0].name, nbr: admins.length - 1});
    }

    createCollaborationRequest = () => {
        const {collaboration} = this.state;
        this.props.history.push(`/new-collaboration?organisationId=${collaboration.organisation_id}`);
    }

    getUnitHeaderForMember(collaboration, user, schacHomeOrganisation) {
        const showRequestCollaboration = user.collaboration_memberships.length === 1 && !isEmpty(schacHomeOrganisation);
        return (
            <div className="unit-header-container">
                <div className="unit-header-custom">
                    <CollaborationsIcon/>
                    <div className="unit-custom-right">
                        <h1>{collaboration.name}</h1>
                        <span className="organisation">{collaboration.organisation.name}</span>
                        <div className={"unit-middle"}>
                            <img src={`data:image/jpeg;base64,${collaboration.logo}`} alt={collaboration.name}/>
                            <section className="unit-info">
                                <ul>
                                    <li><FontAwesomeIcon
                                        icon="users"/><span>{I18n.t("models.collaboration.memberHeader", {
                                        nbrMember: collaboration.collaboration_memberships.length,
                                        nbrGroups: collaboration.groups.length
                                    })}</span></li>
                                    <li><FontAwesomeIcon icon="user-friends"/><span
                                        dangerouslySetInnerHTML={{__html: this.getAdminHeader(collaboration)}}/></li>
                                    {collaboration.website_url &&
                                    <li><FontAwesomeIcon icon="globe"/><span>
                                        <a href={collaboration.website_url} rel="noopener noreferrer"
                                           target="_blank">{collaboration.website_url}</a>
                                    </span></li>}
                                </ul>
                            </section>
                        </div>
                    </div>
                    {showRequestCollaboration && <div className="unit-edit">
                        <Button onClick={this.createCollaborationRequest}
                                txt={I18n.t("models.collaboration.newCollaborationRequest")}/>
                    </div>}

                </div>
            </div>
        );
    }

    getUnitHeader = (user, collaboration, allowedToEdit) => {
        return <UnitHeader obj={collaboration}
                           mayEdit={allowedToEdit}
                           firstTime={user.admin ? this.onBoarding : undefined}
                           history={(user.admin && allowedToEdit) && this.props.history}
                           auditLogPath={`collaborations/${collaboration.id}`}
                           name={collaboration.name}
                           onEdit={() => this.props.history.push("/edit-collaboration/" + collaboration.id)}>
            <p>{collaboration.description}</p>
            <div className="org-attributes-container">
                <div className="org-attributes">
                    <span>{I18n.t("collaboration.joinRequests")}</span>
                    <span>{I18n.t(`collaboration.${collaboration.disable_join_requests ? "disabled" : "enabled"}`)}</span>
                </div>
                <div className="org-attributes">
                    <span>{I18n.t("collaboration.servicesRestricted")}</span>
                    <span>{I18n.t(`forms.${collaboration.services_restricted ? "yes" : "no"}`)}</span>
                </div>
            </div>
        </UnitHeader>;
    }

    render() {
        const {
            collaboration, loading, tabs, tab, adminOfCollaboration, showMemberView, firstTime, schacHomeOrganisation
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        const allowedToEdit = isUserAllowed(ROLES.COLL_ADMIN, user, collaboration.organisation_id, collaboration.id);
        return (
            <div className="mod-collaboration-detail">
                {<WelcomeDialog name={collaboration.name} isOpen={firstTime}
                                role={adminOfCollaboration ? ROLES.COLL_ADMIN : ROLES.COLL_MEMBER}
                                isOrganisation={false}
                                isAdmin={user.admin}
                                close={() => this.setState({firstTime: false})}/>}
                {(adminOfCollaboration && showMemberView) && this.getUnitHeader(user, collaboration, allowedToEdit)}
                {(!showMemberView || !adminOfCollaboration) && this.getUnitHeaderForMember(collaboration, user, schacHomeOrganisation)}
                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>

            </div>)
    }


}

export default CollaborationDetail;
import React from "react";
import {collaborationAccessAllowed, collaborationById, collaborationLiteById} from "../api";
import "./CollaborationDetail.scss";
import I18n from "i18n-js";
import {collaborationRoles} from "../forms/constants";
import {AppStore} from "../stores/AppStore";
import UnitHeader from "../components/redesign/UnitHeader";
import Tabs from "../components/Tabs";
import {ReactComponent as CoAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {ReactComponent as MemberIcon} from "../icons/personal_info.svg";
import {ReactComponent as GroupsIcon} from "../icons/groups.svg";

import CollaborationAdmins from "../components/redesign/CollaborationAdmins";
import SpinnerField from "../components/redesign/SpinnerField";
import UsedServices from "../components/redesign/UsedServices";
import Groups from "../components/redesign/Groups";


class CollaborationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.roleOptions = collaborationRoles.map(role => ({
            value: role,
            label: I18n.t(`profile.${role}`)
        }));

        this.state = {
            collaboration: null,
            adminOfCollaboration: false,
            loaded: false,
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
                    const promise = adminOfCollaboration ? collaborationById(collaboration_id) : collaborationLiteById(collaboration_id);
                    const tab = params.tab || this.state.tab;
                    promise.then(collaboration => {
                        debugger;
                        this.setState({
                            collaboration: collaboration,
                            adminOfCollaboration: adminOfCollaboration,
                            loaded: true,
                            tabs: this.getTabs(collaboration, params),
                            tab: params.tab || this.state.tab,
                        }, () => {
                            callback && callback();
                            this.updateAppStore(collaboration);
                            this.tabChanged(tab, collaboration.id);
                        });
                    });
                }).catch(() => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    getTabs = (collaboration, params) => {
        const tabs = [
            this.getCollaborationAdminsTab(collaboration),
            this.getMembersTab(collaboration),
            this.getGroupsTab(collaboration),
            this.getServicesTab(collaboration)
        ];
        return tabs;
    }

    getCollaborationAdminsTab = collaboration => {
        return (<div key="admins" name="admins" label={I18n.t("home.tabs.coAdmins")}
                     icon={<CoAdminIcon/>}>
            <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={true}
                                 refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getMembersTab = collaboration => {
        return (<div key="members" name="members" label={I18n.t("home.tabs.members")}
                     icon={<MemberIcon/>}>
            <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={false}
                                 refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getGroupsTab = collaboration => {
        return (<div key="groups" name="groups" label={I18n.t("home.tabs.groups")}
                     icon={<GroupsIcon/>}>
            <Groups {...this.props} collaboration={collaboration}
                    refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getServicesTab = collaboration => {
        return (<div key="services" name="services" label={I18n.t("home.tabs.coServices")} icon={<ServicesIcon/>}>
            <UsedServices {...this.props} collaboration={collaboration}
                          refresh={callback => this.componentDidMount(callback)}/>
        </div>);
    }

    tabChanged = (name, id) => {
        const collId = id || this.state.collaboration.id;
        this.props.history.replace(`/collaborations/${collId}/${name}`);
    }

    updateAppStore = collaboration => {
        AppStore.update(s => {
            s.breadcrumb.paths = [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {path: `/organisations/${collaboration.organisation_id}`, value: collaboration.organisation.name},
                {path: "/", value: collaboration.name}
            ];
        });

    }

    render() {
        const {
            collaboration, loaded, tabs, tab
        } = this.state;
        if (!loaded) {
            return <SpinnerField/>;
        }
        return (
            <div className="mod-collaboration-detail">
                <UnitHeader obj={collaboration} mayEdit={true} history={this.props.history}
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
                </UnitHeader>
                <Tabs initialActiveTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>

            </div>)
    }


}

export default CollaborationDetail;
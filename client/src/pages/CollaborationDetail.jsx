import React from "react";
import {collaborationAccessAllowed, collaborationById, collaborationLiteById} from "../api";
import "./CollaborationDetail.scss";
import I18n from "i18n-js";
import {collaborationRoles} from "../forms/constants";
import {AppStore} from "../stores/AppStore";
import UnitHeader from "../components/redesign/UnitHeader";
import Tabs from "../components/Tabs";
import {ReactComponent as CoAdminIcon} from "../icons/users.svg";
import CollaborationAdmins from "../components/redesign/CollaborationAdmins";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import Services from "../components/redesign/Services";
import SpinnerField from "../components/redesign/SpinnerField";
import UsedServices from "../components/redesign/UsedServices";


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

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            const collaboration_id = parseInt(params.id, 10);
            collaborationAccessAllowed(collaboration_id)
                .then(json => {
                    const adminOfCollaboration = json.access === "full";
                    const promise = adminOfCollaboration ? collaborationById(collaboration_id) : collaborationLiteById(collaboration_id);
                    const tab = params.tab || this.state.tab;
                    promise.then(collaboration => {
                        this.setState({
                            collaboration: collaboration,
                            adminOfCollaboration: adminOfCollaboration,
                            loaded: true,
                            tabs: this.getTabs(collaboration, params),
                            tab: params.tab || this.state.tab,
                        }, () => this.updateAppStore(collaboration));
                        this.tabChanged(tab, collaboration.id);
                    });
                }).catch(() => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    getTabs = (collaboration, params) => {
        const tab = params.tab || this.state.tab;
        const tabs = [
            this.getCollaborationAdminsTab(collaboration),
            // this.getGroepsTab(collaboration),
            this.getServicesTab(collaboration)
        ];
        return tabs;
    }

    getCollaborationAdminsTab = collaboration => {
        return (<div key="admins" name="admins" label={I18n.t("home.tabs.coAdmins")}
                     icon={<CoAdminIcon/>}>
            <CollaborationAdmins {...this.props} collaboration={collaboration}
                                 refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getServicesTab = collaboration => {
        return (<div key="services" name="services" label={I18n.t("home.tabs.coServices")} icon={<ServicesIcon/>}>
            <UsedServices {...this.props} collaboration={collaboration} refresh={callback => this.componentDidMount(callback)}/>
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
import React from "react";
import "./Home.scss";
import I18n from "i18n-js";
import {ReactComponent as Logo} from "../images/logo.svg";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
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

class Home extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            tabs: [],
            role: ROLES.USER,
            loaded: false,
            tab: "organisations"
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const tab = params.tab || this.state.tab;
        const {user} = this.props;
        const tabs = [];
        const promises = [];
        const role = rawGlobalUserRole(user);
        //TODO where do we go with history.props - inspect user
        switch (role) {
            case ROLES.PLATFORM_ADMIN:
                tabs.push(this.getOrganisationsTab());
                tabs.push(this.getPlatformAdminsTab());
                tabs.push(this.getServicesTab());
                break;
            case ROLES.ORG_ADMIN:
            case ROLES.ORG_MANAGER:
                const nbrOrganisations = user.organisation_memberships.length;
                const nbrCollaborations = user.organisation_memberships.length;
                if (nbrOrganisations === 1 && nbrCollaborations === 0) {
                    this.props.history.push(`/organisations/${user.organisation_memberships[0].organisation_id}`);
                } else {
                    tabs.push(this.getOrganisationsTab());
                    if (nbrCollaborations > 0) {
                        tabs.push(this.getCollaborationsTab());
                    }
                }
                break;
        }
        AppStore.update(s => {
            s.breadcrumb.paths = [{path: "/", value: I18n.t("breadcrumb.home")}];
        });
        this.tabChanged(tab);
        this.setState({role: ROLES.PLATFORM_ADMIN, loaded: true, tabs, tab});
        //
        // Promise.all([promises]).then(res => {
        //     // tabs.push(this.getPlatformAdminsTab());
        // });
    };

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
    getServicesTab = () => {
        return (<div key="services" name="services" label={I18n.t("home.tabs.services")} icon={<ServicesIcon/>}>
            <Services {...this.props}/>
        </div>)
    }

    getCollaborationsTab = () => {
        return (<div key="collaborations" name="collaborations" label={I18n.t("home.tabs.collaborations")}
                     icon={<CollaborationsIcon/>}>
            <Collaborations {...this.props} includeOrganisationName={true}/>
        </div>)
    }

    tabChanged = name => {
        this.props.history.replace(`/home/${name}`);
    }

    render() {
        const {tabs, role, loaded, tab} = this.state;
        if (!loaded) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        return (
            <div className="mod-home-container">
                {user.admin && <UnitHeader obj={({name: I18n.t("home.sram"), svg: Logo})}/>}
                <Tabs standAlone={!user.admin} initialActiveTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    };
}

export default Home;
import React from "react";
import "./Home.scss";
import goat from "./goat.wav";
import I18n from "i18n-js";
import {ReactComponent as Logo} from "../icons/ram.svg";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as PlatformAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {ReactComponent as WelcomeIcon} from "../icons/home.svg";
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
import Welcome from "../components/redesign/Welcome";

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
        let tab = params.tab || this.state.tab;
        const {user} = this.props;
        const tabs = [];
        const role = rawGlobalUserRole(user);
        const nbrOrganisations = user.organisation_memberships.length;
        const nbrCollaborations = user.collaboration_memberships.length;

        switch (role) {
            case ROLES.PLATFORM_ADMIN:
                tabs.push(this.getOrganisationsTab());
                tabs.push(this.getPlatformAdminsTab());
                tabs.push(this.getServicesTab());
                break;
            case ROLES.ORG_ADMIN:
            case ROLES.ORG_MANAGER:
                if (nbrOrganisations === 1 && nbrCollaborations === 0) {
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
                if (nbrOrganisations === 0 && nbrCollaborations === 1) {
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
                tab = "welcome";
                tabs.push(this.getWelcomeTab());
        }
        AppStore.update(s => {
            s.breadcrumb.paths = [{path: "/", value: I18n.t("breadcrumb.home")}];
        });
        this.tabChanged(tab);
        this.setState({role: role, loaded: true, tabs, tab});
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

    getWelcomeTab = () => {
        return (<div key="welcome" name="welcome" label={I18n.t("home.tabs.welcome")}
                     icon={<WelcomeIcon/>}>
            <Welcome />
        </div>)
    }
    getCollaborationsTab = ()=> {
        return (<div key="collaborations" name="collaborations" label={I18n.t("home.tabs.collaborations")}
                     icon={<CollaborationsIcon/>}>
            <Collaborations {...this.props} />
        </div>)
    }

    tabChanged = (name) => {
        this.setState({tab: name}, () =>
            this.props.history.replace(`/home/${name}`));
    }


    render() {
        const {tabs, loaded, tab} = this.state;
        if (!loaded) {
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
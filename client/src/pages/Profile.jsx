import React from "react";
import {health} from "../api";
import I18n from "i18n-js";
import "./Profile.scss";
import Tabs from "../components/Tabs";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as HomeIcon} from "../icons/home.svg";
import {ReactComponent as PersonIcon} from "../icons/personal_info.svg";

import UnitHeader from "../components/redesign/UnitHeader";
import Me from "./Me";

class Profile extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            tabs: [],
            tab: "me"
        };
    }

    componentDidMount = () => {
        health().then(() => {
            const {user} = this.props;
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {path: "", value: user.name}
                ];
            });
            this.setState({tabs: [this.getMeTab()]})
        })
    };

    getMeTab = () => {
        return (<div key="me" name="me" label={I18n.t("home.tabs.me")}
                     icon={<HomeIcon/>}>
            <Me {...this.props}/>
        </div>)
    }


    render() {
        const {
            tabs, tab
        } = this.state;
        const {user} = this.props;

        return (
            <div className="mod-user-profile">
                <UnitHeader obj={({name: I18n.t("models.users.profile", {name: user.name}), svg: PersonIcon})}
                            mayEdit={false} history={this.props.history}
                            auditLogPath={"me/me"}
                            svg={PersonIcon}
                            name={user.name}>
                    <p>{I18n.t("models.users.subProfile")}</p>
                </UnitHeader>
                    <Tabs activeTab={tab}>
                        {tabs}
                    </Tabs>
            </div>);
    };

}

export default Profile;
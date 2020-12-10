import React from "react";
import {health} from "../api";
import I18n from "i18n-js";
import "./Profile.scss";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as PersonIcon} from "../icons/personal_info.svg";

import UnitHeader from "../components/redesign/UnitHeader";
import Me from "./Me";

class Profile extends React.Component {

    componentDidMount = () => {
        health().then(() => {
            const {user} = this.props;
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {path: "", value: user.name}
                ];
            });
        })
    };

    render() {
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
                <Me {...this.props}/>
            </div>);
    };

}

export default Profile;
import React from "react";
import I18n from "../locale/I18n";
import "./Profile.scss";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as PersonIcon} from "../icons/single-neutral-check.svg";

import UnitHeader from "../components/redesign/UnitHeader";
import Me from "./Me";
import {dateFromEpoch} from "../utils/Date";

class Profile extends React.Component {

    componentDidMount = () => {
        AppStore.update(s => {
            s.breadcrumb.paths = [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {path: "", value: I18n.t("breadcrumb.profile")}
            ];
        });
    };

    render() {
        const {user} = this.props;
        const meProps = {...this.props}
        return (
            <div className="mod-user-profile">
                <UnitHeader obj={({name: I18n.t("models.users.profile", {name: user.name}), svg: PersonIcon})}
                            mayEdit={false}
                            history={this.props.history}
                            auditLogPath={"me/me"}
                            svg={PersonIcon}
                            name={user.name}>
                    <p>{I18n.t("models.users.subProfile", {date: dateFromEpoch(user.created_at)})}</p>
                </UnitHeader>
                <Me {...meProps}/>
            </div>);
    }

}

export default Profile;
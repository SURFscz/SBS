import React from "react";
import {health} from "../api";
import I18n from "i18n-js";
import "./Profile.scss";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as PersonIcon} from "../icons/personal_info.svg";

import UnitHeader from "../components/redesign/UnitHeader";
import Me from "./Me";
import SpinnerField from "../components/redesign/SpinnerField";
import {dateFromEpoch} from "../utils/Date";

class Profile extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true
        }
    }

    componentDidMount = () => {
        health().then(() => {
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {path: "", value: I18n.t("breadcrumb.profile")}
                ];
            });
            this.setState({loading: false});
        })
    };

    render() {
        const {loading} = this.state;
        if (loading) {
            return <SpinnerField/>
        }

        const {user} = this.props;
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
                <Me {...this.props}/>
            </div>);
    }

}

export default Profile;
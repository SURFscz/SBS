import React from "react";
import {auditLogsUser, findUserById} from "../api";
import I18n from "i18n-js";
import "./UserDetail.scss";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as PersonIcon} from "../icons/personal_info.svg";

import UnitHeader from "../components/redesign/UnitHeader";
import SpinnerField from "../components/redesign/SpinnerField";
import Tabs from "../components/Tabs";
import Activity from "../components/Activity";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import moment from "moment";

class UserDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            user: {},
            auditLogs: [],
            tab: "details",
            tabs: []
        }
    }

    componentDidMount = () => {
        const {id} = this.props.match.params;
        Promise.all([findUserById(id), auditLogsUser(id)])
            .then(res => {
                const user = res[0];
                const auditLogs = res[1];
                AppStore.update(s => {
                    s.breadcrumb.paths = [
                        {path: "/", value: I18n.t("breadcrumb.home")},
                        {path: "/home/users", value: I18n.t("breadcrumb.users")},
                        {path: "", value: user.name}
                    ];
                });
                const tab = this.props.match.params.tab || "details";
                const tabs = [
                    this.getDetailsTab(user),
                    this.getHistoryTab(auditLogs),
                ]
                this.setState({loading: false, user: user, auditLogs: auditLogs, tab: tab, tabs: tabs});
            })
    };

    getDetailsTab = user => {
        return (<div key="details" name="details" label={I18n.t("home.details")}
                     icon={<FontAwesomeIcon icon="vr-cardboard"/>}>
            <div className={"user-profile"}>{JSON.stringify(user)}</div>
        </div>)
    }

    getHistoryTab = auditLogs => {
        return (<div key="history" name="history" label={I18n.t("home.history")}
                     icon={<FontAwesomeIcon icon="history"/>}>
            <Activity auditLogs={auditLogs}/>
        </div>)
    }


    tabChanged = (name, id) => {
        const userId = id || this.props.match.params.id;
        this.setState({tab: name}, () =>
            this.props.history.replace(`/users/${userId}/${name}`));
    }

    render() {
        const {loading, tab, tabs} = this.state;
        if (loading) {
            return <SpinnerField/>
        }

        const {user} = this.state;
        return (
            <div className="mod-user-details">
                <UnitHeader obj={({name: user.name, svg: PersonIcon})}
                            mayEdit={false}
                            svg={PersonIcon}
                            name={user.name}>
                    <p>{I18n.t("models.users.subOtherProfile", {
                        name: user.name,
                        date: moment(user.created_at * 1000).format("LLL")
                    })}</p>
                </UnitHeader>
                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    };

}

export default UserDetail;
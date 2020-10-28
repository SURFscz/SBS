import React from "react";
import "./Organisations.scss";
import I18n from "i18n-js";
import "./Entities.scss";
import Entities from "./Entities";
import {platformAdmins} from "../../api";
import {ReactComponent as PlatformAdminIcon} from "../../icons/single-neutral-actions-key.svg";
import "./PlatformAdmins.scss";


class PlatformAdmins extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            admins: []
        };
    }

    componentDidMount = () => platformAdmins().then(res => {
        this.setState({admins: res.platform_admins});
    });

    render() {
        const {user: currentUser} = this.props;
        const {admins} = this.state;

        const columns = [
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: () => <div className="member-icon"><PlatformAdminIcon/></div>
            },
            {
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: user =>
                    <div className="user-name-email">
                        <span className="name">{user.name}</span>
                        <span className="email">{user.email}</span>
                    </div>,
            },
            {
                nonSortable: true,
                key: "member",
                header: "",
                mapper: user => user.id === currentUser.id ?
                    <span className="person-role me">{I18n.t("models.users.me")}</span> : null
            },
            {
                key: "schac_home_organisation",
                header: I18n.t("models.users.institute"),
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                mapper: () => I18n.t("models.users.platformAdmin")
            }]
        return (
            <Entities entities={admins} modelName="users" searchAttributes={["name", "email"]}
                      defaultSort="name" columns={columns}/>
        )
    }
}

export default PlatformAdmins;
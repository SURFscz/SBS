import React from "react";
import "./Organisations.scss";
import I18n from "i18n-js";
import "./Entities.scss";
import Entities from "./Entities";
import {platformAdmins} from "../../api";
import {ReactComponent as PlatformAdminIcon} from "../../icons/users.svg";
import "./PlatformAdmins.scss";
import UserColumn from "./UserColumn";
import Tooltip from "./Tooltip";
import InstituteColumn from "./InstitueColumn";


class PlatformAdmins extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            admins: [],
            loading: true
        };
    }

    componentDidMount = () => platformAdmins().then(res => {
        this.setState({admins: res.platform_admins, loading: false});
    });

    render() {
        const {user: currentUser} = this.props;
        const {admins, loading} = this.state;

        const columns = [
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: () => <div className="member-icon">
                                <Tooltip children={<PlatformAdminIcon/>} id={"platform-admin-icon"} msg={I18n.t("tooltips.platformAdmin")}/>
                              </div>
            },
            {
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: user => <UserColumn entity={{user:user}} currentUser={currentUser}/>
            },
            {
                key: "schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: user => <InstituteColumn entity={{user:user}} currentUser={currentUser}/>
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                mapper: () => I18n.t("models.users.platformAdmin")
            }]
        return (
            <Entities entities={admins}
                      modelName="users"
                      searchAttributes={["name", "email"]}
                      defaultSort="name"
                      hideTitle={true}
                      columns={columns}
                      loading={loading}
                      {...this.props}/>
        )
    }
}

export default PlatformAdmins;
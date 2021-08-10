import React from "react";
import "./Organisations.scss";
import I18n from "i18n-js";
import "./Entities.scss";
import Entities from "./Entities";
import {queryForUsers} from "../../api";
import {ReactComponent as UserIcon} from "../../icons/single-neutral.svg";
import "./Users.scss";
import UserColumn from "./UserColumn";
import Tooltip from "./Tooltip";
import {isEmpty, stopEvent} from "../../utils/Utils";
import debounce from "lodash.debounce";
import SpinnerField from "./SpinnerField";
import InstituteColumn from "./InstitueColumn";


class Users extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            searching: false,
            users: [],
            moreToShow: false,
            noResults: false
        };
    }

    openUser = user => e => {
        stopEvent(e);
        this.props.history.push(`/users/${user.id}`);
    };

    search = query => {
        if (!isEmpty(query) && query.trim().length > 2) {
            this.setState({searching: true});
            this.delayedAutocomplete(query);
        }
        if (isEmpty(query)) {
            this.setState({users: [], moreToShow: false, noResults: false});
        }
    };

    delayedAutocomplete = debounce(query => {
        queryForUsers(query).then(results => {
            this.setState({
                users: results,
                searching: false,
                moreToShow: results.length > 15,
                noResults: results.length === 0
            })
        })
    }, 200);

    moreResultsAvailable = () => (<div className="more-results-available">
        <span>{I18n.t("models.allUsers.moreResults")}</span>
    </div>)

    render() {
        const {searching, users, moreToShow, noResults} = this.state;
        const {user: currentUser} = this.props;
        const columns = [
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: () => <div className="member-icon">
                    <Tooltip children={<UserIcon/>} id={"user-icon"} msg={I18n.t("tooltips.user")}/>
                </div>
            },
            {
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: user => <UserColumn entity={{user: user}} currentUser={currentUser}/>
            },
            {
                key: "schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: user => <InstituteColumn entity={{user:user}} currentUser={currentUser}/>
            },
            {
                key: "affiliation",
                header: I18n.t("models.allUsers.affiliation")
            },
            {
                key: "username",
                header: I18n.t("models.allUsers.username")
            },
            {
                key: "uid",
                header: I18n.t("models.allUsers.uid")
            }]
        return (<div className="mod-users">
            {searching && <SpinnerField/>}
            <Entities entities={users}
                      modelName="allUsers"
                      defaultSort="name"
                      filters={moreToShow && this.moreResultsAvailable()}
                      columns={columns}
                      customNoEntities={noResults ? I18n.t("models.allUsers.noResults") : I18n.t("models.allUsers.noEntities")}
                      loading={false}
                      inputFocus={true}
                      customSearch={this.search}
                      rowLinkMapper={() => this.openUser}
                      {...this.props}/>
        </div>)
    }
}

export default Users;
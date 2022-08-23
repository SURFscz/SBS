import React from "react";
import "./Organisations.scss";
import I18n from "i18n-js";
import "./Entities.scss";
import Entities from "./Entities";
import {queryForOrganisationInvites, queryForOrganisationUsers, queryForUsers} from "../../api";
import {ReactComponent as UserIcon} from "../../icons/single-neutral.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import "./Users.scss";
import UserColumn from "./UserColumn";
import Tooltip from "./Tooltip";
import {isEmpty, stopEvent} from "../../utils/Utils";
import debounce from "lodash.debounce";
import SpinnerField from "./SpinnerField";
import InstituteColumn from "./InstitueColumn";
import {ReactComponent as HandIcon} from "../../icons/toys-hand-ghost.svg";
import {emitImpersonation} from "../../utils/Impersonation";


class Users extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            searching: false,
            users: [],
            invitations: [],
            moreToShow: false,
            noResults: false
        };
    }

    openUser = user => e => {
        const {organisation} = this.props;
        let path;
        if (user.isUser) {
            path = organisation ? `/users/${user.id}/details/${organisation.id}` : `/users/${user.id}`
        } else {
            //user is an invitation instance
            path = `/collaborations/${user.collaboration_id}`;
        }
        if (e.metaKey || e.ctrlKey) {
            window.open(path, '_blank');
        } else {
            stopEvent(e);
            this.props.history.push(path);
        }
    };

    search = query => {
        if (!isEmpty(query) && query.trim().length > 2) {
            this.setState({searching: true});
            this.delayedAutocomplete(query);
        }
        if (isEmpty(query)) {
            this.setState({users: [], invitations: [], moreToShow: false, noResults: false});
        }
    };

    delayedAutocomplete = debounce(query => {
        const {adminSearch} = this.props;
        if (adminSearch) {
            queryForUsers(query).then(results => {
                results.forEach(user => user.isUser = true);
                this.setState({
                    users: results,
                    searching: false,
                    moreToShow: false,
                    noResults: results.length === 0
                })
            });
        } else {
            const {organisation} = this.props;
            Promise.all([
                queryForOrganisationInvites(organisation.id, query),
                queryForOrganisationUsers(organisation.id, query)
            ]).then(results => {
                results[0].forEach(invite => invite.invite = true)
                results[1].forEach(user => user.isUser = true)
                this.setState({
                    invitations: results[0],
                    users: results[1],
                    searching: false,
                    moreToShow: false,
                    noResults: results[0].length === 0 && results[1].length === 0
                })
            })
        }
    }, 200);

    moreResultsAvailable = () => (<div className="more-results-available">
        <span>{I18n.t("models.allUsers.moreResults")}</span>
    </div>)

    gotoInvitation = invitation => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${invitation.collaboration_id}`);
    };


    render() {
        const {searching, users, invitations, moreToShow, noResults} = this.state;
        const {user: currentUser, adminSearch} = this.props;
        const columns = [
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: entity => <div className="member-icon">
                    {entity.isUser ? <Tooltip children={<UserIcon/>} id={"user-icon"} msg={I18n.t("tooltips.user")}/> :
                        <Tooltip children={<InviteIcon/>} id={"invite-icon"} msg={I18n.t("tooltips.invitations")}/>}
                </div>
            },
            {
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: user => user.isUser ? <UserColumn entity={{user: user}} currentUser={currentUser}/> :
                    <UserColumn entity={user}
                                currentUser={currentUser}
                                gotoInvitation={this.gotoInvitation}/>
            },
            {
                key: "schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: user => user.isUser && <InstituteColumn entity={{user: user}} currentUser={currentUser}/>
            },
            {
                key: "affiliation",
                header: I18n.t("models.allUsers.affiliation"),
                mapper: user => user.isUser ? user.affiliation : "-"
            },
            {
                key: "username",
                header: I18n.t("models.allUsers.username"),
                mapper: user => user.isUser ? user.username : "-"
            },
            {
                key: "uid",
                header: I18n.t("models.allUsers.uid"),
                mapper: user => user.isUser ? user.uid : "-"
            }];
        const showImpersonation = currentUser.admin && this.props.config.impersonation_allowed;
        if (showImpersonation) {
            columns.push({
                nonSortable: true,
                key: "icon",
                hasLink: true,
                header: "",
                mapper: user => (currentUser.id !== user.id && user.isUser) ? <HandIcon className="impersonate"
                                                                                        onClick={() => emitImpersonation(user, this.props.history)}/> : null
            })
        }
        const countUsers = users.length;
        const countInvitations = invitations.length;
        const hasEntities = countUsers > 0 || countInvitations > 0;
        let title = "";

        if (hasEntities) {
            title = I18n.t(`models.allUsers.found`, {
                count: countUsers,
                plural: I18n.t(`models.allUsers.${countUsers === 1 ? "singleUser" : "multipleUsers"}`)
            })
            if (!adminSearch) {
                title += I18n.t("models.allUsers.and")
                title += I18n.t(`models.allUsers.found`, {
                    count: countInvitations,
                    plural: I18n.t(`models.allUsers.${countInvitations === 1 ? "singleInvitation" : "multipleInvitations"}`)
                })
            }
        }
        return (<div className="mod-users">
            {searching && <SpinnerField/>}
            <Entities entities={users.concat(invitations)}
                      modelName="allUsers"
                      defaultSort="name"
                      filters={moreToShow && this.moreResultsAvailable()}
                      columns={columns}
                      title={title}
                      hideTitle={!hasEntities || noResults}
                      customNoEntities={I18n.t(`models.allUsers.${noResults ? "noResults" : "noEntities"}${adminSearch ? "" : "Invitations"}`)}
                      loading={false}
                      inputFocus={true}
                      customSearch={this.search}
                      rowLinkMapper={() => this.openUser}
                      {...this.props}/>
        </div>)
    }
}

export default Users;
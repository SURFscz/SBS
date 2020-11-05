import React from "react";
import I18n from "i18n-js";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/toys-hand-ghost.svg";
import CheckBox from "../CheckBox";
import {deleteCollaborationMembership, invitationDelete, updateCollaborationMembershipRole} from "../../api";
import {setFlash} from "../../utils/Flash";
import "./CollaborationAdmins.scss";
import Select from "react-select";
import {emitter} from "../../utils/Events";
import {shortDateFromEpoch} from "../../utils/Date";
import {stopEvent} from "../../utils/Utils";
import Button from "../Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../ConfirmationDialog";
import UserColumn from "./UserColumn";

const roles = [
    {value: "admin", label: I18n.t(`organisation.admin`)},
    {value: "member", label: I18n.t(`organisation.member`)}
];

const memberFilterValue = "members";

class CollaborationAdmins extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedMembers: {},
            allSelected: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            filterOptions: [],
            filterValue: {value: memberFilterValue, label: ""},
            hideInvitees: false
        }
    }

    componentDidMount = () => {
        const {collaboration} = this.props;
        const admins = collaboration.collaboration_memberships;
        const invites = collaboration.invitations;
        const entities = admins.concat(invites);
        const selectedMembers = entities.reduce((acc, entity) => {
            acc[entity.id] = {selected: false, ref: entity};
            return acc;
        }, {});
        const filterOptions = [{
            label: I18n.t("models.collaborations.allMembers", {count: admins.length}),
            value: memberFilterValue
        }];
        const groupOptions = collaboration.groups
            .map(group => ({
                label: `${group.name} (${group.collaboration_memberships.length})`,
                value: group.name
            }));
        this.setState({
            selectedMembers,
            filterValue: filterOptions[0],
            filterOptions: filterOptions.concat(groupOptions)
        });
    }

    changeMemberRole = member => selectedOption => {
        const {collaboration} = this.props;
        const currentRole = collaboration.collaboration_memberships.find(m => m.user.id === member.user.id).role;
        if (currentRole === selectedOption.value) {
            return;
        }
        updateCollaborationMembershipRole(collaboration.id, member.user.id, selectedOption.value)
            .then(() => {
                this.props.refresh(this.componentDidMount);
                setFlash(I18n.t("collaborationDetail.flash.memberUpdated", {
                    name: member.user.name,
                    role: selectedOption.value
                }));
            });
    };

    onCheck = memberShip => e => {
        const {selectedMembers} = this.state;
        selectedMembers[memberShip.id].selected = e.target.checked;
        this.setState({selectedMembers: {...selectedMembers}});
    }

    allSelected = e => {
        const {selectedMembers} = this.state;
        const val = e.target.checked;
        Object.keys(selectedMembers).forEach(id => selectedMembers[id].selected = val);
        const newSelectedMembers = {...selectedMembers};
        this.setState({allSelected: val, ...newSelectedMembers});
    }

    gotoInvitation = invitation => e => {
        stopEvent(e);
        this.props.history.push(`/invitations/${invitation.id}`);
    };

    remove = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: this.remove(false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("collaborationDetail.deleteEntitiesConfirmation"),
            });
        } else {
            this.setState({confirmationDialogOpen: false});
            const {selectedMembers} = this.state;
            const {collaboration} = this.props;

            const promises = Object.keys(selectedMembers)
                .filter(id => selectedMembers[id].selected)
                .map(id => {
                    const ref = selectedMembers[id].ref;
                    ref.invite ? invitationDelete(ref.id) :
                        deleteCollaborationMembership(collaboration.id, ref.user.id)
                });
            Promise.all(promises).then(() => {
                this.props.refresh(this.componentDidMount);
                setFlash(I18n.t("collaborationDetail.flash.entitiesDeleted"));
            });
        }
    }

    filterEntities = (isAdminView, members, filterValue, collaboration, hideInvitees, invites) => {
        let entities = isAdminView ? members.filter(m => m.role === "admin") : members;
        if (memberFilterValue !== filterValue.value && !isAdminView) {
            entities = entities.filter(e => collaboration.groups.find(g => g.name === filterValue.value).collaboration_memberships.some(m => m.id === e.id));
        }
        const invitesFiltered = hideInvitees ? [] : isAdminView ? invites.filter(invite => invite.intended_role === "admin") : invites;
        return entities.concat(invitesFiltered);
    }

    actionButtons = (selectedMembers, filteredEntities) => {
        const selected = Object.values(selectedMembers)
            .filter(v => v.selected)
            .filter(v => filteredEntities.find(e => e.id === v.ref.id && e.invite === v.ref.invite))
        const hrefValue = encodeURI(selected.map(v => v.ref.invite ? v.ref.invitee_email : v.ref.user.email).join(","));
        const disabled = selected.length === 0;
        return (
            <div className="admin-actions">
                <Button onClick={this.remove(true)} txt={I18n.t("models.orgMembers.remove")}
                        disabled={disabled}
                        icon={<FontAwesomeIcon icon="trash"/>}/>
                <a href={`mailto:${hrefValue}`} className={`${disabled ? "disabled" : ""} button`}
                   target="_blank" rel="noopener noreferrer">
                    {I18n.t("models.orgMembers.mail")}<FontAwesomeIcon icon="mail-bulk"/>
                </a>
            </div>);
    }

    filter = (filterOptions, filterValue, hideInvitees) => {
        return (
            <div className="member-filter">
                <Select
                    className={"member-filter-select"}
                    value={filterValue}
                    onChange={option => this.setState({filterValue: option})}
                    options={filterOptions}
                    isSearchable={false}
                    isClearable={false}
                />
                <CheckBox name="hide_invitees" value={hideInvitees}
                          onChange={e => this.setState({hideInvitees: e.target.checked})}
                          info={I18n.t("models.collaborations.hideInvites")}/>
            </div>
        );
    }

    render() {
        const {user: currentUser, collaboration, isAdminView} = this.props;
        const {
            selectedMembers, allSelected, filterOptions, filterValue, hideInvitees,
            confirmationDialogOpen, cancelDialogAction,
            confirmationDialogAction, confirmationQuestion
        } = this.state;
        const members = collaboration.collaboration_memberships;
        const invites = collaboration.invitations;
        invites.forEach(invite => invite.invite = true);
        const isAdmin = currentUser.admin;

        let i = 0;
        const columns = [
            {
                nonSortable: true,
                key: "check",
                header: <CheckBox value={allSelected} name={"allSelected"}
                                  onChange={this.allSelected}/>,
                mapper: entity => <div className="check">
                    <CheckBox name={"" + ++i} onChange={this.onCheck(entity)}
                              value={(selectedMembers[entity.id] || {}).selected || false}/>
                </div>
            },
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: entity => <div className="member-icon">
                    {entity.invite && <InviteIcon/>}
                    {!entity.invite && <UserIcon/>}
                </div>
            },
            {
                nonSortable: true,
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={currentUser} gotoInvitation={this.gotoInvitation}/>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: entity => entity.invite ? "" : entity.user.schac_home_organisation
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                mapper: entity => entity.invite ? I18n.t(`organisation.${entity.intended_role}`) : <Select
                    value={roles.find(option => option.value === entity.role)}
                    options={roles}
                    onChange={this.changeMemberRole(entity)}
                    isDisabled={!isAdmin}/>
            },
            {
                nonSortable: true,
                key: "status",
                header: I18n.t("models.orgMembers.status"),
                mapper: entity => entity.invite ?
                    <span
                        className="person-role invite">{I18n.t("models.orgMembers.inviteSend",
                        {date: shortDateFromEpoch(entity.created_at)})}</span> :
                    <span className="person-role accepted">{I18n.t("models.orgMembers.accepted")}</span>
            },
            {
                nonSortable: true,
                key: "impersonate",
                header: "",
                mapper: entity => entity.invite ? null :
                    <div className="impersonate" onClick={() => {
                        emitter.emit("impersonation", entity.user);
                        setTimeout(() => this.props.history.push("/home"), 1000);
                    }}>
                        <HandIcon/>
                    </div>
            },
        ]
        const filteredEntities = this.filterEntities(isAdminView, members, filterValue, collaboration, hideInvitees, invites);

        return (<>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}/>

                <Entities entities={filteredEntities} modelName={isAdminView ? "coAdmins" : "members"}
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name" columns={columns} loading={false}
                          showNew={isAdmin}
                          filters={isAdminView ? null : this.filter(filterOptions, filterValue, hideInvitees)}
                          actions={this.actionButtons(selectedMembers, filteredEntities)}
                          newEntityPath={`/new-invite/${collaboration.id}`}
                          {...this.props}/>
            </>
        )
    }

}

export default CollaborationAdmins;
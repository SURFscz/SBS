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

const roles = [
    {value: "admin", label: I18n.t(`organisation.admin`)},
    {value: "member", label: I18n.t(`organisation.member`)}
];

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
        }, {})
        this.setState({selectedMembers});
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

    actionButtons = selectedMembers => {
        const anySelected = Object.values(selectedMembers).some(v => v.selected);
        return (
            <div className="admin-actions">
                <Button onClick={this.remove(true)} txt={I18n.t("models.orgMembers.remove")}
                        disabled={!anySelected}
                        icon={<FontAwesomeIcon icon="trash"/>}/>
            </div>);
    }

    render() {
        const {user: currentUser, collaboration} = this.props;
        const {
            selectedMembers, allSelected, confirmationDialogOpen, cancelDialogAction,
            confirmationDialogAction, confirmationQuestion
        } = this.state;
        const admins = collaboration.collaboration_memberships;
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
                mapper: entity =>
                    <div className="user-name-email">
                        <span className="name">{entity.invite ? "-" : entity.user.name}</span>
                        {entity.invite && <span className="email">
                            <a href="" onClick={this.gotoInvitation(entity)}>{entity.invitee_email}</a>
                        </span>}
                        {!entity.invite && <span className="email">{entity.user.email}</span>}
                    </div>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: entity => entity.invite ? "" : entity.user.schac_home_organisation
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                mapper: entity => entity.invite ? null : <Select
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
        return (<>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}/>

                <Entities entities={admins.concat(invites)} modelName="coAdmins"
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name" columns={columns} loading={false}
                          showNew={isAdmin}
                          actions={this.actionButtons(selectedMembers)}
                          newEntityPath={`/new-invite/${collaboration.id}`}
                          {...this.props}/>
            </>
        )
    }
}

export default CollaborationAdmins;
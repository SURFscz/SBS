import React from "react";
import I18n from "i18n-js";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/toys-hand-ghost.svg";
import CheckBox from "../CheckBox";
import {
    createCollaborationMembershipRole,
    deleteCollaborationMembership,
    invitationDelete,
    invitationResend,
    updateCollaborationMembershipRole
} from "../../api";
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
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import SpinnerField from "./SpinnerField";
import moment from "moment";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import InputField from "../InputField";

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
            selectedInvitationId: null,
            message: "",
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            isWarning: true,
            filterOptions: [],
            filterValue: {value: memberFilterValue, label: ""},
            hideInvitees: false,
            loading: true
        }
    }

    componentDidMount = () => {
        const {collaboration} = this.props;
        const admins = collaboration.collaboration_memberships;
        const invites = collaboration.invitations || [];
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
            filterOptions: filterOptions.concat(groupOptions),
            loading: false,
            selectedInvitationId: null,
            message: ""
        });
    }

    changeMemberRole = member => selectedOption => {
        const {collaboration, user: currentUser} = this.props;
        const currentRole = collaboration.collaboration_memberships.find(m => m.user.id === member.user.id).role;
        if (currentRole === selectedOption.value) {
            return;
        }
        if (member.user.id === currentUser.id && !currentUser.admin) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => {
                    this.setState({loading: true});
                    updateCollaborationMembershipRole(collaboration.id, member.user.id, selectedOption.value)
                        .then(() => {
                            this.props.refreshUser(() => this.props.history.push("/home"));
                            setFlash(I18n.t("collaborationDetail.flash.memberUpdated", {
                                name: member.user.name,
                                role: selectedOption.value
                            }));
                        });
                },
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("collaborationDetail.downgradeYourselfMemberConfirmation"),
            });
        } else {
            this.setState({loading: true});
            updateCollaborationMembershipRole(collaboration.id, member.user.id, selectedOption.value)
                .then(() => {
                    this.props.refresh(this.componentDidMount);
                    setFlash(I18n.t("collaborationDetail.flash.memberUpdated", {
                        name: member.user.name,
                        role: selectedOption.value
                    }));
                });

        }
    };

    onCheck = memberShip => e => {
        const {selectedMembers, allSelected} = this.state;
        const checked = e.target.checked;
        selectedMembers[memberShip.id].selected = checked;
        this.setState({selectedMembers: {...selectedMembers}, allSelected: checked ? allSelected : false});
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
        const {collaboration} = this.props;
        const selectedInvitation = collaboration.invitations.find(i => i.id === invitation.id)
        this.setState({selectedInvitationId: selectedInvitation.id, message: selectedInvitation.message});
    };

    getSelectedInvitation = () => {
        const {selectedInvitationId} = this.state;
        const {collaboration} = this.props;
        return (collaboration.invitations || []).find(i => i.id === selectedInvitationId);
    }

    remove = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: true,
                confirmationDialogAction: this.remove(false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("collaborationDetail.deleteEntitiesConfirmation"),
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            const {selectedMembers} = this.state;
            const {user: currentUser, collaboration} = this.props;
            const currentUserDeleted = Object.values(selectedMembers)
                .some(sr => sr.selected && !sr.ref.invite && sr.ref.user.id === currentUser.id);
            const selected = Object.keys(selectedMembers)
                .filter(id => selectedMembers[id].selected);
            const promises = selected.map(id => {
                const ref = selectedMembers[id].ref;
                return ref.invite ? invitationDelete(ref.id) :
                    deleteCollaborationMembership(collaboration.id, ref.user.id)
            });
            Promise.all(promises).then(() => {
                if (currentUserDeleted && !currentUser.admin) {
                    this.props.refreshUser(() => this.props.history.push("/home"));
                } else {
                    this.props.refresh(this.componentDidMount);
                    setFlash(I18n.t("organisationDetail.flash.entitiesDeleted"));
                }
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

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({loading: true});
        promise.then(() => {
            this.props.refresh(() => {
                this.componentDidMount();
                setFlash(flashMsg);
                callback && callback();
            });
        });
    }

    actionButtons = (isAdminOfCollaboration, selectedMembers, filteredEntities, members, currentUser) => {
        if (!isAdminOfCollaboration) {
            return null;
        }
        const isMember = members.some(m => m.user.id === currentUser.id);
        const any = filteredEntities.length !== 0;
        const selected = Object.values(selectedMembers)
            .filter(v => v.selected)
            .filter(v => filteredEntities.find(e => e.id === v.ref.id && e.invite === v.ref.invite))
        const hrefValue = encodeURI(selected.map(v => v.ref.invite ? v.ref.invitee_email : v.ref.user.email).join(","));
        const disabled = selected.length === 0;
        return (
            <div className="admin-actions">
                {any && <Button onClick={this.remove(true)} txt={I18n.t("models.orgMembers.remove")}
                                disabled={disabled}
                                icon={<FontAwesomeIcon icon="trash"/>}/>}
                {any && <a href={`mailto:${hrefValue}`} className={`${disabled ? "disabled" : ""} button`}
                           target="_blank" rel="noopener noreferrer">
                    {I18n.t("models.orgMembers.mail")}<FontAwesomeIcon icon="mail-bulk"/>
                </a>}
                {!isMember && <Button className="right" txt={I18n.t("collaborationDetail.addMe")} onClick={() => {
                    this.setState({loading: true});
                    createCollaborationMembershipRole(this.props.collaboration.id).then(() => {
                        this.props.refreshUser(() => this.props.refresh(this.componentDidMount));
                        setFlash(I18n.t("collaborationDetail.flash.meAdded", {name: this.props.collaboration.name}));
                    })
                }
                }/>}
            </div>);
    }

    filter = (filterOptions, filterValue, hideInvitees, isAdminOfCollaboration) => {
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
                {isAdminOfCollaboration && <CheckBox name="hide_invitees" value={hideInvitees}
                                                     onChange={e => this.setState({hideInvitees: e.target.checked})}
                                                     info={I18n.t("models.collaborations.hideInvites")}/>}
            </div>
        );
    }

    doDeleteMe = () => {
        this.setState({confirmationDialogOpen: false, loading: true});
        const {collaboration, user} = this.props;
        deleteCollaborationMembership(collaboration.id, user.id)
            .then(() => {
                const canStay = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id)
                this.props.refreshUser(() => {
                    if (canStay) {
                        this.refreshAndFlash(Promise.resolve(),
                            I18n.t("organisationDetail.flash.memberDeleted", {name: user.name}),
                            () => this.setState({confirmationDialogOpen: false, loading: false}));
                    } else {
                        this.props.history.push("/home");
                    }
                })
            });
    };

    deleteMe = () => {
        const {collaboration, user} = this.props;
        const canStay = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id);
        if (canStay) {
            this.doDeleteMe()
        } else {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t("collaborationDetail.deleteYourselfMemberConfirmation"),
                confirmationDialogAction: this.doDeleteMe
            });
        }
    };

    getImpersonateMapper = entity => {
        const {user: currentUser} = this.props;
        if (entity.invite) {
            return <Button onClick={this.gotoInvitation(entity)} txt={I18n.t("forms.open")} small={true}/>
        }
        if (entity.user.id === currentUser.id) {
            return <Button onClick={this.deleteMe} txt={I18n.t("models.collaboration.leave")} small={true}/>
        }
        if (!currentUser.admin || entity.user.id === currentUser.id) {
            return null;
        }
        return (<div className="impersonate" onClick={() =>
            emitter.emit("impersonation",
                {"user": entity.user, "callback": () => this.props.history.push("/home")})}>
            <HandIcon/>
        </div>);
    }

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({selectedInvitationId: null, message: "", confirmationDialogOpen: false});
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            isWarning: true,
            confirmationQuestion: I18n.t("organisationInvitation.deleteInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const invitation = this.getSelectedInvitation();
        const {collaboration} = this.props;
        this.refreshAndFlash(invitationDelete(invitation.id),
            I18n.t("organisationInvitation.flash.inviteDeleted", {name: collaboration.name}),
            this.cancelSideScreen)
    };

    resend = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            isWarning: false,
            confirmationQuestion: I18n.t("organisationInvitation.resendInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doResend
        });
    };

    doResend = () => {
        const invitation = this.getSelectedInvitation();
        const {collaboration} = this.props;
        const {message} = this.state;
        this.refreshAndFlash(invitationResend({...invitation, message}),
            I18n.t("organisationInvitation.flash.inviteResend", {name: collaboration.name}),
            this.cancelSideScreen);
    };

    renderSelectedInvitation = (collabortion, invitation) => {
        const {
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion,
            isWarning, message
        } = this.state;
        const today = moment();
        const inp = moment(invitation.expiry_date * 1000);
        const isExpired = today.isAfter(inp);
        const expiredMessage = isExpired ? I18n.t("organisationInvitation.expiredAdmin", {expiry_date: inp.format("LL")}) : null;
        return (
            <div className="collaboration-invitation-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={isWarning}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}/>
                <a className="back-to-org-members" onClick={this.cancelSideScreen} href={"/cancel"}>
                    <ChevronLeft/>{I18n.t("models.orgMembers.backToMembers")}
                </a>
                <div className="collaboration-invitation-form">
                    {isExpired &&
                    <p className="error">{expiredMessage}</p>}
                    <h2>{I18n.t("models.orgMembers.invitation",
                        {
                            date: moment(invitation.created_at * 1000).format("LL"),
                            inviter: invitation.user.name,
                            email: invitation.invitee_email
                        })}</h2>

                    <InputField value={I18n.t(`organisation.${invitation.intended_role}`)}
                                noInput={true}
                                name={I18n.t("organisationInvitation.role")}
                                disabled={true}/>

                    <InputField value={message}
                                name={I18n.t("organisationInvitation.message")}
                                toolTip={I18n.t("organisationInvitation.messageTooltip", {name: invitation.user.name})}
                                onChange={e => this.setState({message: e.target.value})}
                                large={true}
                                multiline={true}/>

                    <section className="actions">
                        <Button warningButton={true} txt={I18n.t("organisationInvitation.delete")}
                                onClick={this.delete}/>
                        <Button txt={I18n.t("organisationInvitation.resend")}
                                onClick={this.resend}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancelSideScreen}/>
                    </section>
                </div>
            </div>)

    }


    render() {
        const {user: currentUser, collaboration, isAdminView, showMemberView} = this.props;
        const {
            selectedMembers, allSelected, filterOptions, filterValue, hideInvitees,
            confirmationDialogOpen, cancelDialogAction, isWarning,
            confirmationDialogAction, confirmationQuestion, loading
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const selectedInvitation = this.getSelectedInvitation();
        if (selectedInvitation) {
            return this.renderSelectedInvitation(collaboration, selectedInvitation);
        }

        const isAdminOfCollaboration = isUserAllowed(ROLES.COLL_ADMIN, currentUser, collaboration.organisation_id, collaboration.id) && !showMemberView;
        const members = collaboration.collaboration_memberships;
        const invites = collaboration.invitations || [];
        invites.forEach(invite => invite.invite = true);

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
                mapper: entity => <UserColumn entity={entity} currentUser={currentUser}
                                              gotoInvitation={this.gotoInvitation}/>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: entity => entity.invite ? "" : entity.user.schac_home_organisation
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                mapper: entity => entity.invite ? I18n.t(`organisation.${entity.intended_role}`) :
                    <Select value={roles.find(option => option.value === entity.role)}
                            options={roles}
                            classNamePrefix="select-role"
                            onChange={this.changeMemberRole(entity)}
                            isDisabled={!isAdminOfCollaboration}/>
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
                mapper: this.getImpersonateMapper
            },
        ]
        const doHideInvitees = hideInvitees || showMemberView;
        const filteredEntities = this.filterEntities(isAdminView, members, filterValue, collaboration, doHideInvitees,
            invites);

        return (<>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={isWarning}
                                    question={confirmationQuestion}/>

                <Entities entities={filteredEntities}
                          modelName={isAdminView ? "coAdmins" : "members"}
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name"
                          columns={isAdminOfCollaboration ? columns : columns.slice(1)}
                          loading={false}
                          rowLinkMapper={entity => entity.invite && this.gotoInvitation}
                          showNew={isAdminOfCollaboration}
                          filters={isAdminView ? null : this.filter(filterOptions, filterValue, hideInvitees, isAdminOfCollaboration)}
                          actions={this.actionButtons(isAdminOfCollaboration, selectedMembers, filteredEntities, members, currentUser)}
                          newEntityPath={`/new-invite/${collaboration.id}?isAdminView=${isAdminView}`}
                          {...this.props}/>
            </>
        )
    }

}

export default CollaborationAdmins;
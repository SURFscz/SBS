import React from "react";
import I18n from "i18n-js";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as MembersIcon} from "../../icons/single-neutral.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/toys-hand-ghost.svg";
import CheckBox from "../CheckBox";
import {
    deleteCollaborationMembership,
    invitationDelete,
    invitationResend,
    updateCollaborationMembershipRole
} from "../../api";
import {setFlash} from "../../utils/Flash";
import "./CollaborationAdmins.scss";
import Select from "react-select";
import {emitter} from "../../utils/Events";
import {isInvitationExpired, shortDateFromEpoch} from "../../utils/Date";
import {isEmpty, stopEvent} from "../../utils/Utils";
import Button from "../Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../ConfirmationDialog";
import UserColumn from "./UserColumn";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import SpinnerField from "./SpinnerField";
import moment from "moment";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import InputField from "../InputField";
import ErrorIndicator from "./ErrorIndicator";
import Tooltip from "./Tooltip";
import ReactTooltip from "react-tooltip";
import LastAdminWarning from "./LastAdminWarning";

const roles = [
    {value: "admin", label: I18n.t(`organisation.admin`)},
    {value: "member", label: I18n.t(`organisation.member`)}
];

const memberFilterValue = "members";

const INVITE_IDENTIFIER = "INVITE_IDENTIFIER";
const MEMBER_IDENTIFIER = "MEMBER_IDENTIFIER";

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
            lastAdminWarning: false,
            lastAdminWarningUser: false,
            isWarning: true,
            filterOptions: [],
            filterValue: {value: memberFilterValue, label: ""},
            hideInvitees: false,
            resultAfterSearch: false,
            loading: true
        }
    }

    componentDidMount = () => {
        const {collaboration} = this.props;
        const admins = collaboration.collaboration_memberships;
        const invites = collaboration.invitations || [];
        const entities = admins.concat(invites);
        const selectedMembers = entities.reduce((acc, entity) => {
            acc[this.getIdentifier(entity)] = {selected: false, ref: entity, invite: !isEmpty(entity.intended_role)};
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
            message: "",
            allSelected: false
        });
    }

    changeMemberRole = member => selectedOption => {
        const {collaboration, user: currentUser} = this.props;
        const currentRole = collaboration.collaboration_memberships.find(m => m.user_id === member.user_id).role;
        if (currentRole === selectedOption.value) {
            return;
        }
        const admins = collaboration.collaboration_memberships
            .filter(m => m.role === "admin");
        const lastAdminWarning = admins.length === 1 && selectedOption.value !== "admin";
        const canStay = isUserAllowed(ROLES.ORG_MANAGER, currentUser, collaboration.organisation_id);
        if ((member.user_id === currentUser.id && !canStay) || lastAdminWarning) {
            this.setState({
                confirmationDialogOpen: true,
                lastAdminWarning: lastAdminWarning,
                lastAdminWarningUser: lastAdminWarning && member.user_id === currentUser.id,
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                confirmationDialogAction: () => {
                    this.setState({loading: true});
                    updateCollaborationMembershipRole(collaboration.id, member.user_id, selectedOption.value)
                        .then(() => {
                            this.props.refreshUser(() => {
                                if (!canStay) {
                                    this.props.history.push("/home");
                                } else {
                                    this.componentDidMount();
                                }
                            });
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
            updateCollaborationMembershipRole(collaboration.id, member.user_id, selectedOption.value)
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
        const identifier = this.getIdentifier(memberShip);
        selectedMembers[identifier].selected = checked;
        this.setState({selectedMembers: {...selectedMembers}, allSelected: checked ? allSelected : false});
    }

    getIdentifier = entity => {
        const invite = !isEmpty(entity.intended_role);
        return entity.id + (invite ? INVITE_IDENTIFIER : MEMBER_IDENTIFIER);
    }

    allSelected = e => {
        const {selectedMembers, resultAfterSearch, filterValue, hideInvitees} = this.state;
        const {isAdminView, collaboration, showMemberView} = this.props;
        const doHideInvitees = hideInvitees || showMemberView;
        const members = collaboration.collaboration_memberships;
        const invites = collaboration.invitations || [];

        const filteredEntityIdentifiers = this.filterEntities(isAdminView, members, filterValue, collaboration, doHideInvitees,
            invites).map(entity => this.getIdentifier(entity));

        const val = e.target.checked;
        let identifiers = Object.keys(selectedMembers);
        if (isAdminView) {
            identifiers = identifiers.filter(id => {
                return selectedMembers[id].ref.role === "admin" || selectedMembers[id].ref.intended_role === "admin"
            });
        }
        if (resultAfterSearch !== false) {
            const afterSearchIdentifiers = resultAfterSearch.map(entity => this.getIdentifier(entity));
            identifiers = identifiers.filter(id => afterSearchIdentifiers.includes(id));
        }

        identifiers = identifiers.filter(id => filteredEntityIdentifiers.includes(id));
        identifiers.forEach(id => selectedMembers[id].selected = val);
        const newSelectedMembers = {...selectedMembers};
        this.setState({allSelected: val, selectedMembers: newSelectedMembers});
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
        const {selectedMembers} = this.state;
        const filteredSelectedMembers = this.getSelectedMembersWithFilteredSearch(selectedMembers);
        const {user: currentUser, collaboration} = this.props;
        const currentUserDeleted = Object.values(filteredSelectedMembers)
            .some(sr => sr.selected && !sr.ref.invite && sr.ref.user.id === currentUser.id);
        const oneSelected = Object.keys(filteredSelectedMembers).filter(id => filteredSelectedMembers[id].selected).length === 1;
        const deleteYourSelf = currentUserDeleted && oneSelected;
        const deleteInBatch = currentUserDeleted && !oneSelected;

        if (showConfirmation) {
            const lastAdminWarning = !deleteInBatch && collaboration.collaboration_memberships
                .filter(m => m.role === "admin")
                .filter(m => !Object.values(filteredSelectedMembers).some(s => s.selected && s.ref.id === m.id))
                .length === 0;
            this.setState({
                confirmationDialogOpen: true,
                isWarning: true,
                lastAdminWarning: lastAdminWarning,
                lastAdminWarningUser: deleteYourSelf,
                confirmationDialogAction: deleteInBatch ? () => this.setState({confirmationDialogOpen: false}) : this.remove(false),
                cancelDialogAction: deleteInBatch ? null : () => this.setState({confirmationDialogOpen: false}),
                confirmationTxt: deleteInBatch ? I18n.t("confirmationDialog.ok") : I18n.t("confirmationDialog.confirm"),
                confirmationQuestion: deleteInBatch ? I18n.t("collaborationDetail.noBatchDeleteAllowed") :
                    deleteYourSelf ? I18n.t("collaborationDetail.deleteYourselfMemberConfirmation") : I18n.t("collaborationDetail.deleteEntitiesConfirmation"),
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            const selected = Object.keys(filteredSelectedMembers)
                .filter(id => filteredSelectedMembers[id].selected);
            const promises = selected.map(id => {
                const ref = filteredSelectedMembers[id].ref;
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

    actionButtons = (collaboration, isAdminOfCollaboration, selectedMembers, filteredEntities) => {
        const any = filteredEntities.length !== 0;
        const filteredSelectedMembers = this.getSelectedMembersWithFilteredSearch(selectedMembers);
        const selected = Object.values(filteredSelectedMembers)
            .filter(v => v.selected)
            .filter(v => filteredEntities.find(e => e.id === v.ref.id && e.invite === v.ref.invite));
        const hrefValue = encodeURI(selected.map(v => v.ref.invite ? v.ref.invitee_email : v.ref.user.email).join(","));
        const disabled = selected.length === 0;
        const bcc = (collaboration.disclose_email_information && collaboration.disclose_member_information) ? "" : "?bcc="
        return (
            <div className="admin-actions">
                {(any && isAdminOfCollaboration) &&
                <div data-tip data-for="delete-members">
                    <Button onClick={this.remove(true)} txt={I18n.t("models.orgMembers.remove")}
                            disabled={disabled}
                            icon={<FontAwesomeIcon icon="trash"/>}/>
                    <ReactTooltip id="delete-members" type="light" effect="solid" data-html={true}
                                  place="bottom">
                        <span
                            dangerouslySetInnerHTML={{__html: disabled ? I18n.t("models.orgMembers.removeTooltipDisabled") : I18n.t("models.orgMembers.removeTooltip")}}/>
                    </ReactTooltip>
                </div>}
                {(any && (isAdminOfCollaboration || collaboration.disclose_email_information))
                &&
                <div data-tip data-for="mail-members">
                    <a href={`${disabled ? "" : "mailto:"}${bcc}${hrefValue}`}
                       className={`${disabled ? "disabled" : ""} button`}
                       rel="noopener noreferrer" onClick={e => {
                        if (disabled) {
                            stopEvent(e);
                        } else {
                            return true;
                        }
                    }}>
                        {I18n.t("models.orgMembers.mail")}<FontAwesomeIcon icon="mail-bulk"/>
                    </a>
                    <ReactTooltip id="mail-members" type="light" effect="solid" data-html={true}
                                  place="bottom">
                        <span
                            dangerouslySetInnerHTML={{__html: disabled ? I18n.t("models.orgMembers.mailTooltipDisabled") : I18n.t("models.orgMembers.mailTooltip")}}/>
                    </ReactTooltip></div>}
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

    getImpersonateMapper = entity => {
        const {user: currentUser, showMemberView} = this.props;
        if (entity.invite) {
            return <Button onClick={this.gotoInvitation(entity)} txt={I18n.t("forms.open")} small={true}/>
        }
        if (!currentUser.admin || entity.user.id === currentUser.id || showMemberView) {
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
            lastAdminWarning: false,
            lastAdminWarningUser: false,
            leavePage: false,
            isWarning: true,
            confirmationQuestion: I18n.t("organisationInvitation.deleteInvitation"),
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
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
            lastAdminWarning: false,
            lastAdminWarningUser: false,
            leavePage: false,
            isWarning: false,
            confirmationQuestion: I18n.t("organisationInvitation.resendInvitation"),
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doResend
        });
    };

    getSelectedMembersWithFilteredSearch = selectedMembers => {
        const {resultAfterSearch} = this.state;
        if (resultAfterSearch !== false) {
            const afterSearchIdentifiers = resultAfterSearch.map(entity => this.getIdentifier(entity));
            //Everything not visible after search is de-selected
            const visibleIdentifiers = Object.keys(selectedMembers).filter(id => afterSearchIdentifiers.includes(id));
            return visibleIdentifiers.reduce((acc, id) => {
                acc[id] = selectedMembers[id];
                return acc;
            }, {});
        }
        return selectedMembers;
    }

    searchCallback = resultAfterSearch => {
        this.setState({resultAfterSearch: resultAfterSearch});
    }

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
            isWarning, message, confirmationTxt
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
                                    confirmationTxt={confirmationTxt}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}/>
                <a className="back-to-org-members" onClick={this.cancelSideScreen} href={"/cancel"}>
                    <ChevronLeft/>{I18n.t("models.orgMembers.backToMembers")}
                </a>
                <div className="collaboration-invitation-form">
                    {isExpired && <ErrorIndicator msg={expiredMessage} standalone={true}/>}
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
                        <Button cancelButton={true} txt={I18n.t("forms.close")} onClick={this.cancelSideScreen}/>
                        <Button txt={I18n.t("organisationInvitation.resend")}
                                onClick={this.resend}/>
                    </section>
                </div>
            </div>)

    }

    renderSelectRole = (entity, isAdminOfCollaboration) => {
        if (entity.invite) {
            return <span className="member-role">{I18n.t(`organisation.${entity.intended_role}`)}</span>;
        }
        if (!isAdminOfCollaboration) {
            return <span className="member-role">{I18n.t(`organisation.${entity.role}`)}</span>;
        }
        return <Select value={roles.find(option => option.value === entity.role)}
                       options={roles}
                       classNamePrefix={`select-member-role`}
                       onChange={this.changeMemberRole(entity)}
                       isDisabled={!isAdminOfCollaboration}/>
    }

    render() {
        const {user: currentUser, collaboration, isAdminView, showMemberView} = this.props;
        const {
            selectedMembers, allSelected, filterOptions, filterValue, hideInvitees,
            confirmationDialogOpen, cancelDialogAction, isWarning, confirmationTxt,
            confirmationDialogAction, confirmationQuestion, loading, lastAdminWarning, lastAdminWarningUser
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
        //name={"" + ++i}
        let columns = [
            {
                nonSortable: true,
                key: "check",
                header: <CheckBox value={allSelected} name={"allSelected"}
                                  onChange={this.allSelected}/>,
                mapper: entity => <div className="check">
                    <CheckBox name={"" + ++i} onChange={this.onCheck(entity)}
                              value={(selectedMembers[this.getIdentifier(entity)] || {}).selected || false}/>
                </div>
            },
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: entity => <div className="member-icon">


                    {entity.invite &&
                    <Tooltip children={<InviteIcon/>} id={"invite-icon"} msg={I18n.t("tooltips.invitations")}/>}
                    {(!entity.invite && entity.role === "admin") &&
                    <Tooltip children={<UserIcon/>} id={"admin-icon"} msg={I18n.t("tooltips.admin")}/>}
                    {(!entity.invite && entity.role !== "admin") &&
                    <Tooltip children={<MembersIcon/>} id={"user-icon"} msg={I18n.t("tooltips.user")}/>}

                </div>
            },
            {
                nonSortable: true,
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={currentUser}
                                              hideEmail={showMemberView && !collaboration.disclose_email_information}
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
                mapper: entity => this.renderSelectRole(entity, isAdminOfCollaboration)
            },
            {
                nonSortable: true,
                key: "status",
                header: I18n.t("models.orgMembers.status"),
                mapper: entity => {
                    const isExpired = entity.invite && isInvitationExpired(entity);
                    return entity.invite ?
                        <span
                            className={`person-role invite ${isExpired ? "expired" : ""}`}>
                            {isExpired ? I18n.t("models.orgMembers.expiredAt", {date: shortDateFromEpoch(entity.expiry_date)}) :
                                I18n.t("models.orgMembers.inviteSend", {date: shortDateFromEpoch(entity.created_at)})}
                        </span> :
                        entity.role === "admin" ?
                            <span className="person-role accepted">{I18n.t("models.orgMembers.accepted")}</span> : null
                }
            },
            {
                nonSortable: true,
                key: "impersonate",
                header: "",
                mapper: this.getImpersonateMapper
            },
        ];
        if (!isAdminOfCollaboration) {
            columns = columns.filter(col => col.key !== "status");
        }
        const doHideInvitees = hideInvitees || showMemberView;
        const filteredEntities = this.filterEntities(isAdminView, members, filterValue, collaboration, doHideInvitees,
            invites);

        return (<>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={isWarning}
                                    confirmationTxt={confirmationTxt}
                                    question={confirmationQuestion}>
                    {lastAdminWarning && <LastAdminWarning organisation={collaboration.organisation}
                                                           currentUserDeleted={lastAdminWarningUser}/>}
                </ConfirmationDialog>

                <Entities entities={filteredEntities}
                          modelName={isAdminView ? "coAdmins" : "members"}
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name"
                          searchCallback={this.searchCallback}
                          columns={(isAdminOfCollaboration || collaboration.disclose_email_information) ? columns : columns.slice(1)}
                          loading={false}
                          rowLinkMapper={entity => entity.invite && this.gotoInvitation}
                          showNew={isAdminOfCollaboration}
                          filters={isAdminView ? null : this.filter(filterOptions, filterValue, hideInvitees, isAdminOfCollaboration)}
                          actions={this.actionButtons(collaboration, isAdminOfCollaboration, selectedMembers, filteredEntities)}
                          newEntityPath={`/new-invite/${collaboration.id}?isAdminView=${isAdminView}`}
                          {...this.props}/>
            </>
        )
    }

}

export default CollaborationAdmins;
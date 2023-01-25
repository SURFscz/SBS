import React from "react";
import I18n from "i18n-js";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/puppet_new.svg";
import {ReactComponent as ThrashIcon} from "../../icons/trash_new.svg";
import CheckBox from "../CheckBox";
import {
    deleteOrganisationMembership,
    organisationInvitationBulkResend,
    organisationInvitationDelete,
    updateOrganisationMembershipRole
} from "../../api";
import {setFlash} from "../../utils/Flash";
import "./OrganisationAdmins.scss";
import Select from "react-select";
import {isInvitationExpired, shortDateFromEpoch} from "../../utils/Date";
import Button from "../Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../ConfirmationDialog";
import UserColumn from "./UserColumn";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import SpinnerField from "./SpinnerField";
import Tooltip from "./Tooltip";
import {ReactComponent as MembersIcon} from "../../icons/single-neutral.svg";
import { Tooltip as ReactTooltip } from "react-tooltip";
import InstituteColumn from "./InstitueColumn";
import {ReactComponent as InformationCircle} from "../../icons/information-circle.svg";
import {isEmpty} from "../../utils/Utils";
import {emitImpersonation} from "../../utils/Impersonation";
import DOMPurify from "dompurify";

const INVITE_IDENTIFIER = "INVITE_IDENTIFIER";
const MEMBER_IDENTIFIER = "MEMBER_IDENTIFIER";

class OrganisationAdmins extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedMembers: {},
            message: "",
            confirmationDialogOpen: false,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            isWarning: false,
            loading: false
        }
    }

    componentDidUpdate= prevProps => {
        const nextOrganisation = this.props.organisation;
        const {organisation} = prevProps;
        if (organisation) {
            const prevMembers = nextOrganisation.organisation_memberships || [];
            const prevInvites = nextOrganisation.organisation_invitations || [];
            const members = organisation.organisation_memberships || [];
            const invites = organisation.organisation_invitations || [];
            if (prevMembers.length !== members.length || prevInvites.length !== invites.length) {
                this.componentDidMount();
            }
        }
    }

    componentDidMount = () => {
        const {organisation} = this.props;
        const admins = organisation.organisation_memberships;
        const invites = organisation.organisation_invitations;
        const entities = admins.concat(invites);
        const selectedMembers = entities.reduce((acc, entity) => {
            acc[this.getIdentifier(entity)] = {selected: false, ref: entity, invite: !isEmpty(entity.intended_role)};
            return acc;
        }, {})
        this.setState({selectedMembers, loading: false, confirmationDialogOpen: false});
    }

    getIdentifier = entity => {
        const invite = !isEmpty(entity.intended_role);
        return entity.id + (invite ? INVITE_IDENTIFIER : MEMBER_IDENTIFIER);
    }

    changeMemberRole = member => selectedOption => {
        const {organisation, user: currentUser} = this.props;
        const currentRole = organisation.organisation_memberships.find(m => m.user.id === member.user.id).role;
        if (currentRole === selectedOption.value) {
            return;
        }
        if (member.user.id === currentUser.id && !currentUser.admin) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => {
                    this.setState({loading: true});
                    updateOrganisationMembershipRole(organisation.id, member.user.id, selectedOption.value)
                        .then(() => {
                            this.props.refreshUser(() => this.props.history.push("/home"));
                            setFlash(I18n.t("organisationDetail.flash.memberUpdated", {
                                name: member.user.name,
                                role: selectedOption.value
                            }));
                        }).catch(() => {
                        this.handle404("member");
                    });
                },
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("collaborationDetail.downgradeYourselfMemberConfirmation"),
            });
        } else {
            this.setState({loading: true});
            updateOrganisationMembershipRole(organisation.id, member.user.id, selectedOption.value)
                .then(() => {
                    this.props.refresh(this.componentDidMount);
                    setFlash(I18n.t("organisationDetail.flash.memberUpdated", {
                        name: member.user.name,
                        role: selectedOption.value
                    }));
                }).catch(() => {
                this.handle404("member");
            });
        }
    };

    onCheck = memberShip => e => {
        const {selectedMembers} = this.state;
        selectedMembers[this.getIdentifier(memberShip)].selected = e.target.checked;
        this.setState({selectedMembers: {...selectedMembers}});
    }

    removeFromActionIcon = (entityId, isInvite, showConfirmation) => {
        const {user: currentUser, organisation} = this.props;
        const members = organisation.organisation_memberships;
        const invites = organisation.organisation_invitations || [];
        const entity = isInvite ? invites.find(inv => inv.id === entityId) : members.find(m => m.id === entityId)
        const currentUserDeleted = !isInvite && entity.user.id === currentUser.id;
        const question = I18n.t(`organisationDetail.${currentUserDeleted ? "deleteYourselfMemberConfirmation" : isInvite ? "deleteSingleInvitationConfirmation" : "deleteSingleMemberConfirmation"}`)
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: true,
                confirmationDialogAction: () => this.removeFromActionIcon(entityId, isInvite, false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: question,
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            const promise = isInvite ? organisationInvitationDelete(entityId, false) :
                deleteOrganisationMembership(organisation.id, entity.user.id, false)
            promise
                .then(() => {
                    if (currentUserDeleted && !currentUser.admin) {
                        this.props.refreshUser(() => this.props.history.push("/home"));
                    } else {
                        this.props.refresh(this.componentDidMount);
                        setFlash(entity.invite ? I18n.t("collaborationDetail.flash.invitationDeleted", entity.invitee_email) : I18n.t("collaborationDetail.flash.memberDeleted", {name: entity.user.name}));
                    }
                }).catch(() => {
                this.handle404("member");
            });
        }
    }

    remove = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: true,
                confirmationDialogAction: this.remove(false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("organisationDetail.deleteMemberConfirmation"),
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            const {selectedMembers} = this.state;
            const {user: currentUser, organisation} = this.props;
            const currentUserDeleted = Object.values(selectedMembers)
                .some(sr => sr.selected && !sr.ref.invite && sr.ref.user.id === currentUser.id);
            const selected = Object.keys(selectedMembers)
                .filter(id => selectedMembers[id].selected);

            const promises = selected.map(id => {
                const ref = selectedMembers[id].ref;
                return ref.invite ? organisationInvitationDelete(ref.id, false) :
                    deleteOrganisationMembership(organisation.id, ref.user.id, false)
            });
            Promise.all(promises)
                .then(() => {
                    if (currentUserDeleted && !currentUser.admin) {
                        this.props.refreshUser(() => this.props.history.push("/home"));
                    } else {
                        this.props.refresh(this.componentDidMount);
                        setFlash(I18n.t("organisationDetail.flash.entitiesDeleted"));
                    }
                }).catch(() => {
                this.handle404("member");
            });
        }
    }

    resendFromActionMenu = (entityId, showConfirmation) => () => {
        const {organisation} = this.props;
        const invites = organisation.organisation_invitations || [];
        const entity = invites.find(inv => inv.id === entityId);
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                lastAdminWarning: false,
                lastAdminWarningUser: false,
                leavePage: false,
                isWarning: false,
                confirmationQuestion: I18n.t("invitation.resendInvitation"),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                cancelDialogAction: this.closeConfirmationDialog,
                confirmationDialogAction: this.resendFromActionMenu(entityId, false)
            });
        } else {
            organisationInvitationBulkResend([entity], false).then(() => {
                this.props.refresh(this.componentDidMount);
                setFlash(I18n.t("invitation.flash.inviteResend", {name: organisation.name}));
            });
        }
    };


    resend = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: false,
                confirmationQuestion: I18n.t("organisationInvitation.resendInvitations"),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                cancelDialogAction: this.closeConfirmationDialog,
                confirmationDialogAction: this.resend(false)
            });
        } else {
            const {selectedMembers} = this.state;
            const invitations = Object.values(selectedMembers).filter(sel => sel.selected).map(sel => sel.ref).map(inv => ({id: inv.id}));
            const {organisation} = this.props;
            organisationInvitationBulkResend(invitations, false).then(() => {
                this.props.refresh(this.componentDidMount);
                setFlash(I18n.t("organisationInvitation.flash.invitesResend", {name: organisation.name}));
            });
        }
    };

    handle404 = key => {
        this.setState({
            loading: false,
            confirmationDialogOpen: true,
            confirmationTxt: I18n.t("confirmationDialog.ok"),
            confirmationDialogAction: () => {
                this.setState({confirmationDialogOpen: false, confirmationTxt: I18n.t("confirmationDialog.confirm")});
                this.props.refresh(this.componentDidMount);
            },
            cancelDialogAction: undefined,
            confirmationQuestion: I18n.t(`organisationDetail.gone.${key}`),
        });
    }

    actionButtons = selectedMembers => {
        const selected = Object.values(selectedMembers).filter(v => v.selected);
        const anySelected = selected.length > 0;
        const showResendInvite = anySelected && selected.every(s => s.invite && isInvitationExpired(s.ref));
        if (!anySelected && !showResendInvite) {
            return null;
        }
        return (
            <div className="admin-actions">
                {anySelected && <div data-tip data-for="delete-members">
                    <Button onClick={this.remove(true)} txt={I18n.t("models.orgMembers.remove")}
                            icon={<FontAwesomeIcon icon="trash"/>}/>
                    <ReactTooltip id="delete-members" type="light" effect="solid" data-html={true}
                                  place="bottom">
                    <span
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(!anySelected ? I18n.t("models.orgMembers.removeTooltipDisabled") : I18n.t("models.orgMembers.removeTooltip"))}}/>
                    </ReactTooltip>
                </div>}
                {showResendInvite &&
                <div data-tip data-for="resend-invites">
                    <Button onClick={this.resend(true)} txt={I18n.t("models.orgMembers.resend")}
                            icon={<FontAwesomeIcon icon="voicemail"/>}/>
                    <ReactTooltip id="resend-invites" type="light" effect="solid" data-html={true}
                                  place="bottom">
                        <span
                            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(!showResendInvite ? I18n.t("models.orgMembers.resendTooltipDisabled") : I18n.t("models.orgMembers.resendTooltip"))}}/>
                    </ReactTooltip>
                </div>}

            </div>);
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    renderSelectRole = (entity, isAdmin, oneAdminLeft, noMoreAdminsToCheck, selectedMembers) => {
        if (entity.invite) {
            return <span className="member-role">{I18n.t(`organisation.${entity.intended_role}`)}</span>;
        }
        const roles = [
            {value: "admin", label: I18n.t(`organisation.organisationShortRoles.admin`)},
            {value: "manager", label: I18n.t(`organisation.organisationShortRoles.manager`)}
        ];
        return <Select
            value={roles.find(option => option.value === entity.role)}
            options={roles}
            classNamePrefix={`select-member-role`}
            onChange={this.changeMemberRole(entity)}
            isDisabled={!isAdmin || !(entity.invite || entity.role === "manager" || (!oneAdminLeft &&
                (!noMoreAdminsToCheck || selectedMembers[this.getIdentifier(entity)].selected)))}/>
    }

    actionIcons = entity => {
        const {organisation} = this.props;
        const {selectedMembers} = this.state;
        const showResendInvite = entity.invite === true && isInvitationExpired(entity);
        const nbrOfAdmins = organisation.organisation_memberships.filter(m => m.role === "admin").length;
        const oneAdminLeft = nbrOfAdmins < 2;
        const selectedAdmins = Object.values(selectedMembers).filter(entry => entry.selected && entry.ref.role === "admin").length;
        const noMoreAdminsToCheck = (selectedAdmins + 1) === nbrOfAdmins;

        const showDelete = entity.invite || entity.role === "manager" || (!oneAdminLeft &&
            (!noMoreAdminsToCheck || selectedMembers[this.getIdentifier(entity)].selected));
        return (
            <div className="admin-icons">
                {showDelete &&
                <div data-tip data-for={`delete-org-member-${entity.id}`}
                     onClick={() => this.removeFromActionIcon(entity.id, entity.invite, true)}>
                    <ThrashIcon/>
                    <ReactTooltip id={`delete-org-member-${entity.id}`} type="light" effect="solid" data-html={true}
                                  place="bottom">
                        <span dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(entity.invite ? I18n.t("models.orgMembers.removeInvitationTooltip") :
                                I18n.t("models.orgMembers.removeMemberTooltip"))
                        }}/>
                    </ReactTooltip>
                </div>}
                {showResendInvite &&
                <div data-tip data-for={`resend-invite-${entity.id}`}>
                    <FontAwesomeIcon icon="voicemail" onClick={this.resendFromActionMenu(entity.id, true)}/>
                    <ReactTooltip id={`resend-invite-${entity.id}`} type="light" effect="solid" data-html={true}
                                  place="bottom">
                        <span
                            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("models.orgMembers.resendInvitationTooltip"))}}/>
                    </ReactTooltip>
                </div>}

            </div>);
    }

    getImpersonateMapper = (entity, currentUser, impersonation_allowed) => {
        const showImpersonation = currentUser.admin && !entity.invite && entity.user.id !== currentUser.id && impersonation_allowed;
        return (
            <div className={"action-icons-container"}>
                {this.actionIcons(entity)}
                {showImpersonation && <div className="impersonation">
                    <HandIcon className="impersonate"
                              onClick={() => emitImpersonation(entity.user, this.props.history)}/>
                </div>}
            </div>
        );
    }

    render() {
        const {user: currentUser, organisation} = this.props;
        const {
            selectedMembers, confirmationDialogOpen, cancelDialogAction, isWarning,
            confirmationDialogAction, confirmationQuestion, loading, confirmationTxt
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const admins = organisation.organisation_memberships;
        const invites = organisation.organisation_invitations;
        invites.forEach(invite => invite.invite = true);

        const isAdmin = isUserAllowed(ROLES.ORG_ADMIN, currentUser, organisation.id, null);
        const nbrOfAdmins = organisation.organisation_memberships.filter(m => m.role === "admin").length;
        const oneAdminLeft = nbrOfAdmins < 2;
        const selectedAdmins = Object.values(selectedMembers).filter(entry => entry.selected && entry.ref.role === "admin").length;
        const noMoreAdminsToCheck = (selectedAdmins + 1) === nbrOfAdmins;

        let i = 0;
        const {impersonation_allowed} = this.props.config;
        const columns = [
            {
                nonSortable: true,
                key: "check",
                header: <CheckBox value={false}
                                  name={"allSelected"}
                                  hide={true}
                                  onChange={() => false}/>,
                mapper: entity => {
                    const displayCheckbox = entity.invite || entity.role === "manager" || (!oneAdminLeft &&
                        (!noMoreAdminsToCheck || selectedMembers[this.getIdentifier(entity)].selected));
                    return <div className="check">
                        {displayCheckbox && <CheckBox name={"" + ++i} onChange={this.onCheck(entity)}
                                                      value={(selectedMembers[this.getIdentifier(entity)] || {}).selected || false}/>}
                        {!displayCheckbox &&
                        <Tooltip children={<InformationCircle/>} id={"admin-warning"}
                                 msg={I18n.t("tooltips.oneAdminWarning")}/>}
                    </div>
                }
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
                    <Tooltip children={<MembersIcon/>} id={"user-icon"} msg={I18n.t("tooltips.manager")}/>}
                </div>
            },
            {
                nonSortable: true,
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={currentUser}
                                              gotoInvitation={isAdmin ? this.gotoInvitation : null}/>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: entity => <InstituteColumn entity={entity} currentUser={currentUser}/>
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                className: !isAdmin ? "not-allowed" : "",
                mapper: entity => this.renderSelectRole(entity, isAdmin, oneAdminLeft, noMoreAdminsToCheck, selectedMembers)
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
                        <span className="person-role accepted">{I18n.t("models.orgMembers.accepted")}</span>
                }
            },
            {
                nonSortable: true,
                key: "impersonate",
                header: "",
                mapper: entity => this.getImpersonateMapper(entity, currentUser, impersonation_allowed)
            },
        ]
        const entities = admins.concat(invites);
        return (<>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={isWarning}
                                    confirmationTxt={confirmationTxt}
                                    question={confirmationQuestion}/>

                <Entities entities={entities}
                          modelName="orgMembers"
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name"
                          columns={isAdmin ? columns : columns.slice(1)}
                          rowLinkMapper={entity => (entity.invite && isAdmin) && this.gotoInvitation}
                          loading={false}
                          hideTitle={true}
                          onHover={true}
                          showNew={isAdmin}
                          actions={(isAdmin && entities.length > 0) ? this.actionButtons(selectedMembers) : null}
                          newEntityPath={`/new-organisation-invite/${organisation.id}`}
                          {...this.props}/>
            </>
        )
    }
}

export default OrganisationAdmins;
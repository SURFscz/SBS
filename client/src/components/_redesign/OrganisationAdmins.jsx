import React from "react";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/puppet_new.svg";
import {ReactComponent as ThrashIcon} from "../../icons/trash_new.svg";
import {ReactComponent as PencilIcon} from "../../icons/pencil-1.svg";
import CheckBox from "../checkbox/CheckBox";
import {ReactComponent as TrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import {
    deleteOrganisationMembership,
    identityProviderDisplayName,
    organisationInvitationBulkResend,
    organisationInvitationDelete,
    updateOrganisationMembershipRole
} from "../../api";
import {setFlash} from "../../utils/Flash";
import "./OrganisationAdmins.scss";
import Select from "react-select";
import {isInvitationExpired, shortDateFromEpoch} from "../../utils/Date";
import Button from "../button/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../confirmation-dialog/ConfirmationDialog";
import UserColumn from "./UserColumn";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import SpinnerField from "./SpinnerField";
import {ReactComponent as MembersIcon} from "../../icons/single-neutral.svg";
import {Chip, ChipType, Tooltip} from "@surfnet/sds";
import InstituteColumn from "./InstituteColumn";
import {expiryDateCustomSort, isEmpty, stopEvent, userColumnsCustomSort} from "../../utils/Utils";
import {emitImpersonation} from "../../utils/Impersonation";
import SelectField from "../SelectField";
import {InvitationsUnits} from "../InvitationsUnits";

const INVITE_IDENTIFIER = "INVITE_IDENTIFIER";
const MEMBER_IDENTIFIER = "MEMBER_IDENTIFIER";

class OrganisationAdmins extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.roles = [
            {value: "admin", label: I18n.t(`organisation.organisationShortRoles.admin`)},
            {value: "manager", label: I18n.t(`organisation.organisationShortRoles.manager`)}
        ];
        this.state = {
            selectedMembers: {},
            message: "",
            confirmationDialogOpen: false,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            selectedMemberId: null,
            selectedUnits: [],
            selectedRole: this.roles[1],
            idpDisplayName: null,
            isWarning: false,
            loading: false,
            unitOption: "all"
        }
    }

    componentDidUpdate = prevProps => {
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

    removeFromActionIcon = (entityId, isInvite, showConfirmation, e) => {
        stopEvent(e);
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
                confirmationDialogAction: e => this.removeFromActionIcon(entityId, isInvite, false, e),
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
                {anySelected &&
                    <Tooltip
                        tip={!anySelected ? I18n.t("models.orgMembers.removeTooltipDisabled") : I18n.t("models.orgMembers.removeTooltip")}
                        clickable={true}
                        children={<Button onClick={this.remove(true)}
                                          txt={I18n.t("models.orgMembers.remove")}
                                          small={true}
                                          icon={<TrashIcon/>}/>}
                        standalone={true}/>
                }
                {showResendInvite &&
                    <Tooltip
                        tip={!showResendInvite ? I18n.t("models.orgMembers.resendTooltipDisabled") : I18n.t("models.orgMembers.resendTooltip")}
                        clickable={true}
                        children={<Button onClick={this.resend(true)}
                                          txt={I18n.t("models.orgMembers.resend")}
                                          small={true}
                                          icon={<FontAwesomeIcon icon="voicemail"/>}/>}
                        standalone={true}/>}
            </div>);
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    renderSelectRole = (entity, isAdmin, oneAdminLeft, noMoreAdminsToCheck, selectedMembers) => {
        if (entity.invite) {
            return <span className="member-role">{I18n.t(`organisation.${entity.intended_role}`)}</span>;
        }
        return (
            <Select
                value={this.roles.find(option => option.value === entity.role)}
                options={this.roles}
                classNamePrefix={`select-member-role`}
                onChange={this.changeMemberRole(entity)}
                isDisabled={!isAdmin || !(entity.invite || entity.role === "manager" || (!oneAdminLeft &&
                    (!noMoreAdminsToCheck || selectedMembers[this.getIdentifier(entity)].selected)))}/>)
    }

    actionIcons = entity => {
        const {user, organisation} = this.props;
        const {selectedMembers} = this.state;
        const showResendInvite = entity.invite === true && isInvitationExpired(entity);
        const nbrOfAdmins = organisation.organisation_memberships.filter(m => m.role === "admin").length;
        const oneAdminLeft = nbrOfAdmins < 2;
        const selectedAdmins = Object.values(selectedMembers).filter(entry => entry.selected && entry.ref.role === "admin").length;
        const noMoreAdminsToCheck = (selectedAdmins + 1) === nbrOfAdmins;
        const isOrgAdmin = isUserAllowed(ROLES.ORG_ADMIN, user, organisation.id);
        const showEdit = isOrgAdmin && !entity.invite && entity.role === "manager"
            && !isEmpty(organisation.units);

        const showDelete = entity.invite || entity.role === "manager" || (!oneAdminLeft &&
            (!noMoreAdminsToCheck || selectedMembers[this.getIdentifier(entity)].selected));
        return (
            <div className="admin-icons">
                {showEdit && <div onClick={this.gotoMember(entity)}>
                    <Tooltip
                        tip={I18n.t("models.orgMembers.editManagerTooltip")}
                        children={<PencilIcon/>}
                        standalone={true}/>
                </div>}
                {showDelete &&
                    <div onClick={e => this.removeFromActionIcon(entity.id, entity.invite, true, e)}>
                        <Tooltip
                            tip={entity.invite ? I18n.t("models.orgMembers.removeInvitationTooltip") :
                                I18n.t("models.orgMembers.removeMemberTooltip")}
                            children={<ThrashIcon/>}
                            standalone={true}/>
                    </div>}
                {showResendInvite &&
                    <Tooltip
                        tip={I18n.t("models.orgMembers.resendInvitationTooltip")}
                        children={<FontAwesomeIcon icon="voicemail"
                                                   onClick={this.resendFromActionMenu(entity.id, true)}/>}
                        standalone={true}/>
                }

            </div>);
    }

    getSelectedMember = (selectedMemberId, organisation) => {
        return organisation.organisation_memberships.find(m => m.id === selectedMemberId);
    }

    unitOptionCallback = unitOption => {
        this.setState({
            unitOption: unitOption,
            selectedRole: unitOption === "all" ? this.state.selectedRole : this.roles[1]
        })
    }

    setSelectedRole = selectedOption => {
        this.setState({
            selectedRole: selectedOption,
            selectedUnits: selectedOption.value === "admin" ? [] : this.state.selectedUnits
        });
    }

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({
            selectedMemberId: null,
            selectedUnits: [],
            selectedRole: this.roles[1],
            idpDisplayName: null,
            unitOption: "all"
        });
    }

    renderSelectedMember = (selectedMember, organisation) => {
        const {idpDisplayName, selectedUnits, selectedRole, unitOption} = this.state;
        return (
            <div className="member-details-container">
                <div>
                    <a className={"back-to-groups"} onClick={this.cancelSideScreen} href={"/cancel"}>
                        <ChevronLeft/>{I18n.t("units.back")}
                    </a>
                </div>
                <div>
                    <h1>{I18n.t("units.editRole")}</h1>
                    <section className={"user-detail"}>
                        <span>{selectedMember.user.name}</span>
                        <a href={`mailto:${selectedMember.user.email}`}>{selectedMember.user.email}</a>
                        <span>{idpDisplayName}</span>
                    </section>
                    <SelectField value={this.roles.find(option => option.value === selectedRole.value)}
                                 options={this.roles}
                                 disabled={unitOption !== "all"}
                                 name={I18n.t("invitation.intendedRoleOrganisation")}
                                 placeholder={I18n.t("collaboration.selectRole")}
                                 onChange={this.setSelectedRole}/>

                    {(!isEmpty(organisation.units)) &&
                        <InvitationsUnits allUnits={organisation.units}
                                          selectedUnits={selectedUnits}
                                          unitOptionCallback={this.unitOptionCallback}
                                          setUnits={newUnits => this.setState({selectedUnits: newUnits})}/>}
                    <section className="actions">
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancelSideScreen}/>
                        <Button txt={I18n.t("forms.save")}
                                onClick={this.updateRoleAndUnits}/>
                    </section>

                </div>
            </div>
        )
    }

    updateRoleAndUnits = () => {
        const {selectedUnits, selectedRole, selectedMemberId} = this.state;
        const {organisation} = this.props;
        const selectedMember = this.getSelectedMember(selectedMemberId, organisation);
        this.setState({loading: true});
        updateOrganisationMembershipRole(organisation.id, selectedMember.user.id, selectedRole.value, selectedUnits)
            .then(() => {
                this.cancelSideScreen();
                this.props.refresh(this.componentDidMount);
                setFlash(I18n.t("organisationDetail.flash.memberUpdated", {
                    name: selectedMember.user.name,
                    role: selectedRole.value
                }));
            }).catch(() => {
            this.handle404("member");
        });
    }

    gotoMember = membership => e => {
        this.setState({
            loading: true
        });
        stopEvent(e);
        identityProviderDisplayName(membership.user_id)
            .then(res => {
                this.setState({
                    idpDisplayName: res ? res.display_name : membership.user.schac_home_organisation,
                    selectedMemberId: membership.id,
                    selectedUnits: membership.units,
                    loading: false
                });
            });
    }

    getImpersonateMapper = (entity, currentUser, impersonation_allowed, isAdmin) => {
        const showImpersonation = currentUser.admin && !entity.invite && entity.user.id !== currentUser.id && impersonation_allowed;
        return (
            <div className={"action-icons-container"}>
                {isAdmin && this.actionIcons(entity, currentUser)}
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
            confirmationDialogAction, confirmationQuestion, loading, confirmationTxt, selectedMemberId
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const selectedMember = this.getSelectedMember(selectedMemberId, organisation);
        if (selectedMember) {
            return this.renderSelectedMember(selectedMember, organisation);
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
                            <Tooltip tip={I18n.t("tooltips.oneAdminWarning")}
                                     standalone={true}
                                     children={<div>
                                         <CheckBox name={"" + ++i}
                                                   value={false}
                                                   readOnly={true}
                                         />
                                     </div>}
                            />}
                    </div>
                }
            },
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: entity => <div className="member-icon">
                    {entity.invite &&
                        <Tooltip standalone={true} children={<InviteIcon/>}
                                 tip={I18n.t("tooltips.invitations")}/>}
                    {(!entity.invite && entity.role === "admin") &&
                        <Tooltip standalone={true} children={<UserIcon/>}
                                 tip={I18n.t("tooltips.admin")}/>}
                    {(!entity.invite && entity.role !== "admin") &&
                        <Tooltip standalone={true} children={<MembersIcon/>}
                                 tip={I18n.t("tooltips.manager")}/>}
                </div>
            },
            {
                nonSortable: false,
                key: "name",
                customSort: userColumnsCustomSort,
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={currentUser}/>
            },
            isEmpty(organisation.units) ? null : {
                key: "units",
                class: "units",
                header: I18n.t("units.column"),
                mapper: membership => <div className="unit-container">
                    {(membership.units || [])
                        .sort((u1, u2) => u1.name.localeCompare(u2.name))
                        .map((unit, index) => <span key={index} className="chip-container">
                            {unit.name}
                        </span>)}
                </div>
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
                customSort: expiryDateCustomSort,
                key: "status",
                header: I18n.t("models.orgMembers.status"),
                mapper: entity => {
                    const isExpired = entity.invite && isInvitationExpired(entity);
                    return entity.invite ?
                        <Chip
                            label={isExpired ? I18n.t("models.orgMembers.expiredAt", {date: shortDateFromEpoch(entity.expiry_date)}) :
                                I18n.t("models.orgMembers.inviteSend", {date: shortDateFromEpoch(entity.created_at)})}
                            type={isExpired ? ChipType.Status_error : ChipType.Status_info}/> :
                        <span>{I18n.t("models.orgMembers.accepted")}</span>
                }
            },
            {
                nonSortable: true,
                key: "impersonate",
                header: "",
                mapper: entity => this.getImpersonateMapper(entity, currentUser, impersonation_allowed, isAdmin)
            },
        ].filter(coll => coll !== null)
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
                          rowLinkMapper={membership => {
                              const isOrgAdmin = isUserAllowed(ROLES.ORG_ADMIN, currentUser, organisation.id);
                              const allowed = isOrgAdmin && !membership.invite && membership.role === "manager"
                                  && !isEmpty(organisation.units);
                              return allowed && this.gotoMember;
                          }}
                          loading={false}
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

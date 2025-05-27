import React from "react";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/puppet_new.svg";
import {ReactComponent as ThrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import CheckBox from "../checkbox/CheckBox";
import {
    deleteServiceMembership,
    serviceInvitationBulkResend,
    serviceInvitationDelete,
    updateServiceMembershipRole
} from "../../api";
import {setFlash} from "../../utils/Flash";
import "./ServiceAdmins.scss";
import {isInvitationExpired, shortDateFromEpoch} from "../../utils/Date";
import Button from "../button/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../confirmation-dialog/ConfirmationDialog";
import UserColumn from "./UserColumn";
import {isUserServiceAdmin} from "../../utils/UserRole";
import SpinnerField from "./SpinnerField";
import {Chip, ChipType, Tooltip} from "@surfnet/sds";
import InstituteColumn from "./InstituteColumn";
import {isEmpty, userColumnsCustomSort} from "../../utils/Utils";
import {emitImpersonation} from "../../utils/Impersonation";
import LastAdminWarning from "./LastAdminWarning";
import Select from "react-select";

const INVITE_IDENTIFIER = "INVITE_IDENTIFIER";
const MEMBER_IDENTIFIER = "MEMBER_IDENTIFIER";

class ServiceAdmins extends React.Component {

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
            isWarning: false,
            lastAdminWarning: false,
            lastAdminWarningUser: false,
            loading: false
        }
    }

    componentDidUpdate = prevProps => {
        const nextService = this.props.service;
        const {service} = prevProps;
        if (service) {
            const prevAdmins = nextService.service_memberships || [];
            const prevInvites = nextService.service_invitations || [];
            const admins = service.service_memberships || [];
            const invites = service.service_invitations || [];
            if (prevAdmins.length !== admins.length || prevInvites.length !== invites.length) {
                this.componentDidMount();
            }
        }
    }

    componentDidMount = () => {
        const {service} = this.props;
        const admins = service.service_memberships || [];
        const invites = service.service_invitations || [];
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

    onCheck = memberShip => e => {
        const {selectedMembers} = this.state;
        const checked = e.target.checked;
        const selectedMember = selectedMembers[this.getIdentifier(memberShip)];
        selectedMember.selected = checked;
        this.setState({selectedMembers: {...selectedMembers}});
    }

    remove = showConfirmation => () => {
        const {selectedMembers} = this.state;
        const {user: currentUser, service} = this.props;
        const nbrAdmins = service.service_memberships.filter(m => m.role === "admin").length;
        const nbrAdminsRemoved = Object.values(selectedMembers)
            .filter(sr => sr.selected && !sr.ref.invite && sr.ref.role === "admin").length;
        const currentUserDeleted = Object.values(selectedMembers)
            .some(sr => sr.selected && !sr.ref.invite && sr.ref.user.id === currentUser.id);

        const lastAdminWarning = nbrAdmins === nbrAdminsRemoved;
        const lastAdminWarningUser = lastAdminWarning && currentUserDeleted;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: true,
                lastAdminWarning: lastAdminWarning,
                lastAdminWarningUser: lastAdminWarningUser,
                confirmationDialogAction: this.remove(false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("serviceDetail.deleteMemberConfirmation"),
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            const selected = Object.keys(selectedMembers)
                .filter(id => selectedMembers[id].selected);
            const promises = selected.map(id => {
                const ref = selectedMembers[id].ref;
                return ref.invite ? serviceInvitationDelete(ref.id, false) :
                    deleteServiceMembership(service.id, ref.user.id, false)
            });
            Promise.all(promises)
                .then(() => {
                    if (currentUserDeleted && !currentUser.admin) {
                        this.props.refreshUser(() => this.props.history.push("/home"));
                    } else {
                        this.props.refresh(this.componentDidMount);
                        setFlash(I18n.t("serviceDetail.flash.entitiesDeleted"));
                    }
                }).catch(() => {
                this.handle404("member");
            });
        }
    }

    removeFromActionIcon = (entityId, isInvite, showConfirmation) => {
        const {user: currentUser, service} = this.props;
        const members = service.service_memberships;
        const invites = service.service_invitations || [];
        const entity = isInvite ? invites.find(inv => inv.id === entityId) : members.find(m => m.id === entityId)
        const currentUserDeleted = !isInvite && entity.user.id === currentUser.id;

        const question = I18n.t(`${currentUserDeleted ? "serviceDetail.deleteYourselfMemberConfirmation" : isInvite ? "organisationDetail.deleteSingleInvitationConfirmation" : "organisationDetail.deleteSingleMemberConfirmation"}`)

        const nbrAdmins = service.service_memberships.filter(m => m.role === "admin").length;
        const lastAdminWarning = nbrAdmins === 1 && !isInvite && entity.role === "admin"
        const lastAdminWarningUser = lastAdminWarning && currentUserDeleted;

        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: true,
                lastAdminWarning: lastAdminWarning,
                lastAdminWarningUser: lastAdminWarningUser,
                confirmationDialogAction: () => this.removeFromActionIcon(entityId, isInvite, false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: question,
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            const promise = isInvite ? serviceInvitationDelete(entityId, false) :
                deleteServiceMembership(service.id, entity.user.id, false)
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

    resendFromActionMenu = (entityId, showConfirmation) => () => {
        const {service} = this.props;
        const invites = service.service_invitations || [];
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
            serviceInvitationBulkResend([entity], false).then(() => {
                this.props.refresh(this.componentDidMount);
                setFlash(I18n.t("invitation.flash.inviteResend", {name: service.name}));
            });
        }
    };

    resend = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: false,
                confirmationQuestion: I18n.t("serviceDetail.resendInvitations"),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                cancelDialogAction: this.closeConfirmationDialog,
                confirmationDialogAction: this.resend(false)
            });
        } else {
            const {selectedMembers} = this.state;
            const invitations = Object.values(selectedMembers).filter(sel => sel.selected).map(sel => sel.ref).map(inv => ({id: inv.id}));
            const {service} = this.props;
            serviceInvitationBulkResend(invitations, false).then(() => {
                this.props.refresh(this.componentDidMount);
                setFlash(I18n.t("serviceDetail.flash.invitesResend", {name: service.name}));
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
            confirmationQuestion: I18n.t(`serviceDetail.gone.${key}`),
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
                {anySelected && <div>
                    <Tooltip
                        tip={anySelected ? I18n.t("models.orgMembers.removeTooltip") : I18n.t("models.orgMembers.removeTooltipDisabled")}
                        standalone={true}
                        children={<Button onClick={this.remove(true)}
                                          txt={I18n.t("models.orgMembers.remove")}
                                          small={true}
                                          icon={<ThrashIcon/>}/>}/>
                </div>}

                {showResendInvite && <div>
                    <Tooltip
                        tip={!showResendInvite ? I18n.t("models.orgMembers.resendTooltipDisabled") : I18n.t("models.orgMembers.resendTooltip")}
                        standalone={true}
                        children={<Button onClick={this.resend(true)} txt={I18n.t("models.orgMembers.resend")}
                                          icon={<FontAwesomeIcon icon="voicemail"/>}/>}
                    />
                </div>}

            </div>);
    }

    actionIcons = (entity, currentUser, isAmin) => {
        const showResendInvite = entity.invite === true && isInvitationExpired(entity) && isAmin;
        const showDeleteMember = (!entity.invite && entity.user_id === currentUser.id) || isAmin;
        return (
            <div className="admin-icons">
                {showDeleteMember &&
                <div onClick={() => this.removeFromActionIcon(entity.id, entity.invite, true)}>
                    <Tooltip tip={entity.invite ? I18n.t("models.orgMembers.removeInvitationTooltip") :
                        I18n.t("models.orgMembers.removeMemberTooltip")}
                             standalone={true}
                             children={<ThrashIcon/>}/>
                </div>}
                {showResendInvite &&
                    <div onClick={this.resendFromActionMenu(entity.id, true)}>
                        <Tooltip tip={I18n.t("models.orgMembers.resendInvitationTooltip")}
                                 standalone={true}
                                 children={<FontAwesomeIcon icon="voicemail"/>}
                        />
                    </div>}

            </div>);
    }

    getImpersonateMapper = (entity, currentUser, impersonation_allowed, isAdmin) => {
        const showImpersonation = currentUser.admin && !entity.invite && entity.user.id !== currentUser.id && impersonation_allowed;
        return (
            <div className={"action-icons-container"}>
                {this.actionIcons(entity, currentUser, isAdmin)}
                {showImpersonation && <div className="impersonation">
                    <HandIcon className="impersonate"
                              onClick={() => emitImpersonation(entity.user, this.props.history)}/>
                </div>}
            </div>
        );
    }

    changeMemberRole = member => selectedOption => {
        const {service, user} = this.props;
        const currentRole = service.service_memberships.find(m => m.user_id === member.user_id).role;
        if (currentRole === selectedOption.value) {
            return;
        }
        if (member.user_id === user.id) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                confirmationDialogAction: () => {
                    this.setState({loading: true});
                    updateServiceMembershipRole(service.id, member.user_id, selectedOption.value)
                        .then(() => {
                            this.props.refreshUser(() => this.props.refresh(this.componentDidMount));
                            setFlash(I18n.t("serviceDetail.flash.memberUpdated", {
                                name: member.user.name,
                                role: selectedOption.value
                            }));
                        }).catch(() => {
                        this.handle404("member");
                    });
                },
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("serviceDetail.downgradeYourselfMemberConfirmation"),
            });
        } else {
            this.setState({loading: true});
            updateServiceMembershipRole(service.id, member.user_id, selectedOption.value)
                .then(() => {
                    this.props.refresh(this.componentDidMount);
                    setFlash(I18n.t("serviceDetail.flash.memberUpdated", {
                        name: member.user.name,
                        role: selectedOption.value
                    }));
                }).catch(() => {
                this.handle404("member");
            });
        }
    };

    renderSelectRole = (entity, currentUser, service) => {
        if (entity.invite) {
            return <span className="member-role">{I18n.t(`organisation.${entity.intended_role}`)}</span>;
        }
        const serviceAdmin = isUserServiceAdmin(currentUser, service);
        const enabled = (serviceAdmin || currentUser.admin) && !entity.invite;
        return (
            <Select
                value={this.roles.find(option => option.value === entity.role)}
                options={this.roles}
                classNamePrefix={`select-member-role`}
                onChange={this.changeMemberRole(entity)}
                isDisabled={!enabled}/>)
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    render() {
        const {user: currentUser, service} = this.props;
        const {
            selectedMembers, confirmationDialogOpen, cancelDialogAction, isWarning,
            confirmationDialogAction, confirmationQuestion, loading, confirmationTxt, lastAdminWarning,
            lastAdminWarningUser
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const admins = service.service_memberships || [];
        const invites = service.service_invitations || [];
        invites.forEach(invite => invite.invite = true);

        const isAdmin = currentUser.admin || isUserServiceAdmin(currentUser, service);
        let i = 0;
        const {impersonation_allowed} = this.props.config;
        const columns = [
            isAdmin ? {
                nonSortable: true,
                key: "check",
                header: <CheckBox value={false}
                                  name={"allSelected"}
                                  hide={true}
                                  onChange={() => false}/>,

                mapper: entity => {
                    return <div className="check">
                        <CheckBox name={"" + ++i}
                                  onChange={this.onCheck(entity)}
                                  value={(selectedMembers[this.getIdentifier(entity)] || {}).selected || false}/>
                    </div>
                }
            } : null,
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: entity => <div className="member-icon">
                    {entity.invite ?
                        <Tooltip standalone={true}
                                 children={<InviteIcon/>}
                                 tip={I18n.t("tooltips.invitations")}/> :
                        <Tooltip standalone={true}
                                 children={<UserIcon/>}
                                 tip={I18n.t("tooltips.admin")}/>}
                </div>
            },
            {
                nonSortable: false,
                key: "name",
                customSort: userColumnsCustomSort,
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={currentUser}
                                              gotoInvitation={isAdmin ? this.gotoInvitation : null}/>
            },
            {
                key: "user__schac_home_service",
                header: I18n.t("models.users.institute"),
                mapper: entity => <InstituteColumn entity={entity} currentUser={currentUser}/>
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                className: !isAdmin ? "not-allowed" : "",
                mapper: entity => this.renderSelectRole(entity, currentUser, service)
            },
            {
                nonSortable: true,
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
        ].filter(column => !isEmpty(column))
        const entities = admins.concat(invites);
        return (<>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={isWarning}
                                    confirmationTxt={confirmationTxt}
                                    question={confirmationQuestion}>
                    {lastAdminWarning && <LastAdminWarning organisation={service}
                                                           currentUserDeleted={lastAdminWarningUser}
                                                           localePrefix={"service.confirmation"}/>}
                </ConfirmationDialog>

                <Entities entities={entities}
                          modelName="serviceAdmins"
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name"
                          inputFocus={true}
                          columns={columns}
                          loading={false}
                          onHover={true}
                          showNew={isAdmin}
                          actions={(isAdmin && entities.length > 0) ? this.actionButtons(selectedMembers) : null}
                          newEntityPath={`/new-service-invite/${service.id}`}
                          {...this.props}/>
            </>
        )
    }
}

export default ServiceAdmins;

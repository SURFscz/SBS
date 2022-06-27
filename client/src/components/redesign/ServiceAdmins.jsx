import React from "react";
import I18n from "i18n-js";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/toys-hand-ghost.svg";
import CheckBox from "../CheckBox";
import {deleteServiceMembership, serviceInvitationBulkResend, serviceInvitationDelete} from "../../api";
import {setFlash} from "../../utils/Flash";
import "./ServiceAdmins.scss";
import {isInvitationExpired, shortDateFromEpoch} from "../../utils/Date";
import Button from "../Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../ConfirmationDialog";
import UserColumn from "./UserColumn";
import {isUserServiceAdmin} from "../../utils/UserRole";
import SpinnerField from "./SpinnerField";
import Tooltip from "./Tooltip";
import ReactTooltip from "react-tooltip";
import InstituteColumn from "./InstitueColumn";
import {isEmpty} from "../../utils/Utils";
import {emitImpersonation} from "../../utils/Impersonation";

const INVITE_IDENTIFIER = "INVITE_IDENTIFIER";
const MEMBER_IDENTIFIER = "MEMBER_IDENTIFIER";

class ServiceAdmins extends React.Component {

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
            loading: true
        }
    }

    componentDidMount = () => {
        this.setState({loading: true});
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
        selectedMembers[this.getIdentifier(memberShip)].selected = checked;
        this.setState({selectedMembers: {...selectedMembers}});
    }

    remove = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: true,
                confirmationDialogAction: this.remove(false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: I18n.t("serviceDetail.deleteMemberConfirmation"),
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            const {selectedMembers} = this.state;
            const {user: currentUser, service} = this.props;
            const currentUserDeleted = Object.values(selectedMembers)
                .some(sr => sr.selected && !sr.ref.invite && sr.ref.user.id === currentUser.id);
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
                {anySelected && <div data-tip data-for="delete-members">
                    <Button onClick={this.remove(true)} txt={I18n.t("models.orgMembers.remove")}
                            icon={<FontAwesomeIcon icon="trash"/>}/>
                    <ReactTooltip id="delete-members" type="light" effect="solid" data-html={true}
                                  place="bottom">
                    <span
                        dangerouslySetInnerHTML={{
                            __html: !anySelected ?
                                I18n.t("models.orgMembers.removeTooltipDisabled") :
                                I18n.t("models.orgMembers.removeTooltip")
                        }}/>
                    </ReactTooltip>
                </div>}

                {showResendInvite && <div data-tip data-for="resend-invites">
                    <Button onClick={this.resend(true)} txt={I18n.t("models.orgMembers.resend")}
                            icon={<FontAwesomeIcon icon="voicemail"/>}/>
                    <ReactTooltip id="resend-invites" type="light" effect="solid" data-html={true}
                                  place="bottom">
                        <span
                            dangerouslySetInnerHTML={{__html: !showResendInvite ? I18n.t("models.orgMembers.resendTooltipDisabled") : I18n.t("models.orgMembers.resendTooltip")}}/>
                    </ReactTooltip>
                </div>}

            </div>);
    }

    actionIcons = entity => {
        const showResendInvite = entity.invite === true && isInvitationExpired(entity);
        return (
            <div className="admin-icons">
                <div data-tip data-for={`delete-org-member-${entity.id}`}
                     onClick={e => this.removeFromActionIcon(entity.id, entity.invite, true)}>
                    <FontAwesomeIcon icon="trash"/>
                    <ReactTooltip id={`delete-org-member-${entity.id}`} type="light" effect="solid" data-html={true}
                                  place="bottom">
                        <span dangerouslySetInnerHTML={{
                            __html: entity.invite ? I18n.t("models.orgMembers.removeInvitationTooltip") :
                                I18n.t("models.orgMembers.removeMemberTooltip")
                        }}/>
                    </ReactTooltip>
                </div>
                {showResendInvite &&
                <div data-tip data-for={`resend-invite-${entity.id}`}>
                    <FontAwesomeIcon icon="voicemail" onClick={this.resendFromActionMenu(entity.id, true)}/>
                    <ReactTooltip id={`resend-invite-${entity.id}`} type="light" effect="solid" data-html={true}
                                  place="bottom">
                        <span
                            dangerouslySetInnerHTML={{__html: I18n.t("models.orgMembers.resendInvitationTooltip")}}/>
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

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    render() {
        const {user: currentUser, service} = this.props;
        const {
            selectedMembers, confirmationDialogOpen, cancelDialogAction, isWarning,
            confirmationDialogAction, confirmationQuestion, loading, confirmationTxt
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
            {
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
            },
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: entity => <div className="member-icon">
                    {entity.invite ?
                        <Tooltip children={<InviteIcon/>} id={"invite-icon"} msg={I18n.t("tooltips.invitations")}/> :
                        <Tooltip children={<UserIcon/>} id={"admin-icon"} msg={I18n.t("tooltips.admin")}/>}
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
                key: "user__schac_home_service",
                header: I18n.t("models.users.institute"),
                mapper: entity => <InstituteColumn entity={entity} currentUser={currentUser}/>
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                className: !isAdmin ? "not-allowed" : "",
                mapper: () => <span className="member-role">{I18n.t(`organisation.admin`)}</span>
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
                          modelName="serviceAdmins"
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name"
                          columns={columns}
                          loading={false}
                          hideTitle={true}
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
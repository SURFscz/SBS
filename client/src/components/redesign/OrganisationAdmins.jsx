import React from "react";
import I18n from "i18n-js";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/toys-hand-ghost.svg";
import CheckBox from "../CheckBox";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import {
    deleteOrganisationMembership,
    organisationInvitationDelete,
    organisationInvitationResend,
    updateOrganisationMembershipRole
} from "../../api";
import {setFlash} from "../../utils/Flash";
import "./OrganisationAdmins.scss";
import Select from "react-select";
import {emitter} from "../../utils/Events";
import {isInvitationExpired, shortDateFromEpoch} from "../../utils/Date";
import {stopEvent} from "../../utils/Utils";
import Button from "../Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../ConfirmationDialog";
import UserColumn from "./UserColumn";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import SpinnerField from "./SpinnerField";
import InputField from "../InputField";
import moment from "moment";
import ErrorIndicator from "./ErrorIndicator";
import Tooltip from "./Tooltip";
import {ReactComponent as MembersIcon} from "../../icons/single-neutral.svg";
import ReactTooltip from "react-tooltip";

const roles = [
    {value: "admin", label: I18n.t(`organisation.organisationShortRoles.admin`)},
    {value: "manager", label: I18n.t(`organisation.organisationShortRoles.manager`)}
];

class OrganisationAdmins extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedMembers: {},
            allSelected: false,
            selectedInvitationId: null,
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
        const {organisation} = this.props;
        const admins = organisation.organisation_memberships;
        const invites = organisation.organisation_invitations;
        const entities = admins.concat(invites);
        const selectedMembers = entities.reduce((acc, entity) => {
            acc[entity.id] = {selected: false, ref: entity};
            return acc;
        }, {})
        this.setState({selectedMembers, loading: false, selectedInvitationId: null, message: ""});
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
        const {selectedMembers, allSelected} = this.state;
        const checked = e.target.checked;
        selectedMembers[memberShip.id].selected = checked;
        this.setState({selectedMembers: {...selectedMembers}});
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
        const {organisation} = this.props;
        const selectedInvitation = organisation.organisation_invitations.find(i => i.id === invitation.id)
        this.setState({selectedInvitationId: selectedInvitation.id, message: selectedInvitation.message});
    };

    getSelectedInvitation = () => {
        const {selectedInvitationId} = this.state;
        const {organisation} = this.props;
        return organisation.organisation_invitations.find(i => i.id === selectedInvitationId);
    }

    remove = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
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
                return ref.invite ? organisationInvitationDelete(ref.id,false) :
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

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({loading: true});
        promise
            .then(() => {
                this.props.refresh(() => {
                    this.componentDidMount();
                    setFlash(flashMsg);
                    callback && callback();
                });
            }).catch(() => {
            this.handle404("invitation");
        });
    }

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
        const anySelected = Object.values(selectedMembers).some(v => v.selected);
        return (
            <div className="admin-actions">
                <span data-tip data-for="delete-members">
                <Button onClick={this.remove(true)} txt={I18n.t("models.orgMembers.remove")}
                        disabled={!anySelected}
                        icon={<FontAwesomeIcon icon="trash"/>}/>
                <ReactTooltip id="delete-members" type="light" effect="solid" data-html={true}
                              place="bottom">
                    <span
                        dangerouslySetInnerHTML={{__html: !anySelected ? I18n.t("models.orgMembers.removeTooltipDisabled") : I18n.t("models.orgMembers.removeTooltip")}}/>
            </ReactTooltip>
                    </span>
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
        const {organisation} = this.props;
        this.refreshAndFlash(organisationInvitationDelete(invitation.id, false),
            I18n.t("organisationInvitation.flash.inviteDeleted", {name: organisation.name}),
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
        const {organisation} = this.props;
        const {message} = this.state;
        this.refreshAndFlash(organisationInvitationResend({...invitation, message}, false),
            I18n.t("organisationInvitation.flash.inviteResend", {name: organisation.name}),
            this.cancelSideScreen)
    };


    renderSelectedInvitation = (organisation, invitation) => {
        const {
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion,
            isWarning, message, confirmationTxt
        } = this.state;
        const today = moment();
        const inp = moment(invitation.expiry_date * 1000);
        const isExpired = today.isAfter(inp);
        const expiredMessage = isExpired ? I18n.t("organisationInvitation.expiredAdmin", {expiry_date: inp.format("LL")}) : null;
        return (
            <div className="organisation-invitation-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={isWarning}
                                    confirmationTxt={confirmationTxt}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}/>
                <a className="back-to-org-members" onClick={this.cancelSideScreen} href={"/cancel"}>
                    <ChevronLeft/>{I18n.t("models.orgMembers.backToMembers")}
                </a>
                <div className="organisation-invitation-form">
                    {isExpired && <ErrorIndicator msg={expiredMessage} standalone={true}/>}
                    <h2>{I18n.t("models.orgMembers.invitation",
                        {
                            date: moment(invitation.created_at * 1000).format("LL"),
                            inviter: invitation.user.name,
                            email: invitation.invitee_email
                        })}</h2>

                    <InputField value={I18n.t(`organisation.organisationRoles.${invitation.intended_role}`)}
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


    render() {
        const {user: currentUser, organisation} = this.props;
        const {
            selectedMembers, confirmationDialogOpen, cancelDialogAction,
            confirmationDialogAction, confirmationQuestion, loading, confirmationTxt
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const selectedInvitation = this.getSelectedInvitation();
        if (selectedInvitation) {
            return this.renderSelectedInvitation(organisation, selectedInvitation);
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
        const columns = [
            {
                nonSortable: true,
                key: "check",
                // header: <CheckBox value={allSelected} name={"allSelected"}
                //                   onChange={this.allSelected}/>,
                mapper: entity => <div className="check">
                    {(entity.invite || entity.role === "manager" || (!oneAdminLeft &&
                        (!noMoreAdminsToCheck || selectedMembers[entity.id].selected))) &&
                    <CheckBox name={"" + ++i} onChange={this.onCheck(entity)}
                              value={(selectedMembers[entity.id] || {}).selected || false}/>}
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
                mapper: entity => entity.invite ? "" : entity.user.schac_home_organisation
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                className: !isAdmin ? "not-allowed" : "",
                mapper: entity => entity.invite ? null : <Select
                    value={roles.find(option => option.value === entity.role)}
                    options={roles}
                    classNamePrefix={`select-member-role`}
                    onChange={this.changeMemberRole(entity)}
                    isDisabled={!isAdmin || !(entity.invite || entity.role === "manager" || (!oneAdminLeft &&
                        (!noMoreAdminsToCheck || selectedMembers[entity.id].selected)))}/>
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
                mapper: entity => {
                    if (!isAdmin) {
                        return null;
                    }
                    if (entity.invite) {
                        return <Button onClick={this.gotoInvitation(entity)} txt={I18n.t("forms.open")} small={true}/>
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
            },
        ]
        const entities = admins.concat(invites);
        return (<>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    confirmationTxt={confirmationTxt}
                                    question={confirmationQuestion}/>

                <Entities entities={entities}
                          modelName="orgMembers"
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name"
                          columns={isAdmin ? columns : columns.slice(1)}
                          rowLinkMapper={entity => (entity.invite && isAdmin) && this.gotoInvitation}
                          loading={false}
                          showNew={isAdmin}
                          actions={(isAdmin && entities.length > 0) ? this.actionButtons(selectedMembers) : null}
                          newEntityPath={`/new-organisation-invite/${organisation.id}`}
                          {...this.props}/>
            </>
        )
    }
}

export default OrganisationAdmins;
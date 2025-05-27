import React from "react";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as MembersIcon} from "../../icons/single-neutral.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/puppet_new.svg";
import {ReactComponent as EmailIcon} from "../../icons/email_new.svg";
import {ReactComponent as ThrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import CheckBox from "../checkbox/CheckBox";
import {
    deleteCollaborationMembership,
    invitationBulkResend,
    invitationDelete,
    invitationResend,
    updateCollaborationMembershipExpiryDate,
    updateCollaborationMembershipRole
} from "../../api";
import {setFlash} from "../../utils/Flash";
import "./CollaborationAdmins.scss";
import Select from "react-select";
import {displayMembershipExpiryDate, isInvitationExpired, shortDateFromEpoch} from "../../utils/Date";
import {expiryDateCustomSort, isEmpty, stopEvent, userColumnsCustomSort} from "../../utils/Utils";
import Button from "../button/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../confirmation-dialog/ConfirmationDialog";
import UserColumn from "./UserColumn";
import {chipType, isUserAllowed, ROLES} from "../../utils/UserRole";
import SpinnerField from "./SpinnerField";
import moment from "moment";
import {Chip, Tooltip, ChipType} from "@surfnet/sds";
import LastAdminWarning from "./LastAdminWarning";
import DateField from "../DateField";
import InstituteColumn from "./InstituteColumn";
import {ReactComponent as ChevronUp} from "../../icons/chevron-up.svg";
import {ReactComponent as ChevronDown} from "../../icons/chevron-down.svg";
import {emitImpersonation} from "../../utils/Impersonation";

const memberFilterValue = "members";

const INVITE_IDENTIFIER = "INVITE_IDENTIFIER";
const MEMBER_IDENTIFIER = "MEMBER_IDENTIFIER";

class CollaborationAdmins extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedMembers: {},
            allSelected: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            confirmationQuestion: "",
            lastAdminWarning: false,
            lastAdminWarningUser: false,
            isWarning: true,
            filterOptions: [],
            filterValue: {value: memberFilterValue, label: ""},
            hideInvitees: false,
            resultAfterSearch: false,
            openExpirationFields: {},
            loading: false
        }
    }

    componentDidUpdate = prevProps => {
        const nextCollaboration = this.props.collaboration;
        const {collaboration} = prevProps;
        if (collaboration) {
            const prevMembers = nextCollaboration.collaboration_memberships || [];
            const prevInvites = nextCollaboration.invitations || [];
            const members = collaboration.collaboration_memberships || [];
            const invites = collaboration.invitations || [];
            if (prevMembers.length !== members.length || prevInvites.length !== invites.length) {
                this.componentDidMount();
            }
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
        const openExpirationFields = collaboration.collaboration_memberships.reduce((acc, entity) => {
            acc[this.getIdentifier(entity)] = false;
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
            expiryDate: null,
            selectedMemberExpiryDate: null,
            selectedMemberId: null,
            allSelected: false,
            confirmationDialogOpen: false,
            openExpirationFields: openExpirationFields
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
            const lastAdminWarningUser = lastAdminWarning && member.user_id === currentUser.id;
            this.setState({
                confirmationDialogOpen: true,
                lastAdminWarning: lastAdminWarning,
                lastAdminWarningUser: lastAdminWarningUser,
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                confirmationDialogAction: () => {
                    this.setState({loading: true});
                    updateCollaborationMembershipRole(collaboration.id, member.user_id, selectedOption.value, false)
                        .then(() => {
                            this.props.refreshUser(() => {
                                if (!canStay) {
                                    this.props.history.push("/home");
                                } else {
                                    this.props.refresh(this.componentDidMount);
                                }
                            });
                            setFlash(I18n.t("collaborationDetail.flash.memberUpdated", {
                                name: member.user.name,
                                role: selectedOption.value
                            }));
                        }).catch(() => {
                        this.handle404("member");
                    });
                },
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationQuestion: lastAdminWarningUser ?
                    I18n.t("collaborationDetail.downgradeYourselfMemberConfirmation") : "",
            });
        } else {
            this.setState({loading: true});
            updateCollaborationMembershipRole(collaboration.id, member.user_id, selectedOption.value, false)
                .then(() => {
                    this.props.refresh(this.componentDidMount);
                    setFlash(I18n.t("collaborationDetail.flash.memberUpdated", {
                        name: member.user.name,
                        role: selectedOption.value
                    }));
                }).catch(() => {
                this.handle404("member");
            });
        }
    };

    updateExpiryDate = (member, expiryDate, showConfirmation) => {
        if (showConfirmation) {
            const label = expiryDate ? "expiryDateChange" : "expiryDateReset";
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t(`collaborationDetail.${label}`, {
                    name: member.user.name,
                    date: expiryDate ? moment(expiryDate).format("LL") : ""
                }),
                isWarning: false,
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                cancelDialogAction: () => {
                    this.closeConfirmationDialog();
                    this.toggleExpirationDateField(member);
                },
                confirmationDialogAction: () => this.updateExpiryDate(member, expiryDate, false)
            });
        } else {
            const {collaboration} = this.props;
            this.setState({loading: true});
            const expiryDateNbr = expiryDate ? expiryDate.getTime() / 1000 : null;
            updateCollaborationMembershipExpiryDate(collaboration.id, member.id, expiryDateNbr)
                .then(() => {
                    this.props.refresh(this.componentDidMount);
                }).catch(() => {
                this.handle404("member");
            });
        }
    }

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

    handle404 = key => {
        this.setState({
            loading: false,
            confirmationTxt: I18n.t("confirmationDialog.ok"),
            confirmationDialogOpen: true,
            confirmationDialogAction: () => {
                this.setState({confirmationDialogOpen: false, confirmationTxt: I18n.t("confirmationDialog.confirm")});
                this.props.refresh(this.componentDidMount);
            },
            cancelDialogAction: undefined,
            confirmationQuestion: I18n.t(`organisationDetail.gone.${key}`),
        });
    }

    removeFromActionIcon = (entityId, isInvite, showConfirmation) => {
        const {user: currentUser, collaboration} = this.props;
        const members = collaboration.collaboration_memberships;
        const invites = collaboration.invitations || [];
        const entity = isInvite ? invites.find(inv => inv.id === entityId) : members.find(m => m.id === entityId)
        const currentUserDeleted = !entity.invite && entity.user.id === currentUser.id;
        const lastAdminWarning = !isInvite && members
            .filter(m => m.role === "admin")
            .filter(m => !(entity.user.id === m.user.id))
            .length === 0;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                isWarning: true,
                lastAdminWarning: lastAdminWarning,
                lastAdminWarningUser: currentUserDeleted && lastAdminWarning,
                confirmationDialogAction: () => this.removeFromActionIcon(entityId, isInvite, false),
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                confirmationQuestion: currentUserDeleted ? I18n.t("collaborationDetail.deleteYourselfMemberConfirmation") :
                    entity.invite ? I18n.t("collaborationDetail.deleteInvitationConfirmation", {name: entity.invitee_email}) : I18n.t("collaborationDetail.deleteMemberConfirmation", {name: entity.user.name})
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            const promise = entity.invite ? invitationDelete(entity.id, false) :
                deleteCollaborationMembership(collaboration.id, entity.user.id, false);
            promise.then(() => {
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
        const {collaboration} = this.props;
        const invites = collaboration.invitations || [];
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
            this.refreshAndFlash(invitationResend(entity, false),
                I18n.t("invitation.flash.inviteResend", {name: collaboration.name}),
                this.closeConfirmationDialog);
        }
    };

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
                return ref.invite ? invitationDelete(ref.id, false) :
                    deleteCollaborationMembership(collaboration.id, ref.user.id, false)
            });
            Promise.all(promises).then(() => {
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
        }).catch(() => {
            this.handle404("invitation");
        });
    }

    actionIcons = (entity, collaboration) => {
        const hrefValue = encodeURI(entity.invite ? entity.invitee_email : entity.user.email);
        const showResendInvite = entity.invite === true;
        const bcc = (collaboration.disclose_email_information && collaboration.disclose_member_information) ? "" : "?bcc=";
        return (
            <div className="admin-icons">
                <div onClick={() => this.removeFromActionIcon(entity.id, entity.invite, true)}>
                    <Tooltip standalone={true}
                             tip={entity.invite ? I18n.t("models.orgMembers.removeInvitationTooltip") :
                                 I18n.t("models.orgMembers.removeMemberTooltip")}
                             children={<ThrashIcon/>}/>
                </div>
                <div>
                    <a href={`mailto:${bcc}${hrefValue}`}
                       rel="noopener noreferrer">
                        <Tooltip
                            tip={entity.invite ? I18n.t("models.orgMembers.mailInvitationTooltip") : I18n.t("models.orgMembers.mailMemberTooltip")}
                            standalone={true}
                            children={<EmailIcon/>}/>
                    </a>
                </div>
                {showResendInvite &&
                    <div onClick={this.resendFromActionMenu(entity.id, true)}>
                        <Tooltip tip={I18n.t("models.orgMembers.resendInvitationTooltip")}
                                 standalone={true}
                                 children={<FontAwesomeIcon icon="voicemail"/>}/>
                    </div>}
            </div>);
    }


    actionButtons = (collaboration, isAdminOfCollaboration, selectedMembers, filteredEntities) => {
        const any = filteredEntities.length !== 0;
        const filteredSelectedMembers = this.getSelectedMembersWithFilteredSearch(selectedMembers);
        const selected = Object.values(filteredSelectedMembers)
            .filter(v => v.selected)
            .filter(v => filteredEntities.find(e => e.id === v.ref.id && e.invite === v.ref.invite));
        const hrefValue = encodeURI(selected.map(v => v.ref.invite ? v.ref.invitee_email : v.ref.user.email).join(","));
        const disabled = selected.length === 0;
        const showResendInvite = selected.length > 0 && selected.every(s => s.invite === true);
        const bcc = (collaboration.disclose_email_information && collaboration.disclose_member_information) ? "" : "?bcc=";
        if (!(any && isAdminOfCollaboration && !disabled) && !(any && (isAdminOfCollaboration || collaboration.disclose_email_information) && !disabled)
            && !(any && isAdminOfCollaboration && showResendInvite)) {
            return null;
        }
        return (
            <div className="admin-actions">
                {(any && isAdminOfCollaboration && !disabled) &&
                    <div>
                        <Tooltip standalone={true}
                                 tip={disabled ? I18n.t("models.orgMembers.removeTooltipDisabled") : I18n.t("models.orgMembers.removeTooltip")}
                                 children={<Button onClick={this.remove(true)}
                                                   small={true}
                                                   txt={I18n.t("models.orgMembers.remove")}
                                                   icon={<ThrashIcon/>}/>}/>
                    </div>}
                {(any && (isAdminOfCollaboration || collaboration.disclose_email_information) && !disabled)
                    &&
                    <div>
                        <Tooltip standalone={true}
                                 tip={disabled ? I18n.t("models.orgMembers.mailTooltipDisabled") : I18n.t("models.orgMembers.mailTooltip")}
                                 children={<a href={`${disabled ? "" : "mailto:"}${bcc}${hrefValue}`}
                                              className="sds--btn sds--btn--primary sds--btn--small"
                                              style={{border: "none", cursor: "default"}}
                                              rel="noopener noreferrer" onClick={e => {
                                     if (disabled) {
                                         stopEvent(e);
                                     } else {
                                         return true;
                                     }
                                 }}>
                                     {I18n.t("models.orgMembers.mail")}<EmailIcon/>
                                 </a>}/>

                    </div>}
                {(any && isAdminOfCollaboration && showResendInvite) &&
                    <div>
                        <Tooltip
                            tip={disabled ? I18n.t("models.orgMembers.resendTooltipDisabled") : I18n.t("models.orgMembers.resendTooltip")}
                            standalone={true}
                            children={<Button onClick={this.resend(true)}
                                              small={true}
                                              txt={I18n.t("models.orgMembers.resend")}
                                              icon={<FontAwesomeIcon icon="voicemail"/>}/>}/>
                    </div>}

            </div>);
    }

    filter = (filterOptions, filterValue, hideInvitees, isAdminOfCollaboration) => {
        return (
            <div className="member-filter">
                <Select
                    className={"member-filter-select"}
                    classNamePrefix={"filter-select"}
                    value={filterValue}
                    onChange={option => this.setState({filterValue: option})}
                    options={filterOptions}
                    isSearchable={false}
                    isClearable={false}
                />
                {isAdminOfCollaboration && <CheckBox name="hide_invitees"
                                                     value={hideInvitees}
                                                     onChange={e => this.setState({hideInvitees: e.target.checked})}
                                                     info={I18n.t("models.collaborations.hideInvites")}/>}
            </div>
        );
    }

    getImpersonateMapper = entity => {
        const {user: currentUser, showMemberView, collaboration} = this.props;
        const {impersonation_allowed} = this.props.config;
        const showImpersonation = currentUser.admin &&
            entity.user &&
            entity.user.id !== currentUser.id
            && !showMemberView
            && impersonation_allowed
            && !entity.invite;
        return (
            <div className={"action-icons-container"}>
                {this.actionIcons(entity, collaboration)}
                {showImpersonation && <div className="impersonation">
                    <HandIcon className="impersonate"
                              onClick={() => emitImpersonation(entity.user, this.props.history)}/>
                </div>}
            </div>
        );
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    resend = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                lastAdminWarning: false,
                lastAdminWarningUser: false,
                leavePage: false,
                isWarning: false,
                confirmationQuestion: I18n.t("organisationInvitation.resendInvitations"),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                cancelDialogAction: this.closeConfirmationDialog,
                confirmationDialogAction: this.resend(false)
            });
        } else {
            const {selectedMembers} = this.state;
            const filteredSelectedInvitations = this.getSelectedMembersWithFilteredSearch(selectedMembers);
            const invitations = Object.values(filteredSelectedInvitations).filter(sel => sel.selected).map(sel => sel.ref).map(inv => ({id: inv.id}));
            const {collaboration} = this.props;
            this.refreshAndFlash(invitationBulkResend(invitations, false),
                I18n.t("organisationInvitation.flash.invitesResend", {name: collaboration.name}),
                this.closeConfirmationDialog);
        }
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

    gotoGroup = (e, collaborationId, groupId) => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        const {tabChanged} = this.props;
        tabChanged("groups", collaborationId, groupId);
    };

    renderGroups = (collaborationMembership, collaboration) => {
        const groups = collaboration.groups
            .filter(group => group.collaboration_memberships.some(cm => cm.user_id === collaborationMembership.user_id));
        return (
            <ul>
                {groups.map((group, index) => <li key={index}>
                    <a href={`/collaborations/${collaboration.id}/groups/${group.id}`}
                       onClick={e => this.gotoGroup(e, collaboration.id, group.id)}>{group.name}</a>
                </li>)}
            </ul>
        );
    }

    searchCallback = resultAfterSearch => {
        this.setState({resultAfterSearch: resultAfterSearch});
    }

    renderSelectRole = (entity, isAdminOfCollaboration) => {
        if (entity.invite || !isAdminOfCollaboration) {
            return <Chip label={I18n.t(`organisation.${entity.invite ? entity.intended_role : entity.role}`)}
                         type={chipType(entity)}/>
        }
        const roles = [
            {value: "admin", label: I18n.t(`organisation.admin`)},
            {value: "member", label: I18n.t(`organisation.member`)}
        ];
        return <Select value={roles.find(option => option.value === entity.role)}
                       options={roles}
                       classNamePrefix={`select-member-role`}
                       onChange={this.changeMemberRole(entity)}
                       isDisabled={!isAdminOfCollaboration}/>
    }

    toggleExpirationDateField = entity => {
        const {openExpirationFields} = this.state;
        const identifier = this.getIdentifier(entity);
        const isOpen = openExpirationFields[identifier];
        const closeExpiration = {[identifier]: !isOpen}
        this.setState({
            openExpirationFields: {...openExpirationFields, ...closeExpiration}
        });
    }

    renderExpiryDate = (entity, openExpirationFields, adminOfCollaboration) => {
        const expired = isInvitationExpired(entity);
        let className = "active"
        let status = I18n.t("models.orgMembers.accepted");
        let msg = I18n.t("models.orgMembers.membershipNoExpiry")
        if (expired) {
            status = I18n.t("models.orgMembers.expired");
            className = "expired"
            msg = displayMembershipExpiryDate(entity.expiry_date);
        } else if (entity.expiry_date) {
            const today = new Date().getTime();
            const expiryDate = entity.expiry_date * 1000;
            const days = Math.round((expiryDate - today) / (1000 * 60 * 60 * 24));
            className = days < 60 ? "expires" : "";
            status = I18n.t("models.orgMembers.expires");
            msg = displayMembershipExpiryDate(entity.expiry_date);
        }
        const expiryDate = entity.expiry_date ? moment(entity.expiry_date * 1000).toDate() : null;
        const isOpen = openExpirationFields[this.getIdentifier(entity)]
        return (<div className="date-field-container">
            {!isOpen &&
                <div className="expiration-toggle" onClick={() => this.toggleExpirationDateField(entity)}>
                    <div className="text-container">
                        {entity.expiry_date && <span className={`status ${className}`}>{status}</span>}
                        <span className="msg">{msg}</span>
                    </div>
                    <div className="chevron-container" onClick={() => this.toggleExpirationDateField(entity)}>
                        <ChevronDown/>
                    </div>
                </div>}
            {isOpen && <DateField value={expiryDate}
                                  disabled={!adminOfCollaboration}
                                  onChange={e => this.updateExpiryDate(entity, e, true)}
                                  allowNull={true}
                                  pastDatesAllowed={this.props.config.past_dates_allowed}
                                  performValidateOnBlur={false}
                                  isOpen={isOpen}
                                  showYearDropdown={true}/>}
            {isOpen && <div className="chevron-container" onClick={() => this.toggleExpirationDateField(entity)}>
                <ChevronUp/>
            </div>}

        </div>)
    }

    render() {
        const {user: currentUser, collaboration, isAdminView, showMemberView} = this.props;
        const {
            selectedMembers, allSelected, filterOptions, filterValue, hideInvitees,
            confirmationDialogOpen, cancelDialogAction, isWarning, confirmationTxt,
            confirmationDialogAction, confirmationQuestion, loading, lastAdminWarning, lastAdminWarningUser,
            openExpirationFields
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const isAdminOfCollaboration = isUserAllowed(ROLES.COLL_ADMIN, currentUser, collaboration.organisation_id, collaboration.id) && !showMemberView;
        const members = collaboration.collaboration_memberships;
        const invites = collaboration.invitations || [];
        invites.forEach(invite => invite.invite = true);
        const hideAdminColumns = !isAdminOfCollaboration || showMemberView;
        let i = 0;
        const columns = [
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
                        <Tooltip children={<InviteIcon/>} tip={I18n.t("tooltips.invitations")} standalone={true}/>}
                    {(!entity.invite && entity.role === "admin") &&
                        <Tooltip children={<UserIcon/>} standalone={true} tip={I18n.t("tooltips.admin")}/>}
                    {(!entity.invite && entity.role !== "admin") &&
                        <Tooltip children={<MembersIcon/>} standalone={true} tip={I18n.t("tooltips.user")}/>}

                </div>
            },
            {
                nonSortable: false,
                key: "name",
                customSort: userColumnsCustomSort,
                class: hideAdminColumns ? "no-admin-columns" : "",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={currentUser}
                                              hideEmail={showMemberView && !collaboration.disclose_email_information}/>
            },
            {
                key: "user__schac_home_organisation",
                class: hideAdminColumns ? "no-admin-columns" : "",
                header: I18n.t("models.users.institute"),
                mapper: entity => <InstituteColumn entity={entity} currentUser={currentUser}/>
            },
            {
                key: "role",
                class: hideAdminColumns ? "no-admin-columns" : "",
                header: I18n.t("models.users.role"),
                mapper: entity => this.renderSelectRole(entity, isAdminOfCollaboration)
            },
            hideAdminColumns ? null : {
                key: "expiry_date",
                customSort: expiryDateCustomSort,
                header: I18n.t("organisationMembership.member"),
                mapper: entity => {
                    if (isAdminOfCollaboration || entity.user.id === currentUser.id) {
                        const isExpired = entity.invite && isInvitationExpired(entity);
                        return entity.invite ?
                            <div className={"chip-container"}>
                                <Chip
                                    label={isExpired ? I18n.t("models.orgMembers.expiredAt", {date: shortDateFromEpoch(entity.expiry_date)}) :
                                        I18n.t("models.orgMembers.inviteSend", {date: shortDateFromEpoch(entity.created_at)})}
                                    type={isExpired ? ChipType.Status_error : ChipType.Status_info}/>
                            </div>
                            : this.renderExpiryDate(entity, openExpirationFields, isAdminOfCollaboration);
                    }
                    return null;
                }
            },
            {
                key: "groups",
                nonSortable: true,
                hasLink: true,
                header: I18n.t("organisationMembership.groups"),
                mapper: entity => entity.invite ? null : this.renderGroups(entity, collaboration)
            },
            hideAdminColumns ? null : {
                nonSortable: true,
                key: "impersonate",
                header: "",
                mapper: this.getImpersonateMapper
            },
        ].filter(column => !isEmpty(column));
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
                          inputFocus={true}
                          onHover={true}
                          searchCallback={this.searchCallback}
                          columns={(isAdminOfCollaboration || collaboration.disclose_email_information) ? columns : columns.slice(1)}
                          loading={false}
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

import React from "react";
import {
    addAuthorisationGroupInvitations,
    addAuthorisationGroupMembers,
    addAuthorisationGroupServices,
    authorisationGroupById,
    authorisationGroupNameExists, authorisationGroupShortNameExists,
    collaborationLiteById,
    collaborationServices,
    createAuthorisationGroup,
    deleteAuthorisationGroup, deleteAuthorisationGroupInvitations,
    deleteAuthorisationGroupMembers,
    deleteAuthorisationGroupServices, preFlightDeleteAuthorisationGroupMember, preFlightDeleteAuthorisationGroupService,
    updateAuthorisationGroup
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./AuthorisationGroup.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty, sortObjects, stopEvent} from "../utils/Utils";
import SelectField from "../components/SelectField";
import {authorisationGroupStatuses} from "../forms/constants";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {headerIcon} from "../forms/helpers";
import ReactTooltip from "react-tooltip";

import Select from "react-select";
import moment from "moment";
import CheckBox from "../components/CheckBox";

const userServiceProfileAttributes = ["name", "ssh_key", "email", "address", "telephone_number"];

class AuthorisationGroup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.statusOptions = authorisationGroupStatuses.map(type => ({
            value: type,
            label: I18n.t(`authorisationGroup.statusValues.${type}`)
        }));
        this.state = {
            collaboration: undefined,
            collaboration_id: undefined,
            authorisationGroup: {},
            allServices: [],
            sortedServices: [],
            sortedServicesBy: "name",
            reverseServices: false,
            allMembers: [],
            sortedMembers: [],
            sortedMembersBy: "user__name",
            reverseMembers: false,
            sortedInvitations: [],
            sortedInvitationsBy: "invitee_email",
            reverseInvitations: false,
            name: "",
            short_name: "",
            auto_provision_members: false,
            uri: "",
            description: "",
            status: this.statusOptions[0].value,
            required: ["name", "short_name"],
            alreadyExists: {},
            initial: true,
            isNew: true,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            leavePage: true,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            back: "/collaborations",
            userServiceProfilesPreFlight: []
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const {user} = this.props;
        if (params.id && params.collaboration_id) {
            const collaboration_id = parseInt(params.collaboration_id, 10);
            const member = (user.collaboration_memberships || []).find(membership => membership.collaboration_id === collaboration_id);
            if (isEmpty(member) && !user.admin) {
                this.props.history.push("/404");
                return;
            }
            if (!user.admin && (isEmpty(member) || member.role !== "admin") && params.id === "new") {
                this.props.history.push("/404");
                return;
            }
            const back = (isEmpty(member) || member.role !== "admin") && !user.admin ? "/home" : `/collaboration-authorisation-groups/${params.collaboration_id}`;
            const adminOfCollaboration = (!isEmpty(member) && member.role === "admin") || user.admin;
            if (params.id !== "new") {
                const collDetail = adminOfCollaboration ? collaborationServices : collaborationLiteById;
                Promise.all([collDetail(params.collaboration_id), authorisationGroupById(params.id, params.collaboration_id)])
                    .then(res => {
                        const {
                            sortedServicesBy, reverseServices, sortedMembersBy, reverseMembers,
                            sortedInvitationsBy, reverseInvitations
                        } = this.state;
                        const collaboration = res[0];
                        const authorisationGroup = res[1];
                        const allServices = this.sortedCollaborationServices(collaboration);
                        const allMembers = this.sortedCollaborationMembers(collaboration);
                        this.setState({
                            ...authorisationGroup,
                            collaboration: collaboration,
                            collaboration_id: collaboration.id,
                            authorisationGroup: authorisationGroup,
                            allMembers: allMembers,
                            sortedMembers: sortObjects(authorisationGroup.collaboration_memberships, sortedMembersBy, reverseMembers),
                            sortedInvitations: sortObjects(authorisationGroup.invitations, sortedInvitationsBy, reverseInvitations),
                            allServices: allServices,
                            sortedServices: sortObjects(authorisationGroup.services, sortedServicesBy, reverseServices),
                            isNew: false,
                            back: back,
                            adminOfCollaboration: adminOfCollaboration
                        })
                    });
            } else {
                collaborationServices(params.collaboration_id, true)
                    .then(collaboration => {
                        const allServices = this.sortedCollaborationServices(collaboration);
                        const allMembers = this.sortedCollaborationMembers(collaboration);
                        this.setState({
                            collaboration: collaboration,
                            collaboration_id: collaboration.id,
                            allServices: allServices,
                            allMembers: allMembers,
                            back: back,
                            adminOfCollaboration: adminOfCollaboration
                        })
                    });
            }
        } else {
            this.props.history.push("/404");
        }
    };

    refreshServices = callBack => {
        const params = this.props.match.params;
        authorisationGroupById(params.id, params.collaboration_id)
            .then(json => {
                const {sortedServicesBy, reverseServices} = this.state;
                this.setState({
                    sortedServices: sortObjects(json.services, sortedServicesBy, reverseServices)
                }, callBack())
            });
    };

    refreshMembersAndInvitations = callBack => {
        const params = this.props.match.params;
        authorisationGroupById(params.id, params.collaboration_id)
            .then(json => {
                const {sortedMembersBy, reverseMembers, sortedInvitationsBy, reverseInvitations} = this.state;
                this.setState({
                    sortedMembers: sortObjects(json.collaboration_memberships, sortedMembersBy, reverseMembers),
                    sortedInvitations: sortObjects(json.invitations, sortedInvitationsBy, reverseInvitations)
                }, callBack())
            });
    };

    sortedCollaborationMembers = collaboration => {
        const members = (collaboration.collaboration_memberships || [])
            .sort((a, b) => a.user.name.localeCompare(b.user.name))
            .map(member => ({
                value: member.id,
                label: this.memberToOption(member),
                isMember: true
            }));
        const invitations = (collaboration.invitations || [])
            .sort((a, b) => a.invitee_email.localeCompare(b.invitee_email))
            .map(invitation => ({
                value: invitation.id,
                label: `${invitation.invitee_email} - ${I18n.t("authorisationGroup.pendingInvite")}`,
                isMember: false
            }));
        return members.concat(invitations);
    };

    sortedCollaborationServices = collaboration => (collaboration.services || [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(service => ({
            value: service.id,
            label: this.serviceToOption(service)
        }));

    memberToOption = member => `${member.user.name} - ${member.user.email}`;

    serviceToOption = service => `${service.name} - ${service.entity_id}`;

    validateAuthorisationGroupName = e => {
        const {isNew, collaboration, authorisationGroup} = this.state;
        authorisationGroupNameExists(e.target.value, collaboration.id, isNew ? null : authorisationGroup.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });
    };

    validateAuthorisationGroupShortName = e => {
        const {isNew, collaboration, authorisationGroup} = this.state;
        authorisationGroupShortNameExists(e.target.value, collaboration.id, isNew ? null : authorisationGroup.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });
    };


    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoAuthorisations = () => {
        const {back} = this.state;
        this.setState({confirmationDialogOpen: false},
            () => this.props.history.push(back));
    };

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoAuthorisations,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        this.setState({
            userServiceProfilesPreFlight: [],
            confirmationDialogOpen: true,
            confirmationDialogQuestion: I18n.t("authorisationGroup.deleteConfirmation", {name: this.state.authorisationGroup.name}),
            leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const {authorisationGroup, back} = this.state;
        deleteAuthorisationGroup(authorisationGroup.id).then(() => {
            this.props.history.push(back);
            setFlash(I18n.t("authorisationGroup.flash.deleted", {name: authorisationGroup.name}));
        });
    };

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {name, isNew} = this.state;
            if (isNew) {
                createAuthorisationGroup(this.state).then(() => {
                    this.gotoAuthorisations();
                    setFlash(I18n.t("authorisationGroup.flash.created", {name: name}));
                });
            } else {
                updateAuthorisationGroup(this.state).then(() => {
                    this.gotoAuthorisations();
                    setFlash(I18n.t("authorisationGroup.flash.updated", {name: name}));
                });
            }
        }
    };

    addService = option => {
        const {collaboration, authorisationGroup, name} = this.state;
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        addAuthorisationGroupServices({
            authorisationGroupId: authorisationGroup.id,
            collaborationId: collaboration.id,
            serviceIds: option.value
        }).then(() => {
            this.refreshServices(() => setFlash(I18n.t("authorisationGroup.flash.addedService", {
                service: option.label,
                name: authorisationGroupName
            })));
        });
    };

    userServiceProfileContainsPersonalData = userServiceProfile => {
        return userServiceProfileAttributes.some(attr => !isEmpty(userServiceProfile[attr]))
    };

    removeService = service => () => {
        const {collaboration, authorisationGroup} = this.state;
        preFlightDeleteAuthorisationGroupService({
            authorisation_group_id: authorisationGroup.id,
            service_id: service.id,
            collaboration_id: collaboration.id
        }).then(json => {
            const userServiceProfiles = json.filter(userServiceProfile => this.userServiceProfileContainsPersonalData(userServiceProfile));
            if (isEmpty(userServiceProfiles)) {
                this.closeConfirmationDialog();
                this.doRemoveService(service)();
            } else {
                this.setState({
                    userServiceProfilesPreFlight: userServiceProfiles,
                    confirmationDialogOpen: true,
                    confirmationDialogQuestion: I18n.t("authorisationGroup.removeServiceConfirmation", {name: service.name}),
                    leavePage: false,
                    cancelDialogAction: this.closeConfirmationDialog,
                    confirmationDialogAction: this.doRemoveService(service)
                });
            }
        })
    };

    doRemoveService = service => () => {
        this.closeConfirmationDialog();
        const {collaboration, authorisationGroup, name} = this.state;
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        deleteAuthorisationGroupServices(authorisationGroup.id, service.id, collaboration.id).then(() => {
            this.refreshServices(() => setFlash(I18n.t("authorisationGroup.flash.deletedService", {
                service: service.name,
                name: authorisationGroupName
            })));
        });
    };

    addMember = option => {
        const {collaboration, authorisationGroup, name} = this.state;
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        addAuthorisationGroupMembers({
            authorisationGroupId: authorisationGroup.id,
            collaborationId: collaboration.id,
            memberIds: option.value
        }).then(() => {
            this.refreshMembersAndInvitations(() => setFlash(I18n.t("authorisationGroup.flash.addedMember", {
                member: option.label,
                name: authorisationGroupName
            })));
        });
    };

    addAllMembers = () => {
        debugger;
        const {collaboration, authorisationGroup, name, allMembers, sortedMembers, sortedInvitations} = this.state;
        const promises = [];
        const availableMembers = allMembers
            .filter(member => member.isMember && !sortedMembers.find(s => s.id === member.value))
            .map(member => member.value);
        const availableInvitations = allMembers
            .filter(invitation => !invitation.isMember && !sortedInvitations.find(s => s.id === invitation.value))
            .map(invitation => invitation.value);
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        if (availableMembers.length > 0) {
            promises.push(addAuthorisationGroupMembers({
                authorisationGroupId: authorisationGroup.id,
                collaborationId: collaboration.id,
                memberIds: availableMembers
            }));
        }
        if (availableInvitations.length > 0) {
            promises.push(addAuthorisationGroupInvitations({
                authorisationGroupId: authorisationGroup.id,
                collaborationId: collaboration.id,
                invitationIds: availableInvitations
            }));
        }
        if (promises.length > 0) {
            Promise.all(promises).then(() => {
                this.refreshMembersAndInvitations(() => setFlash(I18n.t("authorisationGroup.flash.addedMembers", {
                    name: authorisationGroupName
                })));
            });
        }
    };

    addAllServices = () => {
        const {collaboration, authorisationGroup, name, allServices, sortedServices} = this.state;
        const availableServices = allServices
            .filter(service => !sortedServices.find(s => s.id === service.value))
            .map(service => service.value);
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        addAuthorisationGroupServices({
            authorisationGroupId: authorisationGroup.id,
            collaborationId: collaboration.id,
            serviceIds: availableServices
        }).then(() => {
            this.refreshServices(() => setFlash(I18n.t("authorisationGroup.flash.addedServices", {
                name: authorisationGroupName
            })));
        });
    };

    removeMember = member => () => {
        const {collaboration, authorisationGroup} = this.state;
        preFlightDeleteAuthorisationGroupMember({
            authorisation_group_id: authorisationGroup.id,
            collaboration_membership_id: member.id,
            collaboration_id: collaboration.id
        }).then(json => {
            const userServiceProfiles = json.filter(userServiceProfile => this.userServiceProfileContainsPersonalData(userServiceProfile));
            if (isEmpty(userServiceProfiles)) {
                this.closeConfirmationDialog();
                this.doRemoveMember(member)();
            } else {
                this.setState({
                    userServiceProfilesPreFlight: userServiceProfiles,
                    confirmationDialogOpen: true,
                    confirmationDialogQuestion: I18n.t("authorisationGroup.removeMemberConfirmation", {name: member.user.name}),
                    leavePage: false,
                    cancelDialogAction: this.closeConfirmationDialog,
                    confirmationDialogAction: this.doRemoveMember(member)
                });
            }
        })
    };

    doRemoveMember = member => () => {
        this.closeConfirmationDialog();
        const {collaboration, authorisationGroup} = this.state;
        deleteAuthorisationGroupMembers(authorisationGroup.id, member.id, collaboration.id).then(() => {
            this.refreshMembersAndInvitations(() => setFlash(I18n.t("authorisationGroup.flash.deletedMember", {
                member: member.user.name,
                name: authorisationGroup.name
            })));
        });
    };

    addInvitation = option => {
        const {collaboration, authorisationGroup, name} = this.state;
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        addAuthorisationGroupInvitations({
            authorisationGroupId: authorisationGroup.id,
            collaborationId: collaboration.id,
            invitationIds: option.value
        }).then(() => {
            this.refreshMembersAndInvitations(() => setFlash(I18n.t("authorisationGroup.flash.addedInvitation", {
                member: option.label,
                name: authorisationGroupName
            })));
        });
    };

    removeInvitation = invitation => () => {
        const {collaboration, authorisationGroup} = this.state;
        deleteAuthorisationGroupInvitations(authorisationGroup.id, invitation.id, collaboration.id).then(() => {
            this.refreshMembersAndInvitations(() => setFlash(I18n.t("authorisationGroup.flash.deletedInvitation", {
                invitation: invitation.invitee_email,
                name: authorisationGroup.name
            })));
        });
    };

    sortServicesTable = (services, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedServices = sortObjects(services, name, reversed);
        this.setState({sortedServices: sortedServices, sortedServicesBy: name, reverseServices: reversed});
    };

    sortMembersTable = (members, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedMembers = sortObjects(members, name, reversed);
        this.setState({sortedMembers: sortedMembers, sortedMembersBy: name, reverseMembers: reversed});
    };

    sortInvitationsTable = (invitations, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedInvitations = sortObjects(invitations, name, reversed);
        this.setState({sortedInvitations: sortedInvitations, sortedInvitationsBy: name, reverseInvitations: reversed});
    };

    dialogChildren = userServiceProfilesPreFlight => {
        if (isEmpty(userServiceProfilesPreFlight)) {
            return null;
        }
        return (
            <section className="user-service-profiles-pre-flight">
                <p>{I18n.t("authorisationGroup.removeServiceConfirmationDetails")}</p>
                {userServiceProfilesPreFlight.map(userServiceProfile =>
                    <ul className="user-service-profile" key={userServiceProfile.id}>
                        <li>
                            <span>{I18n.t("authorisationGroup.user", {name: userServiceProfile.user.name})}</span>
                        </li>
                        <li className="attributes">
                            <span>{I18n.t("authorisationGroup.attributes")}</span>
                            <span>{": "}</span>
                            <span>{
                                userServiceProfileAttributes
                                    .filter(attr => !isEmpty(userServiceProfile[attr]))
                                    .map(attr => I18n.t(`userServiceProfile.${attr}`).toLowerCase())
                                    .join(", ")
                            }</span>
                        </li>
                    </ul>)}
            </section>
        );
    };

    renderConnectedMembers = (adminOfCollaboration, authorisationGroupName, connectedMembers, sorted, reverse,
                              autoProvisionMembers) => {
        const names = ["actions", "user__name", "user__email", "user__uid", "role", "created_at"];
        if (!adminOfCollaboration) {
            names.shift();
        }

        const membersTitle = I18n.t("authorisationGroup.membersTitle", {name: authorisationGroupName});
        return (
            <div className="authorisation-members-connected">
                <p className="title">{membersTitle}</p>
                {adminOfCollaboration &&
                <em className="warning">{I18n.t("authorisationGroup.deleteMemberWarning")}</em>}
                <table className="connected-members">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortMembersTable(connectedMembers, name, sorted, reverse)}>
                                {I18n.t(`authorisationGroup.member.${name}`)}
                                {name !== "actions" && headerIcon(name, sorted, reverse)}
                                {name === "actions" &&
                                <span data-tip data-for="member-delete">
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id="member-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("authorisationGroup.deleteMemberTooltip", {name: authorisationGroupName})}}/>
                                </ReactTooltip>
                            </span>}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {connectedMembers.map((member, i) => {
                        const role = {value: member.role, label: I18n.t(`profile.${member.role}`)};
                        return (
                            <tr key={i}>
                                {adminOfCollaboration &&
                                <td className={`actions ${autoProvisionMembers ? "disabled" : ""}`}>
                                    <FontAwesomeIcon icon="trash"
                                                     onClick={autoProvisionMembers ? () => true : this.removeMember(member)}/>
                                </td>
                                }
                                <td className="name">{member.user.name}</td>
                                <td className="email">{member.user.email}</td>
                                <td className="uid">{member.user.uid}</td>
                                <td className="role">
                                    <Select
                                        classNamePrefix="select-disabled"
                                        value={role}
                                        options={[role]}
                                        isDisabled={true}/></td>
                                <td className="since">{moment(member.created_at * 1000).format("LL")}</td>
                            </tr>)
                    })}
                    </tbody>
                </table>
            </div>
        );
    };

    renderAuthorisationGroupInvitations = (adminOfCollaboration, authorisationGroupName, sortedInvitations,
                                           sortedInvitationsBy, reverseInvitations, autoProvisionMembers) => {
        const names = ["actions", "invitee_email", "intended_role", "expiry_date"];
        if (!adminOfCollaboration) {
            names.shift();
        }
        const invitationsTitle = I18n.t("authorisationGroup.invitationsTitle", {name: authorisationGroupName});
        return (
            <div className="authorisation-invitations-connected">
                <p className="title">{invitationsTitle}</p>
                <table className="connected-invitations">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortInvitationsTable(sortedInvitations, name, sortedInvitationsBy, reverseInvitations)}>
                                {I18n.t(`authorisationGroup.invitation.${name}`)}
                                {name !== "actions" && headerIcon(name, sortedInvitationsBy, reverseInvitations)}
                                {name === "actions" &&
                                <span data-tip data-for="invitation-delete">
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id="invitation-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("authorisationGroup.deleteInvitationTooltip", {name: authorisationGroupName})}}/>
                                </ReactTooltip>
                            </span>}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {sortedInvitations.map((invitation, i) => {
                        const role = {
                            value: invitation.intended_role,
                            label: I18n.t(`profile.${invitation.intended_role}`)
                        };
                        return (
                            <tr key={i}>
                                {adminOfCollaboration &&
                                <td className={`actions ${autoProvisionMembers ? "disabled" : ""}`}>
                                    <FontAwesomeIcon icon="trash"
                                                     onClick={autoProvisionMembers ? () => true : this.removeInvitation(invitation)}/>
                                </td>
                                }
                                <td className="name">{invitation.invitee_email}</td>
                                <td className="role">
                                    <Select
                                        classNamePrefix="select-disabled"
                                        value={role}
                                        options={[role]}
                                        isDisabled={true}/></td>
                                <td className="since">{moment(invitation.expiry_date * 1000).format("LL")}</td>
                            </tr>)
                    })}
                    </tbody>
                </table>
            </div>
        );
    };

    renderConnectedServices = (adminOfCollaboration, authorisationGroupName, connectedServices, sorted, reverse) => {
        const names = ["actions", "name", "entity_id", "description"];
        if (!adminOfCollaboration) {
            names.shift();
        }
        return (<div className="authorisation-services-connected">
                <p className="title">{I18n.t("authorisationGroup.connectedServices", {name: authorisationGroupName})}</p>
                {adminOfCollaboration &&
                <em className="warning">{I18n.t("authorisationGroup.deleteServiceWarning")}</em>}
                <table className="connected-services">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortServicesTable(connectedServices, name, sorted, reverse)}>
                                {I18n.t(`authorisationGroup.service.${name}`)}
                                {name !== "actions" && headerIcon(name, sorted, reverse)}
                                {name === "actions" &&
                                <span data-tip data-for="service-delete">
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id="service-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("authorisationGroup.deleteServiceTooltip", {name: authorisationGroupName})}}/>
                                </ReactTooltip>
                            </span>}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {connectedServices.map(service => <tr key={service.id}>
                        {adminOfCollaboration && <td className="actions">
                            <FontAwesomeIcon icon="trash" onClick={this.removeService(service)}/>
                        </td>}
                        <td className="name">{service.name}</td>
                        <td className="entity_id">{service.entity_id}</td>
                        <td className="description">{service.description}</td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        );
    };

    authorisationMembers = (adminOfCollaboration, authorisationGroupName,
                            allMembers, sortedMembers, sortedMembersBy, reverseMembers, sortedInvitations, sortedInvitationsBy, reverseInvitations,
                            autoProvisionMembers) => {
        const availableMembers = allMembers
            .filter(member => member.isMember && !sortedMembers.find(s => s.id === member.value));
        const availableInvitations = allMembers
            .filter(invitation => !invitation.isMember && !sortedInvitations.find(s => s.id === invitation.value));
        const availableOptions = availableMembers.concat(availableInvitations);
        const allMembersAreAdded = (sortedMembers.length + sortedInvitations.length) === allMembers.length;
        return (
            <div className={`authorisation-members ${adminOfCollaboration ? "" : "no-admin"}`}>
                {adminOfCollaboration && <Select className="services-select"
                                                 placeholder={I18n.t("authorisationGroup.searchMembers", {name: authorisationGroupName})}
                                                 onChange={option => option.isMember ? this.addMember(option) : this.addInvitation(option)}
                                                 options={availableOptions}
                                                 value={null}
                                                 isSearchable={true}
                                                 isClearable={true}/>
                }
                <CheckBox className="checkbox add-all-members"
                          name="allMembersAreAdded"
                          value={allMembersAreAdded}
                          readOnly={!adminOfCollaboration || allMembersAreAdded}
                          onChange={this.addAllMembers}
                          info={I18n.t("authorisationGroup.addAllMembers")}
                />
                {this.renderConnectedMembers(adminOfCollaboration, authorisationGroupName, sortedMembers,
                    sortedMembersBy, reverseMembers, autoProvisionMembers)}
                {this.renderAuthorisationGroupInvitations(adminOfCollaboration, authorisationGroupName,
                    sortedInvitations, sortedInvitationsBy, reverseInvitations, autoProvisionMembers)}
            </div>
        );


    };

    authorisationServices = (adminOfCollaboration, authorisationGroupName, allServices, sortedServices, sortedServicesBy, reverseServices) => {
        const availableServices = allServices.filter(service => !sortedServices.find(s => s.id === service.value));
        const allServicesAreAdded = sortedServices.length === allServices.length;
        return (
            <div className={`authorisation-services ${adminOfCollaboration ? "" : "no-admin"}`}>
                {adminOfCollaboration && <Select className="services-select"
                                                 placeholder={I18n.t("authorisationGroup.searchServices", {name: authorisationGroupName})}
                                                 onChange={this.addService}
                                                 options={availableServices}
                                                 value={null}
                                                 isSearchable={true}
                                                 isClearable={true}/>
                }
                <CheckBox className="checkbox add-all-servies"
                          name="allServicesAreAdded"
                          value={allServicesAreAdded}
                          readOnly={!adminOfCollaboration || allServicesAreAdded}
                          onChange={this.addAllServices}
                          info={I18n.t("authorisationGroup.addAllServices")}
                />

                {this.renderConnectedServices(adminOfCollaboration, authorisationGroupName, sortedServices, sortedServicesBy, reverseServices)}
            </div>);
    };


    authorisationGroupDetails = (adminOfCollaboration, name, short_name, auto_provision_members, alreadyExists, initial, description,
                                 uri, status, isNew, disabledSubmit, authorisationGroup, collaboration) => {
        return (
            <div className="authorisation-group">
                <InputField value={name}
                            onChange={e => this.setState({
                                name: e.target.value,
                                alreadyExists: {...this.state.alreadyExists, name: false}
                            })}
                            placeholder={I18n.t("authorisationGroup.namePlaceholder")}
                            onBlur={this.validateAuthorisationGroupName}
                            name={I18n.t("authorisationGroup.name")}
                            disabled={!adminOfCollaboration}/>
                {alreadyExists.name && <span
                    className="error">{I18n.t("authorisationGroup.alreadyExists", {
                    attribute: I18n.t("authorisationGroup.name").toLowerCase(),
                    value: name
                })}</span>}
                {(!initial && isEmpty(name)) && <span
                    className="error">{I18n.t("authorisationGroup.required", {
                    attribute: I18n.t("authorisationGroup.name").toLowerCase()
                })}</span>}

                <InputField value={short_name}
                            name={I18n.t("authorisationGroup.shortName")}
                            placeholder={I18n.t("authorisationGroup.shortNamePlaceHolder")}
                            onBlur={this.validateAuthorisationGroupShortName}
                            onChange={e => this.setState({
                                short_name: e.target.value,
                                alreadyExists: {...this.state.alreadyExists, short_name: false}
                            })}
                            toolTip={I18n.t("authorisationGroup.shortNameTooltip")}
                            disabled={!adminOfCollaboration}/>
                {alreadyExists.short_name && <span
                    className="error">{I18n.t("authorisationGroup.alreadyExists", {
                    attribute: I18n.t("authorisationGroup.shortName").toLowerCase(),
                    value: short_name
                })}</span>}
                {(!initial && isEmpty(short_name)) && <span
                    className="error">{I18n.t("authorisationGroup.required", {
                    attribute: I18n.t("authorisationGroup.shortName").toLowerCase()
                })}</span>}


                <InputField value={`${collaboration.organisation.short_name}:${collaboration.short_name}:${short_name}`}
                            name={I18n.t("authorisationGroup.globalUrn")}
                            toolTip={I18n.t("authorisationGroup.globalUrnTooltip")}
                            copyClipBoard={true}
                            disabled={true}/>

                <InputField value={description}
                            name={I18n.t("authorisationGroup.description")}
                            placeholder={I18n.t("authorisationGroup.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            disabled={!adminOfCollaboration}/>

                <InputField value={uri}
                            name={I18n.t("authorisationGroup.uri")}
                            placeholder={I18n.t("authorisationGroup.uriPlaceholder")}
                            onChange={e => this.setState({uri: e.target.value})}
                            disabled={!adminOfCollaboration}/>

                <CheckBox name="auto_provision_members" value={auto_provision_members}
                          info={I18n.t("authorisationGroup.autoProvisionMembers")}
                          tooltip={I18n.t("authorisationGroup.autoProvisionMembersTooltip")}
                          onChange={e => this.setState({auto_provision_members: e.target.checked})}/>

                <SelectField value={this.statusOptions.find(option => status === option.value)}
                             options={this.statusOptions}
                             name={I18n.t("authorisationGroup.status")}
                             clearable={false}
                             placeholder={I18n.t("authorisationGroup.statusPlaceholder")}
                             onChange={selectedOption => this.setState({status: selectedOption ? selectedOption.value : null})}
                             disabled={!adminOfCollaboration}/>
                {(!isNew && !isEmpty(authorisationGroup)) &&
                <InputField value={moment(authorisationGroup.created_at * 1000).format("LLLL")}
                            disabled={true}
                            name={I18n.t("organisation.created")}/>}

                {(adminOfCollaboration && isNew) &&
                <section className="actions">
                    <Button disabled={disabledSubmit} txt={I18n.t("service.add")}
                            onClick={this.submit}/>
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                </section>}
                {(adminOfCollaboration && !isNew) &&
                <section className="actions">
                    <Button disabled={disabledSubmit} txt={I18n.t("authorisationGroup.update")}
                            onClick={this.submit}/>
                    <Button className="delete" txt={I18n.t("authorisationGroup.delete")}
                            onClick={this.delete}/>
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                </section>}

            </div>);
    };

    render() {
        const {
            alreadyExists, collaboration, initial, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
            confirmationDialogQuestion, name, uri, short_name, auto_provision_members, description, status,
            authorisationGroup, isNew, back, leavePage,
            allServices, sortedServices, sortedServicesBy, reverseServices,
            allMembers, sortedMembers, sortedMembersBy, reverseMembers,
            sortedInvitationsBy, reverseInvitations, sortedInvitations,
            adminOfCollaboration, userServiceProfilesPreFlight
        } = this.state;
        if (!collaboration) {
            return null;
        }
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;

        const disabledSubmit = !initial && !this.isValid();
        const title = adminOfCollaboration ? I18n.t("authorisationGroup.backToCollaborationAuthorisationGroups", {name: collaboration.name}) : I18n.t("home.backToHome");
        let detailsTitle;
        if (adminOfCollaboration) {
            detailsTitle = isNew ? I18n.t("authorisationGroup.titleNew") : I18n.t("authorisationGroup.titleUpdate", {name: authorisationGroup.name});
        } else {
            detailsTitle = I18n.t("authorisationGroup.titleReadOnly", {name: authorisationGroup.name});
        }
        const servicesTitle = I18n.t("authorisationGroup.servicesTitle", {name: authorisationGroup.name});
        const membersTitle = I18n.t("authorisationGroup.membersTitle", {name: authorisationGroupName});
        return (
            <div className="mod-authorisation-group">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={confirmationDialogQuestion}
                                    isWarning={!isEmpty(userServiceProfilesPreFlight)}
                                    children={this.dialogChildren(userServiceProfilesPreFlight)}/>
                <div className="title">
                    <a href={back} onClick={e => {
                        stopEvent(e);
                        this.props.history.push(back)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {title}
                    </a>
                    {!isNew && <p className="title">{servicesTitle}</p>}
                </div>
                {!isNew && this.authorisationServices(adminOfCollaboration, authorisationGroupName,
                    allServices, sortedServices, sortedServicesBy, reverseServices)}
                {!isNew && <div className="title">
                    <p className="title">{membersTitle}</p>
                </div>}
                {!isNew && this.authorisationMembers(adminOfCollaboration, authorisationGroupName,
                    allMembers, sortedMembers, sortedMembersBy, reverseMembers,
                    sortedInvitations, sortedInvitationsBy, reverseInvitations, authorisationGroup.auto_provision_members)}
                <div className="title">
                    <p className="title">{detailsTitle}</p>
                </div>
                {this.authorisationGroupDetails(adminOfCollaboration, name, short_name, auto_provision_members, alreadyExists, initial,
                    description, uri, status, isNew, disabledSubmit, authorisationGroup, collaboration)}
            </div>);
    }
    ;

}

export default AuthorisationGroup;
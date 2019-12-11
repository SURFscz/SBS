import React from "react";
import {
    addGroupInvitations,
    addGroupMembers,
    collaborationLiteById,
    collaborationServices,
    createGroup,
    deleteGroup,
    deleteGroupInvitations,
    deleteGroupMembers,
    groupById,
    groupNameExists,
    groupShortNameExists,
    updateGroup
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./Group.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty, sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {headerIcon} from "../forms/helpers";
import ReactTooltip from "react-tooltip";

import Select from "react-select";
import moment from "moment";
import CheckBox from "../components/CheckBox";
import {sanitizeShortName} from "../validations/regExps";

class Group extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaboration: undefined,
            collaboration_id: undefined,
            group: {},
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
            description: "",
            required: ["name", "short_name"],
            alreadyExists: {},
            initial: true,
            isNew: true,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            leavePage: true,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true
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
            const adminOfCollaboration = (!isEmpty(member) && member.role === "admin") || user.admin;
            if (params.id !== "new") {
                const collDetail = adminOfCollaboration ? collaborationServices : collaborationLiteById;
                Promise.all([collDetail(params.collaboration_id), groupById(params.id, params.collaboration_id)])
                    .then(res => {
                        const {
                            sortedMembersBy, reverseMembers,
                            sortedInvitationsBy, reverseInvitations
                        } = this.state;
                        const collaboration = res[0];
                        const group = res[1];
                        const allMembers = this.sortedCollaborationMembers(collaboration);
                        this.setState({
                            ...group,
                            collaboration: collaboration,
                            collaboration_id: collaboration.id,
                            group: group,
                            allMembers: allMembers,
                            sortedMembers: sortObjects(group.collaboration_memberships, sortedMembersBy, reverseMembers),
                            sortedInvitations: sortObjects(group.invitations, sortedInvitationsBy, reverseInvitations),
                            isNew: false,
                            adminOfCollaboration: adminOfCollaboration
                        })
                    });
            } else {
                collaborationServices(params.collaboration_id, true)
                    .then(collaboration => {
                        const allMembers = this.sortedCollaborationMembers(collaboration);
                        this.setState({
                            collaboration: collaboration,
                            collaboration_id: collaboration.id,
                            allMembers: allMembers,
                            adminOfCollaboration: adminOfCollaboration
                        })
                    });
            }
        } else {
            this.props.history.push("/404");
        }
    };

    refreshMembersAndInvitations = callBack => {
        const params = this.props.match.params;
        groupById(params.id, params.collaboration_id)
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
                label: `${invitation.invitee_email} - ${I18n.t("groups.pendingInvite")}`,
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

    validateGroupName = e => {
        const {isNew, collaboration, group} = this.state;
        groupNameExists(e.target.value, collaboration.id, isNew ? null : group.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });
    };

    validateGroupShortName = e => {
        const {isNew, collaboration, group} = this.state;
        groupShortNameExists(e.target.value, collaboration.id, isNew ? null : group.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });
    };


    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoGroups = () => {
        this.setState({confirmationDialogOpen: false},
            () => this.props.history.goBack());
    };

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoGroups,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: I18n.t("groups.deleteConfirmation", {name: this.state.group.name}),
            leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const {group} = this.state;
        deleteGroup(group.id).then(() => {
            this.props.history.goBack();
            setFlash(I18n.t("groups.flash.deleted", {name: group.name}));
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
                createGroup(this.state).then(() => {
                    this.gotoGroups();
                    setFlash(I18n.t("groups.flash.created", {name: name}));
                });
            } else {
                updateGroup(this.state).then(() => {
                    this.gotoGroups();
                    setFlash(I18n.t("groups.flash.updated", {name: name}));
                });
            }
        }
    };

    addMemberOrInvitation = option => {
        if (option) {
            option.isMember ? this.addMember(option) : this.addInvitation(option);
        }
    };

    addMember = option => {
        const {collaboration, group, name} = this.state;
        const groupName = isEmpty(group) ? name : group.name;
        addGroupMembers({
            groupId: group.id,
            collaborationId: collaboration.id,
            memberIds: option.value
        }).then(() => {
            this.refreshMembersAndInvitations(() => setFlash(I18n.t("groups.flash.addedMember", {
                member: option.label,
                name: groupName
            })));
        });
    };

    addAllMembers = () => {
        const {collaboration, group, name, allMembers, sortedMembers, sortedInvitations} = this.state;
        const promises = [];
        const availableMembers = allMembers
            .filter(member => member.isMember && !sortedMembers.find(s => s.id === member.value))
            .map(member => member.value);
        const availableInvitations = allMembers
            .filter(invitation => !invitation.isMember && !sortedInvitations.find(s => s.id === invitation.value))
            .map(invitation => invitation.value);
        const groupName = isEmpty(group) ? name : group.name;
        if (availableMembers.length > 0) {
            promises.push(addGroupMembers({
                groupId: group.id,
                collaborationId: collaboration.id,
                memberIds: availableMembers
            }));
        }
        if (availableInvitations.length > 0) {
            promises.push(addGroupInvitations({
                groupId: group.id,
                collaborationId: collaboration.id,
                invitationIds: availableInvitations
            }));
        }
        if (promises.length > 0) {
            Promise.all(promises).then(() => {
                this.refreshMembersAndInvitations(() => setFlash(I18n.t("groups.flash.addedMembers", {
                    name: groupName
                })));
            });
        }
    };

    removeMember = member => () => {
        this.closeConfirmationDialog();
        this.doRemoveMember(member)();
    };

    doRemoveMember = member => () => {
        this.closeConfirmationDialog();
        const {collaboration, group} = this.state;
        deleteGroupMembers(group.id, member.id, collaboration.id).then(() => {
            this.refreshMembersAndInvitations(() => setFlash(I18n.t("groups.flash.deletedMember", {
                member: member.user.name,
                name: group.name
            })));
        });
    };

    addInvitation = option => {
        const {collaboration, group, name} = this.state;
        const groupName = isEmpty(group) ? name : group.name;
        addGroupInvitations({
            groupId: group.id,
            collaborationId: collaboration.id,
            invitationIds: option.value
        }).then(() => {
            this.refreshMembersAndInvitations(() => setFlash(I18n.t("groups.flash.addedInvitation", {
                member: option.label,
                name: groupName
            })));
        });
    };

    removeInvitation = invitation => () => {
        const {collaboration, group} = this.state;
        deleteGroupInvitations(group.id, invitation.id, collaboration.id).then(() => {
            this.refreshMembersAndInvitations(() => setFlash(I18n.t("groups.flash.deletedInvitation", {
                invitation: invitation.invitee_email,
                name: group.name
            })));
        });
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

    renderConnectedMembers = (adminOfCollaboration, groupName, connectedMembers, sorted, reverse,
                              autoProvisionMembers) => {
        const names = ["actions", "user__name", "user__email", "user__uid", "role", "created_at"];
        if (!adminOfCollaboration) {
            names.shift();
        }

        const membersTitle = I18n.t("groups.membersTitle", {name: groupName});
        return (
            <div className="group-members-connected">
                <p className="title">{membersTitle}</p>
                <table className="connected-members">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortMembersTable(connectedMembers, name, sorted, reverse)}>
                                {I18n.t(`groups.member.${name}`)}
                                {name !== "actions" && headerIcon(name, sorted, reverse)}
                                {name === "actions" &&
                                <span data-tip data-for="member-delete">
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id="member-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{
                                        __html: I18n.t("groups.deleteMemberTooltip",
                                            {name: encodeURIComponent(groupName)})
                                    }}/>
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

    renderGroupInvitations = (adminOfCollaboration, groupName, sortedInvitations,
                              sortedInvitationsBy, reverseInvitations, autoProvisionMembers) => {
        const names = ["actions", "invitee_email", "intended_role", "expiry_date"];
        if (!adminOfCollaboration) {
            names.shift();
        }
        const invitationsTitle = I18n.t("groups.invitationsTitle", {name: groupName});
        return (
            <div className="group-invitations-connected">
                <p className="title">{invitationsTitle}</p>
                <table className="connected-invitations">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortInvitationsTable(sortedInvitations, name, sortedInvitationsBy, reverseInvitations)}>
                                {I18n.t(`groups.invitation.${name}`)}
                                {name !== "actions" && headerIcon(name, sortedInvitationsBy, reverseInvitations)}
                                {name === "actions" &&
                                <span data-tip data-for="invitation-delete">
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id="invitation-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{
                                        __html: I18n.t("groups.deleteInvitationTooltip",
                                            {name: encodeURIComponent(groupName)})
                                    }}/>
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

    groupMembers = (adminOfCollaboration, groupName,
                    allMembers, sortedMembers, sortedMembersBy, reverseMembers, sortedInvitations, sortedInvitationsBy, reverseInvitations,
                    autoProvisionMembers) => {
        const availableMembers = allMembers
            .filter(member => member.isMember && !sortedMembers.find(s => s.id === member.value));
        const availableInvitations = allMembers
            .filter(invitation => !invitation.isMember && !sortedInvitations.find(s => s.id === invitation.value));
        const availableOptions = availableMembers.concat(availableInvitations);
        const allMembersAreAdded = (sortedMembers.length + sortedInvitations.length) === allMembers.length;
        return (
            <div className={`group-members ${adminOfCollaboration ? "" : "no-admin"}`}>
                {adminOfCollaboration && <Select className="services-select"
                                                 placeholder={I18n.t("groups.searchMembers", {name: groupName})}
                                                 onChange={this.addMemberOrInvitation}
                                                 options={availableOptions}
                                                 value={null}
                                                 isSearchable={true}
                                                 isClearable={true}/>
                }
                {adminOfCollaboration && <CheckBox className="checkbox add-all-members"
                          name="allMembersAreAdded"
                          value={allMembersAreAdded}
                          readOnly={allMembersAreAdded}
                          onChange={this.addAllMembers}
                          info={I18n.t("groups.addAllMembers")}
                />}
                {this.renderConnectedMembers(adminOfCollaboration, groupName, sortedMembers,
                    sortedMembersBy, reverseMembers, autoProvisionMembers)}
                {this.renderGroupInvitations(adminOfCollaboration, groupName,
                    sortedInvitations, sortedInvitationsBy, reverseInvitations, autoProvisionMembers)}
            </div>
        );


    };

    groupDetails = (adminOfCollaboration, name, short_name, auto_provision_members, alreadyExists, initial, description,
                    isNew, disabledSubmit, group, collaboration) => {
        return (
            <div className="group">
                <InputField value={name}
                            onChange={e => this.setState({
                                name: e.target.value,
                                alreadyExists: {...this.state.alreadyExists, name: false}
                            })}
                            placeholder={I18n.t("groups.namePlaceholder")}
                            onBlur={this.validateGroupName}
                            name={I18n.t("groups.name")}
                            disabled={!adminOfCollaboration}/>
                {alreadyExists.name && <span
                    className="error">{I18n.t("groups.alreadyExists", {
                    attribute: I18n.t("groups.name").toLowerCase(),
                    value: name
                })}</span>}
                {(!initial && isEmpty(name)) && <span
                    className="error">{I18n.t("groups.required", {
                    attribute: I18n.t("groups.name").toLowerCase()
                })}</span>}

                <InputField value={short_name}
                            name={I18n.t("groups.short_name")}
                            placeholder={I18n.t("groups.shortNamePlaceHolder")}
                            onBlur={this.validateGroupShortName}
                            onChange={e => this.setState({
                                short_name: sanitizeShortName(e.target.value),
                                alreadyExists: {...this.state.alreadyExists, short_name: false}
                            })}
                            toolTip={I18n.t("groups.shortNameTooltip")}
                            disabled={!adminOfCollaboration}/>
                {alreadyExists.short_name && <span
                    className="error">{I18n.t("groups.alreadyExists", {
                    attribute: I18n.t("groups.shortName").toLowerCase(),
                    value: short_name
                })}</span>}
                {(!initial && isEmpty(short_name)) && <span
                    className="error">{I18n.t("groups.required", {
                    attribute: I18n.t("groups.shortName").toLowerCase()
                })}</span>}


                <InputField value={`${collaboration.organisation.short_name}:${collaboration.short_name}:${short_name}`}
                            name={I18n.t("groups.global_urn")}
                            toolTip={I18n.t("groups.globalUrnTooltip")}
                            copyClipBoard={true}
                            disabled={true}/>

                <InputField value={description}
                            name={I18n.t("groups.description")}
                            placeholder={I18n.t("groups.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            disabled={!adminOfCollaboration}/>

                <CheckBox name="auto_provision_members" value={auto_provision_members}
                          info={I18n.t("groups.autoProvisionMembers")}
                          tooltip={I18n.t("groups.autoProvisionMembersTooltip")}
                          onChange={e => this.setState({auto_provision_members: e.target.checked})}
                          readOnly={!adminOfCollaboration}/>

                {(!isNew && !isEmpty(group)) &&
                <InputField value={moment(group.created_at * 1000).format("LLLL")}
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
                    <Button disabled={disabledSubmit} txt={I18n.t("groups.update")}
                            onClick={this.submit}/>
                    <Button className="delete" txt={I18n.t("groups.delete")}
                            onClick={this.delete}/>
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                </section>}

            </div>);
    };

    render() {
        const {
            alreadyExists, collaboration, initial, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
            confirmationDialogQuestion, name, short_name, auto_provision_members, description,
            group, isNew, leavePage,
            allMembers, sortedMembers, sortedMembersBy, reverseMembers,
            sortedInvitationsBy, reverseInvitations, sortedInvitations,
            adminOfCollaboration
        } = this.state;
        if (!collaboration) {
            return null;
        }
        const groupName = isEmpty(group) ? name : group.name;

        const disabledSubmit = !initial && !this.isValid();
        let detailsTitle;
        if (adminOfCollaboration) {
            detailsTitle = isNew ? I18n.t("groups.titleNew") : I18n.t("groups.titleUpdate", {name: group.name});
        } else {
            detailsTitle = I18n.t("groups.titleReadOnly", {name: group.name});
        }
        const membersTitle = I18n.t("groups.membersTitle", {name: groupName});
        return (
            <div className="mod-group">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={confirmationDialogQuestion}/>
                <div className="title">
                    <a href="/back" onClick={e => {
                        stopEvent(e);
                        this.props.history.goBack();
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("forms.back")}
                    </a>
                    {!isNew && <p className="title">{membersTitle}</p>}
                </div>
                {!isNew && this.groupMembers(adminOfCollaboration, groupName,
                    allMembers, sortedMembers, sortedMembersBy, reverseMembers,
                    sortedInvitations, sortedInvitationsBy, reverseInvitations, group.auto_provision_members)}
                <div className="title">
                    <p className="title">{detailsTitle}</p>
                </div>
                {this.groupDetails(adminOfCollaboration, name, short_name, auto_provision_members, alreadyExists, initial,
                    description, isNew, disabledSubmit, group, collaboration)}
            </div>);
    }
    ;

}

export default Group;
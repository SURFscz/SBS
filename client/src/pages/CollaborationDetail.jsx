import React from "react";
import {
    auditLogsInfo,
    collaborationAccessAllowed,
    collaborationById,
    collaborationLiteById,
    collaborationNameExists,
    collaborationShortNameExists,
    deleteCollaboration,
    deleteCollaborationMembership,
    updateCollaboration,
    updateCollaborationMembershipRole
} from "../api";
import "./CollaborationDetail.scss";
import {isEmpty, sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import moment from "moment";
import ConfirmationDialog from "../components/ConfirmationDialog";
import InputField from "../components/InputField";
import {collaborationAccessTypes, collaborationRoles} from "../forms/constants";
import Button from "../components/Button";
import {setFlash} from "../utils/Flash";
import Select from "react-select";
import {headerIcon} from "../forms/helpers";
import CheckBox from "../components/CheckBox";
import {sanitizeShortName} from "../validations/regExps";
import Tabs from "../components/Tabs";
import History from "../components/History";
import BackLink from "../components/BackLink";
import EmailMembers from "../components/EmailMembers";


class CollaborationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.accessTypeOptions = collaborationAccessTypes.map(type => ({
            value: type,
            label: I18n.t(`accessTypes.${type}`)
        }));
        this.roleOptions = collaborationRoles.map(role => ({
            value: role,
            label: I18n.t(`profile.${role}`)
        }));

        this.state = {
            originalCollaboration: null,
            name: "",
            short_name: "",
            description: "",
            accepted_user_policy: "",
            access_type: "",
            identifier: "",
            disable_join_requests: false,
            services_restricted: false,
            enrollment: "",
            members: [],
            filteredMembers: [],
            required: ["name", "short_name"],
            alreadyExists: {},
            initial: true,
            sorted: "user__name",
            reverse: false,
            query: "",
            adminOfCollaboration: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: I18n.t("collaborationDetail.deleteConfirmation"),
            leavePage: false,
            showMore: [],
            auditLogs: {"audit_logs": []}
        }
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            const collaboration_id = parseInt(params.id, 10);
            collaborationAccessAllowed(collaboration_id)
                .then(json => {
                    if (json.access === "full") {
                        collaborationById(collaboration_id)
                            .then(json => {
                                const {sorted, reverse} = this.state;
                                const members = sortObjects(json.collaboration_memberships, sorted, reverse);
                                this.setState({
                                    ...json,
                                    originalCollaboration: json,
                                    members: members,
                                    filteredMembers: members,
                                    adminOfCollaboration: true
                                }, () => this.fetchAuditLogs(collaboration_id))
                            });
                    } else {
                        collaborationLiteById(collaboration_id)
                            .then(json => {
                                this.setState({
                                    ...json,
                                    originalCollaboration: json,
                                    adminOfCollaboration: false
                                })
                            });
                    }
                }).catch(() => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    fetchAuditLogs = collaborationId => auditLogsInfo(collaborationId, "collaborations").then(json => this.setState({auditLogs: json}));

    update = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doUpdate)
        } else {
            this.doUpdate();
        }
    };

    doUpdate = () => {
        if (this.isValid()) {
            const {name, originalCollaboration} = this.state;
            updateCollaboration(this.state)
                .then(() => {
                    this.fetchAuditLogs(originalCollaboration.id);
                    window.scrollTo(0, 0);
                    setFlash(I18n.t("collaborationDetail.flash.updated", {name: name}));
                });
        }
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("collaborationDetail.deleteConfirmation"),
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        this.setState({confirmationDialogOpen: false});
        const {originalCollaboration} = this.state;
        deleteCollaboration(originalCollaboration.id)
            .then(() => {
                this.props.history.push("/collaborations");
                setFlash(I18n.t("collaborationDetail.flash.deleted", {name: originalCollaboration.name}));
                this.props.refreshUser();
            });
    };

    deleteMember = member => () => {
        const {user} = this.props;
        if (user.id === member.user.id) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t("collaborationDetail.deleteMemberConfirmation", {name: member.user.name}),
                confirmationDialogAction: this.doDeleteMember(member)
            });
        }
    };

    changeMemberRole = member => selectedOption => {
        const {originalCollaboration} = this.state;
        updateCollaborationMembershipRole(originalCollaboration.id, member.user.id, selectedOption.value)
            .then(() => {
                this.componentDidMount();
                window.scrollTo(0, 0);
                setFlash(I18n.t("collaborationDetail.flash.memberUpdated", {
                    name: member.user.name,
                    role: selectedOption.value
                }));
            });
    };

    doDeleteMember = member => () => {
        this.setState({confirmationDialogOpen: false});
        const {originalCollaboration} = this.state;
        deleteCollaborationMembership(originalCollaboration.id, member.user.id)
            .then(() => {
                this.componentDidMount();
                window.scrollTo(0, 0);
                setFlash(I18n.t("collaborationDetail.flash.memberDeleted", {name: member.user.name}));
            });
    };

    toggleShowMore = name => e => {
        stopEvent(e);
        const {showMore} = this.state;
        const newShowMore = showMore.includes(name) ? showMore.filter(item => item !== name) : showMore.concat([name]);
        this.setState({showMore: newShowMore});
    };

    validateCollaborationName = e =>
        collaborationNameExists(e.target.value, this.state.originalCollaboration.organisation_id,
            this.state.originalCollaboration.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateCollaborationShortName = e =>
        collaborationShortNameExists(e.target.value, this.state.originalCollaboration.organisation_id, this.state.originalCollaboration.short_name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    invite = e => {
        stopEvent(e);
        const {query} = this.state;
        const email = isEmpty(query) ? "" : `?email=${encodeURIComponent(query)}`;
        this.props.history.push(`/new-invite/${this.state.originalCollaboration.id}${(email)}`);
    };

    openJoinRequest = joinRequest => e => {
        stopEvent(e);
        this.props.history.push(`/join-requests/${joinRequest.hash}`);
    };

    openInvitation = invitation => e => {
        stopEvent(e);
        this.props.history.push(`/invitations/${invitation.id}`);
    };

    openGroupDetails = group => e => {
        stopEvent(e);
        const {originalCollaboration} = this.state;
        this.props.history.push(`/collaboration-group-details/${originalCollaboration.id}/${group.id}`);
    };

    openGroups = e => {
        stopEvent(e);
        const {originalCollaboration} = this.state;
        this.props.history.push(`/collaboration-groups/${originalCollaboration.id}`);
    };

    openServices = e => {
        stopEvent(e);
        const {originalCollaboration} = this.state;
        this.props.history.push(`/collaboration-services/${originalCollaboration.id}`);
    };

    openServiceDetails = (collaboration, service) => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    renderRequests = joinRequests => {
        const showMore = joinRequests.length >= 6;
        const showMoreItems = this.state.showMore.includes("joinRequests");
        return (
            <section className="info-block ">
                <div className="header join-requests">
                    <span className="type">{I18n.t("collaborations.requests")}</span>
                    <span className="counter">{joinRequests.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? joinRequests.slice(0, 5) : joinRequests)
                        .sort((r1, r2) => r1.user.name.localeCompare(r2.user.name))
                        .map((request, i) =>
                            <div className="join-request" key={i}>
                                <a href={`/join-requests/${request.hash}`} onClick={this.openJoinRequest(request)}>
                                    <FontAwesomeIcon icon={"arrow-right"}/>
                                    <span>{request.user.name}</span>
                                </a>
                            </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("joinRequests")}/>
                </section>}

            </section>
        );
    };

    renderGroups = collaboration => {
        const groupsFromMemberships = collaboration.collaboration_memberships.reduce((acc, collaboration_membership) => {
            return acc.concat(collaboration_membership.groups || []);
        }, []);
        const allGroups = (collaboration.groups || []).concat(groupsFromMemberships);
        const groupIds = [...new Set(allGroups.map(group => group.id))];
        const groups = allGroups.filter(group => groupIds.includes(group.id));
        const showMore = groups.length >= 6;
        const showMoreItems = this.state.showMore.includes("groups");

        return (
            <section className="info-block ">
                <div className="header groups link" onClick={this.openGroups}>
                    <span className="type">{I18n.t("collaborations.groups")}</span>
                    <span className="counter">{groups.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? groups.slice(0, 5) : groups)
                        .sort((a1, a2) => a1.name.localeCompare(a2.name))
                        .map((group, i) =>
                            <div className="collaboration-groups" key={i}>
                                <a href={`/groups/${group.id}`}
                                   onClick={this.openGroupDetails(group)}>
                                    <FontAwesomeIcon icon={"arrow-right"}/>
                                    <span>{group.name}</span>
                                </a>
                            </div>)}
                </div>
                <section className="show-more">
                    {showMore && <Button className="white"
                                         txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                                         onClick={this.toggleShowMore("groups")}/>}
                    <Button className="white"
                            txt={I18n.t("forms.manage")}
                            onClick={this.openGroups}/>
                </section>
            </section>
        );
    };

    renderInvitations = invitations => {
        const showMore = invitations.length >= 6;
        const showMoreItems = this.state.showMore.includes("invitations");
        return (
            <section className="info-block ">
                <div className="header invitations">
                    <span className="type">{I18n.t("collaborations.invitations")}</span>
                    <span className="counter">{invitations.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? invitations.slice(0, 5) : invitations)
                        .sort((i1, i2) => i1.invitee_email.localeCompare(i2.invitee_email))
                        .map((invitation, i) =>
                            <div className="invitation" key={i}>
                                <a href={`/invitations/${invitation.id}`} onClick={this.openInvitation(invitation)}>
                                    <FontAwesomeIcon icon={"arrow-right"}/>
                                    <span>{invitation.invitee_email}</span>
                                </a>
                            </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("invitations")}/>
                </section>}
            </section>
        );
    };

    renderServices = collaboration => {
        const services = collaboration.services;
        const showMore = services.length >= 6;
        const showMoreItems = this.state.showMore.includes("services");
        return (
            <section className="info-block ">
                <div className="header services link" onClick={this.openServices}>
                    <span className="type">{I18n.t("collaborations.services")}</span>
                    <span className="counter">{services.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? services.slice(0, 5) : services)
                        .sort((s1, s2) => s1.name.localeCompare(s2.name))
                        .map((service, i) =>
                            <div className="collaboration-services" key={i}>
                                <a href={`/services/${service.id}`}
                                   onClick={this.openServiceDetails(collaboration, service)}>
                                    <FontAwesomeIcon icon={"arrow-right"}/>
                                    <span>{service.name}</span>
                                </a>
                            </div>)}
                </div>
                <section className="show-more">
                    {showMore && <Button className="white"
                                         txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                                         onClick={this.toggleShowMore("services")}/>}
                    <Button className="white"
                            txt={I18n.t("forms.manage")}
                            onClick={this.openServices}/>
                </section>

            </section>
        );
    };

    searchMembers = e => {
        const query = e.target.value.toLowerCase();
        const {members, sorted, reverse} = this.state;
        const newMembers = members.filter(member => member.user.name.toLowerCase().indexOf(query) > -1 ||
            member.user.email.toLowerCase().indexOf(query) > -1 ||
            member.user.uid.toLowerCase().indexOf(query) > -1);
        const newSortedMembers = sortObjects(newMembers, sorted, reverse);
        this.setState({filteredMembers: newSortedMembers, query: query})
    };

    sortTable = (members, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedMembers = sortObjects(members, name, reversed);
        this.setState({filteredMembers: sortedMembers, sorted: name, reverse: reversed});
    };

    renderMemberTable = (members, user, sorted, reverse, adminOfCollaboration) => {
        const names = ["user__name", "user__email", "user__uid", "role", "created_at", "actions"];
        const numberOfAdmins = members.filter(member => member.role === "admin").length;
        return (
            <table className="members">
                <thead>
                <tr>
                    {names.map(name =>
                        <th key={name} className={name}
                            onClick={this.sortTable(members, name, sorted, reverse)}>
                            {I18n.t(`collaborationDetail.member.${name}`)}
                            {name !== "actions" && headerIcon(name, sorted, reverse)}
                        </th>
                    )}
                </tr>
                </thead>
                <tbody>
                {members.map((member, i) => <tr key={i}>
                    <td className="name">{member.user.name}</td>
                    <td className="email">{member.user.email}</td>
                    <td className="uid">{member.user.uid}</td>
                    <td className="role">
                        <Select
                            classNamePrefix="select-disabled"
                            value={this.roleOptions.find(option => option.value === member.role)}
                            options={this.roleOptions}
                            onChange={this.changeMemberRole(member)}
                            isDisabled={!adminOfCollaboration || (member.role === "admin" && numberOfAdmins < 2) || member.user.id === user.id}/>
                    </td>
                    <td className="since">{moment(member.created_at * 1000).format("LL")}</td>
                    <td className="actions">
                        {(adminOfCollaboration && (member.role === "member" || (member.role === "admin" && numberOfAdmins > 1 && member.user.id !== user.id))) &&
                        <FontAwesomeIcon icon="trash" onClick={this.deleteMember(member)}/>}
                    </td>
                </tr>)}
                </tbody>
            </table>
        );
    };


    renderMembers = (members, user, sorted, reverse, query, adminOfCollaboration) => {
        const isAdmin = user.admin || adminOfCollaboration;
        const adminClassName = isAdmin ? "with-button" : "";

        return (
            <section className="members-search">
                <div className="search">
                    <input type="text"
                           className={adminClassName}
                           onChange={this.searchMembers}
                           value={query}
                           placeholder={I18n.t("collaborationDetail.searchPlaceHolder")}/>
                    {<FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {isAdmin &&
                    <Button onClick={this.invite}
                            txt={I18n.t("collaborationDetail.invite")}/>
                    }
                </div>
                {this.renderMemberTable(members, user, sorted, reverse, adminOfCollaboration)}
            </section>

        );
    };

    collaborationDetails = (name, short_name, alreadyExists, initial, description, accepted_user_policy, enrollment,
                            access_type, identifier, organisation, isAdmin, disabledSubmit, originalCollaboration,
                            config, disable_join_requests, services_restricted) => {
        const joinRequestUrl = `${config.base_url}/registration?collaboration=${encodeURIComponent(originalCollaboration.name)}`;
        const {user} = this.props;
        const isPlatformAdmin = user.admin;

        return <div className="collaboration-detail">
            <InputField value={name} onChange={e => {
                this.setState({
                    name: e.target.value,
                    alreadyExists: {...this.state.alreadyExists, name: false}
                })
            }}
                        placeholder={I18n.t("collaboration.namePlaceHolder")}
                        onBlur={this.validateCollaborationName}
                        name={I18n.t("collaboration.name")}
                        disabled={!isAdmin}/>
            {alreadyExists.name && <span
                className="error">{I18n.t("collaboration.alreadyExists", {
                attribute: I18n.t("collaboration.name").toLowerCase(),
                value: name
            })}</span>}
            {(!initial && isEmpty(name)) && <span
                className="error">{I18n.t("collaboration.required", {
                attribute: I18n.t("collaboration.name").toLowerCase()
            })}</span>}

            <InputField value={short_name}
                        name={I18n.t("collaboration.shortName")}
                        placeholder={I18n.t("collaboration.shortNamePlaceHolder")}
                        onBlur={this.validateCollaborationShortName}
                        onChange={e => this.setState({
                            short_name: sanitizeShortName(e.target.value),
                            alreadyExists: {...this.state.alreadyExists, short_name: false}
                        })}
                        toolTip={I18n.t("collaboration.shortNameTooltip")}
                        disabled={!isAdmin}/>
            {alreadyExists.short_name && <span
                className="error">{I18n.t("collaboration.alreadyExists", {
                attribute: I18n.t("collaboration.shortName").toLowerCase(),
                value: short_name
            })}</span>}
            {(!initial && isEmpty(short_name)) && <span
                className="error">{I18n.t("collaboration.required", {
                attribute: I18n.t("collaboration.shortName").toLowerCase()
            })}</span>}

            <InputField value={`${organisation.short_name}:${short_name}`}
                        name={I18n.t("collaboration.globalUrn")}
                        copyClipBoard={true}
                        toolTip={I18n.t("collaboration.globalUrnTooltip")}
                        disabled={true}/>

            {isAdmin && <InputField value={disable_join_requests ? "N/A" : joinRequestUrl}
                                    name={I18n.t("collaboration.joinRequestUrl")}
                                    toolTip={I18n.t("collaboration.joinRequestUrlTooltip")}
                                    disabled={true}
                                    copyClipBoard={true}/>}

            <InputField value={description} onChange={e => this.setState({description: e.target.value})}
                        placeholder={I18n.t("collaboration.descriptionPlaceholder")}
                        name={I18n.t("collaboration.description")}
                        disabled={!isAdmin}/>

            <InputField value={accepted_user_policy}
                        onChange={e => this.setState({accepted_user_policy: e.target.value})}
                        placeholder={I18n.t("collaboration.acceptedUserPolicyPlaceholder")}
                        name={I18n.t("collaboration.accepted_user_policy")}
                        disabled={!isAdmin}/>

            <CheckBox name="disable_join_requests"
                      value={disable_join_requests}
                      info={I18n.t("collaboration.disableJoinRequests")}
                      tooltip={I18n.t("collaboration.disableJoinRequestsTooltip")}
                      onChange={() => this.setState({disable_join_requests: !disable_join_requests})}
                      readOnly={!isAdmin}/>

            <CheckBox name="services_restricted"
                      value={services_restricted}
                      info={I18n.t("collaboration.servicesRestricted")}
                      tooltip={I18n.t("collaboration.servicesRestrictedTooltip")}
                      onChange={() => this.setState({services_restricted: !services_restricted})}
                      readOnly={!isPlatformAdmin}/>

            {/*<InputField value={enrollment}*/}
            {/*            onChange={e => this.setState({enrollment: e.target.value})}*/}
            {/*            placeholder={I18n.t("collaboration.enrollmentPlaceholder")}*/}
            {/*            toolTip={I18n.t("collaboration.enrollmentTooltip")}*/}
            {/*            name={I18n.t("collaboration.enrollment")}*/}
            {/*            disabled={!isAdmin}/>*/}

            {/*<SelectField value={this.accessTypeOptions.find(option => option.value === access_type)}*/}
            {/*             options={this.accessTypeOptions}*/}
            {/*             name={I18n.t("collaboration.access_type")}*/}
            {/*             placeholder={I18n.t("collaboration.accessTypePlaceholder")}*/}
            {/*             onChange={selectedOption => this.setState({access_type: selectedOption ? selectedOption.value : null})}*/}
            {/*             disabled={!isAdmin}/>*/}

            <InputField value={identifier}
                        name={I18n.t("collaboration.identifier")}
                        toolTip={I18n.t("collaboration.identifierTooltip")}
                        disabled={true}
                        copyClipBoard={true}/>

            <InputField value={moment(originalCollaboration.created_at * 1000).format("LLLL")}
                        disabled={true}
                        name={I18n.t("organisation.created")}/>

            <InputField value={organisation.label}
                        name={I18n.t("collaboration.organisation_name")}
                        toolTip={I18n.t("collaboration.organisationTooltip")}
                        link={isAdmin ? `/organisations-lite/${organisation.value}` : null}
                        history={this.props.history}
                        disabled={true}
            />
            {isAdmin &&
            <section className="actions">
                <Button className="delete" txt={I18n.t("collaborationDetail.delete")}
                        onClick={this.delete}/>
                <Button disabled={disabledSubmit} txt={I18n.t("collaborationDetail.update")}
                        onClick={this.update}/>
            </section>}
        </div>;
    };

    renderDetails = (isAdmin, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion,
                     leavePage, originalCollaboration, filteredMembers, user, sorted, reverse, query, adminOfCollaboration,
                     name, short_name, alreadyExists, initial, description, accepted_user_policy, enrollment, access_type,
                     identifier, organisation, disabledSubmit, config, disable_join_requests, services_restricted) => (
        <div>
            {isAdmin && <section>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}
                                    leavePage={leavePage}/>
                <p className="title info-blocks">{I18n.t("collaborationDetail.infoBlocks", {name: originalCollaboration.name})}</p>
                <section className="info-block-container">
                    {this.renderRequests(originalCollaboration.join_requests)}
                    {this.renderInvitations(originalCollaboration.invitations)}
                    {this.renderServices(originalCollaboration)}
                    {this.renderGroups(originalCollaboration)}
                </section>
                <EmailMembers allowEmailLink={true}
                              members={this.state.members}
                              title={I18n.t("collaborationDetail.members", {name: originalCollaboration.name})}/>
                {this.renderMembers(filteredMembers, user, sorted, reverse, query, adminOfCollaboration)}
            </section>}
            <div className="title">
                <p className="title-header">{I18n.t("collaborationDetail.title", {name: originalCollaboration.name})}</p>
            </div>
            {this.collaborationDetails(name, short_name, alreadyExists, initial, description, accepted_user_policy,
                enrollment, access_type, identifier, organisation, isAdmin, disabledSubmit, originalCollaboration,
                config, disable_join_requests, services_restricted)}
        </div>);

    render() {
        const {
            originalCollaboration, name, short_name, description, accepted_user_policy, access_type, initial, alreadyExists,
            identifier, enrollment, filteredMembers, query, disable_join_requests, services_restricted,
            confirmationDialogOpen, confirmationDialogAction, confirmationQuestion, cancelDialogAction, leavePage, sorted, reverse,
            adminOfCollaboration, auditLogs
        } = this.state;
        if (!originalCollaboration) {
            return null;
        }
        const {user, config} = this.props;
        const isAdmin = user.admin || adminOfCollaboration;
        const disabledSubmit = !initial && !this.isValid();
        const organisation = {
            value: originalCollaboration.organisation.id,
            label: originalCollaboration.organisation.name,
            short_name: originalCollaboration.organisation.short_name
        };
        return (
            <div className="mod-collaboration-detail">
                <BackLink history={this.props.history}/>
                <Tabs className="white">
                    <div label="form">
                        {this.renderDetails(isAdmin, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
                            confirmationQuestion, leavePage, originalCollaboration, filteredMembers, user, sorted, reverse, query,
                            adminOfCollaboration, name, short_name, alreadyExists, initial, description, accepted_user_policy,
                            enrollment, access_type, identifier, organisation, disabledSubmit, config, disable_join_requests,
                            services_restricted)}
                    </div>
                    {isAdmin && <div label="history">
                        <History auditLogs={auditLogs} className="white"/>
                    </div>}
                </Tabs>
            </div>)
    }


}

export default CollaborationDetail;
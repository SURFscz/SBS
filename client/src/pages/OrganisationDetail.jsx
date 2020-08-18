import React from "react";
import ReactTooltip from "react-tooltip";
import {
    activateUserForOrganisation,
    auditLogsInfo,
    deleteApiKey,
    deleteCollaboration,
    deleteOrganisation,
    deleteOrganisationMembership,
    organisationById,
    organisationNameExists,
    organisationSchacHomeOrganisationExists,
    organisationShortNameExists,
    updateOrganisation,
    updateOrganisationMembershipRole
} from "../api";
import "./OrganisationDetail.scss";
import I18n from "i18n-js";
import ConfirmationDialog from "../components/ConfirmationDialog";
import InputField from "../components/InputField";
import {escapeHtmlTooltip, isEmpty, sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "../components/Button";
import moment from "moment";
import Select from 'react-select';
import {setFlash} from "../utils/Flash";
import {headerIcon} from "../forms/helpers";
import {sanitizeShortName} from "../validations/regExps";
import BackLink from "../components/BackLink";
import Tabs from "../components/Tabs";
import History from "../components/History";
import CheckBox from "../components/CheckBox";
import EmailMembers from "../components/EmailMembers";

class OrganisationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            originalOrganisation: null,
            name: "",
            short_name: "",
            identifier: "",
            description: "",
            schac_home_organisation: "",
            collaboration_creation_allowed: false,
            members: [],
            filteredMembers: [],
            invitations: [],
            apiKeys: [],
            required: ["name", "short_name"],
            alreadyExists: {},
            initial: true,
            sorted: "user__name",
            reverse: false,
            inviteSorted: "invitee_email",
            inviteReverse: false,
            collaborationRequests: [],
            collaborationRequestSorted: "name",
            collaborationRequestReverse: false,
            services: [],
            servicesSorted: "name",
            servicesReverse: false,
            query: "",
            collaborations: [],
            filteredCollaborations: [],
            sortedCollaborationAttribute: "name",
            reverseCollaborationSorted: false,
            collaborationsQuery: "",
            adminOfOrganisation: false,
            managerOfOrganisation: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: I18n.t("organisation.deleteConfirmation"),
            leavePage: false,
        }
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const {user} = this.props;
        if (params.id) {
            organisationById(params.id)
                .then(json => {
                    const {
                        sorted, reverse, inviteSorted, inviteReverse, sortedCollaborationAttribute,
                        reverseCollaborationSorted, collaborationRequestSorted, collaborationRequestReverse,
                        servicesSorted, servicesReverse
                    } = this.state;
                    const members = sortObjects(json.organisation_memberships, sorted, reverse);
                    const collaborations = sortObjects(json.collaborations, sortedCollaborationAttribute, reverseCollaborationSorted);
                    const services = sortObjects(json.services, servicesSorted, servicesReverse);
                    const member = (user.organisation_memberships || []).find(membership => membership.organisation_id === json.id);
                    if (isEmpty(member) && !user.admin) {
                        this.props.history.push("/404");
                        return;
                    }
                    const adminOfOrganisation = json.organisation_memberships
                        .some(member => member.role === "admin" && member.user_id === user.id) || user.admin;
                    const managerOfOrganisation = json.organisation_memberships.some(member => member.role === "manager" && member.user_id === user.id);
                    this.setState({
                        originalOrganisation: json,
                        name: json.name,
                        short_name: json.short_name,
                        identifier: json.identifier,
                        description: json.description,
                        schac_home_organisation: json.schac_home_organisation,
                        collaboration_creation_allowed: json.collaboration_creation_allowed,
                        members: members,
                        filteredMembers: members,
                        collaborations: collaborations,
                        services: services,
                        filteredCollaborations: collaborations,
                        invitations: sortObjects(json.organisation_invitations, inviteSorted, inviteReverse),
                        collaborationRequests: sortObjects(json.collaboration_requests, collaborationRequestSorted, collaborationRequestReverse),
                        adminOfOrganisation: adminOfOrganisation,
                        managerOfOrganisation: managerOfOrganisation,
                        apiKeys: json.api_keys
                    }, () => {
                        if ((member && member.role === "admin") || user.admin) {
                            this.fetchAuditLogs(json.id)
                        }
                    });
                })
                .catch(() => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    fetchAuditLogs = collaborationId => auditLogsInfo(collaborationId, "organisations")
        .then(json => this.setState({auditLogs: json}));

    update = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doUpdate)
        } else {
            this.doUpdate();
        }
    };

    doActivateMember = member => () => {
        this.setState({confirmationDialogOpen: false});
        const {originalOrganisation} = this.state;
        activateUserForOrganisation(originalOrganisation.id, member.user.id)
            .then(() => {
                this.componentDidMount();
                window.scrollTo(0, 0);
                setFlash(I18n.t("organisationDetail.flash.memberActivated", {name: member.user.name}));
            });
    };

    activateMember = member => () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisationDetail.activateMemberConfirmation", {name: member.user.name}),
            confirmationDialogAction: this.doActivateMember(member)
        });
    };

    deleteMember = member => () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisationDetail.deleteMemberConfirmation", {name: member.user.name}),
            confirmationDialogAction: this.doDeleteMember(member)
        });
    };

    changeMemberRole = member => selectedOption => {
        const {originalOrganisation} = this.state;
        updateOrganisationMembershipRole(originalOrganisation.id, member.user.id, selectedOption.value)
            .then(() => {
                this.componentDidMount();
                window.scrollTo(0, 0);
                setFlash(I18n.t("organisationDetail.flash.memberUpdated", {
                    name: member.user.name,
                    role: selectedOption.value
                }));
            });
    };


    doDeleteMember = member => () => {
        this.setState({confirmationDialogOpen: false});
        const {originalOrganisation} = this.state;
        deleteOrganisationMembership(originalOrganisation.id, member.user.id)
            .then(() => {
                this.componentDidMount();
                setFlash(I18n.t("organisationDetail.flash.memberDeleted", {name: member.user.name}));
            });
    };

    deleteCollaboration = collaboration => e => {
        e.cancelBubble = true;
        e.stopPropagation();
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisationDetail.deleteCollaborationConfirmation", {name: collaboration.name}),
            confirmationDialogAction: this.doDeleteCollaboration(collaboration)
        });
    };

    doDeleteCollaboration = collaboration => () => {
        this.setState({confirmationDialogOpen: false});
        deleteCollaboration(collaboration.id)
            .then(() => {
                this.componentDidMount();
                setFlash(I18n.t("organisationDetail.flash.collaborationDeleted", {name: collaboration.name}));
            });
    };

    deleteApiKey = apiKey => () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisationDetail.deleteApiKeyConfirmation"),
            confirmationDialogAction: this.doDeleteApiKey(apiKey)
        });
    };

    doDeleteApiKey = apiKey => () => {
        this.setState({confirmationDialogOpen: false});
        deleteApiKey(apiKey.id)
            .then(() => {
                this.componentDidMount();
                setFlash(I18n.t("organisationDetail.flash.apiKeyDeleted"));
            });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisation.deleteConfirmation"),
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        this.setState({confirmationDialogOpen: false});
        deleteOrganisation(this.state.originalOrganisation.id)
            .then(() => {
                this.props.history.push("/organisations");
                setFlash(I18n.t("organisationDetail.flash.deleted", {name: this.state.originalOrganisation.name}));
            });
    };

    doUpdate = () => {
        if (this.isValid()) {
            const {
                name, description, originalOrganisation, schac_home_organisation, collaboration_creation_allowed,
                short_name, identifier
            } = this.state;
            updateOrganisation({
                id: originalOrganisation.id, name, description, schac_home_organisation,
                collaboration_creation_allowed, short_name, identifier
            })
                .then(() => {
                    this.fetchAuditLogs(originalOrganisation.id);
                    window.scrollTo(0, 0);
                    setFlash(I18n.t("organisationDetail.flash.updated", {name: name}));
                });
        }
    };

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    invite = e => {
        stopEvent(e);
        const {query} = this.state;
        const email = isEmpty(query) ? "" : `?email=${encodeURIComponent(query)}`;
        this.props.history.push(`/new-organisation-invite/${this.state.originalOrganisation.id}${email}`);
    };

    newCollaboration = e => {
        stopEvent(e);
        const {originalOrganisation} = this.state;
        this.props.history.push(`/new-collaboration?organisation=${originalOrganisation.id}`);
    };

    addApiKey = e => {
        stopEvent(e);
        this.props.history.push(`/new-api-key/${this.state.originalOrganisation.id}`);
    };

    validateOrganisationName = e =>
        organisationNameExists(e.target.value, this.state.originalOrganisation.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateOrganisationShortName = e =>
        organisationShortNameExists(e.target.value, this.state.originalOrganisation.short_name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    validateOrganisationSchacHome = e =>
        organisationSchacHomeOrganisationExists(e.target.value, this.state.originalOrganisation.schac_home_organisation).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, schac_home_organisation: json}});
        });

    openInvitation = invitation => e => {
        stopEvent(e);
        this.props.history.push(`/organisation-invitations/${invitation.id}`);
    };

    openCollaborationRequest = cr => e => {
        stopEvent(e);
        this.props.history.push(`/collaboration-requests/${cr.id}`);
    };

    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    configureServices = e => {
        stopEvent(e);
        this.props.history.push(`/organisation-services/${this.state.originalOrganisation.id}`);
    };

    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    sortMembersTable = (members, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedMembers = sortObjects(members, name, reversed);
        this.setState({filteredMembers: sortedMembers, sorted: name, reverse: reversed});
    };

    sortInvitationsTable = (invitations, name, sorted, reverse) => () => {
        const reversed = (sorted === name ? !reverse : false);
        const sortedInvitations = sortObjects(invitations, name, reversed);
        this.setState({invitations: sortedInvitations, inviteSorted: name, inviteReverse: reversed});
    };

    sortCollaborationRequestsTable = (collaborationRequests, name, sorted, reverse) => () => {
        const reversed = (sorted === name ? !reverse : false);
        const sortedCollaborationRequests = sortObjects(collaborationRequests, name, reversed);
        this.setState({
            collaborationRequests: sortedCollaborationRequests,
            collaborationRequestSorted: name,
            collaborationRequestReverse: reversed
        });
    };

    sortServicesTable = (services, name, sorted, reverse) => () => {
        const reversed = (sorted === name ? !reverse : false);
        const sortedServices = sortObjects(services, name, reversed);
        this.setState({
            services: sortedServices,
            servicesSorted: name,
            servicesReverse: reversed
        });
    };

    sortCollaborationsTable = (collaborations, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedCollaborations = sortObjects(collaborations, name, reversed);
        this.setState({
            filteredCollaborations: sortedCollaborations,
            sortedCollaborationAttribute: name,
            reverseCollaborationSorted: reversed
        });
    };

    renderCollaborationRequests = (reverse, sorted, collaborationRequests) => {
        if (collaborationRequests.length === 0) {
            return <section className="invitations-container">
                <p>{I18n.t("organisationDetail.noCollaborationRequests")}</p>
            </section>
        }
        const names = ["actions", "name", "short_name", "requester__name", "message"];
        return (
            <section className="collaboration-requests-container">
                <table className="collaboration-requests">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortCollaborationRequestsTable(collaborationRequests, name, sorted, reverse)}>
                                {I18n.t(`organisationDetail.collaborationRequest.${name}`)}
                                {headerIcon(name, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {collaborationRequests.map((cr) =>
                        <tr key={cr.id} onClick={this.openCollaborationRequest(cr)}>
                            <td className="actions"><FontAwesomeIcon icon="arrow-right"/></td>
                            <td className="name">{cr.name}</td>
                            <td className="shortName">{cr.short_name}</td>
                            <td className="requester">{cr.requester.name}</td>
                            <td className="message tooltip-cell">
                                <span>{cr.message}</span>
                                {!isEmpty(cr.message) &&
                                <span className="tooltip-container">
                                <span data-tip data-for={`cr_${cr.id}`}>
                                    <FontAwesomeIcon icon="info-circle"/>
                                </span>
                                <ReactTooltip id={`cr_${cr.id}`} type="info" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: escapeHtmlTooltip(cr.message)}}/>{}
                                </ReactTooltip>
                            </span>}
                            </td>
                        </tr>)}
                    </tbody>
                </table>
            </section>
        );
    };

    renderServices = (services, sorted, reverse, adminOfOrganisation) => {
        const noServices = services.length === 0;
        const names = ["actions", "name", "entity_id", "description"];
        return (
            <section className="services-container">
                {noServices && <p>{I18n.t("organisationDetail.noServices")}</p>}
                {!noServices && <table className="services">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortServicesTable(services, name, sorted, reverse)}>
                                {I18n.t(`organisationDetail.service.${name}`)}
                                {headerIcon(name, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {services.map((service) =>
                        <tr key={service.id} onClick={this.openService(service)}>
                            <td className="actions"><FontAwesomeIcon icon="arrow-right"/></td>
                            <td className="name">{service.name}</td>
                            <td className="entity_id">{service.entity_id}</td>
                            <td className="description">{service.description}</td>
                        </tr>)}
                    </tbody>
                </table>}
                {adminOfOrganisation && <Button onClick={this.configureServices}
                                                txt={I18n.t("organisationDetail.configureServices")}/>
                }
            </section>
        );
    };

    renderNoInvitations = () => (<div>
        <div className="title">
            <p className="title organisation-invitations">{I18n.t("organisationDetail.invitations", {name: this.state.originalOrganisation.name})}</p>
        </div>
        <section className="invitations-container">
            <p>{I18n.t("organisationDetail.noInvitations")}</p>
        </section>
    </div>);

    renderInvitations = (reverse, sorted, invitations) => {
        if (invitations.length === 0) {
            return this.renderNoInvitations();
        }
        const names = ["actions", "invitee_email", "user__name", "intended_role", "expiry_date", "message"];
        return (
            <div>
                <div className="title">
                    <p className="title organisation-invitations">{I18n.t("organisationDetail.invitations", {name: this.state.originalOrganisation.name})}</p>
                </div>

                <section className="invitations-container">
                    <table className="invitations">
                        <thead>
                        <tr>
                            {names.map(name =>
                                <th key={name} className={name}
                                    onClick={this.sortInvitationsTable(invitations, name, sorted, reverse)}>
                                    {I18n.t(`organisationDetail.invitation.${name}`)}
                                    {headerIcon(name, sorted, reverse)}
                                </th>
                            )}
                        </tr>
                        </thead>
                        <tbody>
                        {invitations.map((invite) => <tr key={invite.id} onClick={this.openInvitation(invite)}>
                            <td className="actions"><FontAwesomeIcon icon="arrow-right"/></td>
                            <td className="invitee">{invite.invitee_email}</td>
                            <td className="invitedBy">{invite.user.name}</td>
                            <td className="intendedRole">{I18n.t(`organisation.organisationRoles.${invite.intended_role}`)}</td>
                            <td className="expires">{invite.expiry_date ? moment(invite.expiry_date * 1000).format("LL") : I18n.t("organisationDetail.invitation.noExpires")}</td>
                            <td className="message tooltip-cell">
                                <span>{invite.message}</span>
                                {!isEmpty(invite.message) &&
                                <span className="tooltip-container">
                                <span data-tip data-for={`invite_${invite.id}`}>
                                    <FontAwesomeIcon icon="info-circle"/>
                                </span>
                                <ReactTooltip id={`invite_${invite.id}`} type="info" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: escapeHtmlTooltip(invite.message)}}/>{}
                                </ReactTooltip>
                            </span>}
                            </td>
                        </tr>)}
                        </tbody>
                    </table>
                </section>
            </div>
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

    searchCollaborations = e => {
        const query = e.target.value.toLowerCase();
        const {collaborations, sortedCollaborationAttribute, reverseCollaborationSorted} = this.state;
        const newCollaborations = collaborations.filter(coll => coll.name.toLowerCase().indexOf(query) > -1 ||
            coll.description.toLowerCase().indexOf(query) > -1 ||
            coll.short_name.toLowerCase().indexOf(query) > -1);
        const newSortedCollaborations = sortObjects(newCollaborations, sortedCollaborationAttribute, reverseCollaborationSorted);
        this.setState({filteredCollaborations: newSortedCollaborations, collaborationsQuery: query})
    };

    renderMembers = (members, user, sorted, reverse, query, adminOfOrganisation) => {
        const isAdmin = user.admin || adminOfOrganisation;
        const adminClassName = isAdmin ? "with-button" : "";
        const hasMembers = !isEmpty(members);
        return (
            <section className="members-search">
                {!hasMembers && <p>{I18n.t("organisationDetail.noMembers")}</p>}

                <div className="search">
                    {hasMembers && <input type="text"
                                          className={adminClassName}
                                          onChange={this.searchMembers}
                                          value={query}
                                          placeholder={I18n.t("organisationDetail.searchPlaceHolder")}/>}
                    {hasMembers && <FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {isAdmin &&
                    <Button onClick={this.invite} className={hasMembers ? "" : "no-members"}
                            txt={I18n.t("organisationDetail.invite")}/>
                    }
                </div>
                {hasMembers && this.renderMemberTable(members, user, sorted, reverse, adminOfOrganisation)}
            </section>

        );
    };

    renderMemberTable = (members, user, sorted, reverse, adminOfOrganisation) => {
        const names = ["user__name", "user__email", "user__uid", "role", "user__suspended", "created_at", "actions"];
        const roles = [
            {value: "admin", label: I18n.t(`organisation.organisationShortRoles.admin`)},
            {value: "manager", label: I18n.t(`organisation.organisationShortRoles.manager`)}
        ];
        const isAdmin = user.admin || adminOfOrganisation;
        const numberOfAdmins = members.filter(member => member.role === "admin").length;
        return (
            <table className="members">
                <thead>
                <tr>
                    {names.map(name =>
                        <th key={name} className={name}
                            onClick={this.sortMembersTable(members, name, sorted, reverse)}>
                            {I18n.t(`organisationDetail.member.${name}`)}
                            {name !== "actions" && headerIcon(name, sorted, reverse)}
                        </th>
                    )}
                </tr>
                </thead>
                <tbody>
                {members.map((member, i) =>
                    <tr key={i} className={member.user.id === user.id ? "member-me" : ""}>
                        <td className="name">{member.user.name}</td>
                        <td className="email">{member.user.email}</td>
                        <td className="uid">{member.user.uid}</td>
                        <td className="role">
                            <Select value={roles.find(role => role.value === member.role)} options={roles}
                                    isDisabled={!isAdmin}/>
                        </td>
                        <td className="suspended">
                            <CheckBox name="suspended" value={member.user.suspended} readOnly={true}/>
                        </td>
                        <td className="since">{moment(member.created_at * 1000).format("LL")}</td>
                        <td className="actions">
                            {(isAdmin && member.user.suspended) &&
                            <FontAwesomeIcon icon="user-lock" onClick={this.activateMember(member)}/>}
                            {(isAdmin && numberOfAdmins > 1) &&
                            <FontAwesomeIcon icon="trash" onClick={this.deleteMember(member)}/>}
                        </td>
                    </tr>)}
                </tbody>
            </table>
        );
    };

    organisationApiKeys = (user, adminOfOrganisation, managerOfOrganisation, apiKeys) => {
        const isAllowedApiKey = user.admin || adminOfOrganisation || managerOfOrganisation;
        return (
            <div className="api-keys-container">
                <p className="usage" dangerouslySetInnerHTML={{__html: I18n.t("apiKeys.info")}}/>
                {apiKeys.length > 0 &&
                <table className="api-keys">
                    <thead>
                    <tr>
                        <th className="secret">{I18n.t("apiKeys.secret")}</th>
                        <th className="description">{I18n.t("apiKeys.description")}</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {apiKeys.map((key, i) => <tr key={i}>
                        <td className="secret"><i>{I18n.t("apiKeys.secretValue")}</i></td>
                        <td className="description">{key.description}</td>
                        <td className="actions"><FontAwesomeIcon icon="trash" onClick={this.deleteApiKey(key)}/></td>
                    </tr>)}
                    </tbody>
                </table>}

                {isAllowedApiKey &&
                <Button onClick={this.addApiKey}
                        txt={I18n.t("organisationDetail.newApiKey")}/>
                }
            </div>
        );
    };

    renderCollaborations = (collaborations, user, sorted, reverse, query, adminOfOrganisation, managerOfOrganisation) => {
        const isAllowedCollaborations = user.admin || adminOfOrganisation || managerOfOrganisation;
        const adminClassName = isAllowedCollaborations ? "with-button" : "";
        const hasCollaborations = !isEmpty(collaborations);
        return (
            <section className="collaborations-search">
                {!hasCollaborations && <p>{I18n.t("organisationDetail.noCollaborations")}</p>}
                <div className="search">
                    {hasCollaborations && <input type="text"
                           className={adminClassName}
                           onChange={this.searchCollaborations}
                           value={query}
                           placeholder={I18n.t("organisationDetail.searchPlaceHolderCollaborations")}/>}
                    {hasCollaborations && <FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {isAllowedCollaborations &&
                    <Button onClick={this.newCollaboration} className={hasCollaborations ? "" : "no-members"}
                            txt={I18n.t("organisationDetail.newCollaboration")}/>
                    }
                </div>
                {hasCollaborations && this.renderCollaborationsTable(collaborations, user, sorted, reverse)}
            </section>

        );
    };

    renderCollaborationsTable = (collaborations, user, sorted, reverse) => {
        const names = ["link", "name", "description", "short_name", "global_urn", "accepted_user_policy", "created_at", "actions"];
        return (
            <table className="collaborations">
                <thead>
                <tr>
                    {names.map(name =>
                        <th key={name} className={name}
                            onClick={this.sortCollaborationsTable(collaborations, name, sorted, reverse)}>
                            {I18n.t(`organisationDetail.collaboration.${name}`)}
                            {(name !== "actions" && name !== "link") && headerIcon(name, sorted, reverse)}
                        </th>
                    )}
                </tr>
                </thead>
                <tbody>
                {collaborations.map((coll, i) => <tr onClick={this.openCollaboration(coll)} key={i}>
                    <td className="link"><FontAwesomeIcon icon="arrow-right"/></td>
                    <td className="name">{coll.name}</td>
                    <td className="description">{coll.description}</td>
                    <td className="short_name">{coll.short_name}</td>
                    <td className="global_urn">{coll.global_urn}</td>
                    <td className="accepted_user_policy">{coll.accepted_user_policy}</td>
                    <td className="since">{moment(coll.created_at * 1000).format("LL")}</td>
                    <td className="actions" onClick={this.deleteCollaboration(coll)}>
                        {<FontAwesomeIcon icon="trash" />}
                    </td>
                </tr>)}
                </tbody>
            </table>
        );
    };

    organisationDetails = (adminOfOrganisation, name, short_name, identifier, alreadyExists, initial, description,
                           schac_home_organisation, collaboration_creation_allowed, originalOrganisation, user, disabledSubmit) => {
        return <div className="organisation-detail">
            <InputField value={name} onChange={e => {
                this.setState({
                    name: e.target.value,
                    alreadyExists: {...this.state.alreadyExists, name: false}
                })
            }}
                        placeholder={I18n.t("organisation.namePlaceHolder")}
                        onBlur={this.validateOrganisationName}
                        disabled={!user.admin && !adminOfOrganisation}
                        name={I18n.t("organisation.name")}/>
            {alreadyExists.name && <span
                className="error">{I18n.t("organisation.alreadyExists", {
                attribute: I18n.t("organisation.name").toLowerCase(),
                value: name
            })}</span>}
            {(!initial && isEmpty(name)) && <span
                className="error">{I18n.t("organisation.required", {
                attribute: I18n.t("organisation.name").toLowerCase()
            })}</span>}

            <InputField value={short_name}
                        onChange={e => this.setState({
                            short_name: sanitizeShortName(e.target.value),
                            alreadyExists: {...this.state.alreadyExists, short_name: false}
                        })}
                        placeholder={I18n.t("organisation.shortNamePlaceHolder")}
                        disabled={!user.admin}
                        onBlur={this.validateOrganisationShortName}
                        name={I18n.t("organisation.shortName")}/>
            {alreadyExists.short_name && <span
                className="error">{I18n.t("organisation.alreadyExists", {
                attribute: I18n.t("organisation.shortName").toLowerCase(),
                value: short_name
            })}</span>}
            {(!initial && isEmpty(short_name)) && <span
                className="error">{I18n.t("organisation.required", {
                attribute: I18n.t("organisation.shortName").toLowerCase()
            })}</span>}

            <InputField value={identifier}
                        name={I18n.t("organisation.identifier")}
                        toolTip={I18n.t("organisation.identifierTooltip")}
                        disabled={true}
                        copyClipBoard={true}/>

            <InputField value={description}
                        onChange={e => this.setState({description: e.target.value})}
                        disabled={!user.admin && !adminOfOrganisation}
                        placeholder={I18n.t("organisation.descriptionPlaceholder")}
                        name={I18n.t("organisation.description")}/>

            <InputField value={schac_home_organisation}
                        onChange={e => this.setState({
                            schac_home_organisation: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, schac_home_organisation: false}
                        })}
                        placeholder={I18n.t("organisation.schacHomeOrganisationPlaceholder")}
                        disabled={!user.admin}
                        name={I18n.t("organisation.schacHomeOrganisation")}
                        onBlur={this.validateOrganisationSchacHome}
                        toolTip={I18n.t("organisation.schacHomeOrganisationTooltip")}/>
            {alreadyExists.schac_home_organisation && <span
                className="error">{I18n.t("organisation.alreadyExists", {
                attribute: I18n.t("organisation.schacHomeOrganisation").toLowerCase(),
                value: schac_home_organisation
            })}</span>}


            <CheckBox name={"collaboration_creation_allowed"}
                      value={collaboration_creation_allowed}
                      info={I18n.t("organisation.collaborationCreationAllowed")}
                      readOnly={!(user.admin || adminOfOrganisation) || isEmpty(schac_home_organisation)}
                      tooltip={I18n.t("organisation.collaborationCreationAllowedTooltip")}
                      onChange={e => this.setState({collaboration_creation_allowed: e.target.checked})}/>


            <InputField value={moment(originalOrganisation.created_at * 1000).format("LLLL")}
                        disabled={true}
                        name={I18n.t("organisation.created")}/>
            {(user.admin || adminOfOrganisation) &&
            <section className="actions">
                {user.admin && <Button className="delete" txt={I18n.t("organisationDetail.delete")}
                                       onClick={this.delete}/>}
                <Button disabled={disabledSubmit} txt={I18n.t("organisationDetail.update")}
                        onClick={this.update}/>
            </section>}

        </div>;
    };

    renderDetails = (confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion, leavePage,
                     originalOrganisation, inviteReverse, inviteSorted, invitations, collaborationRequestReverse,
                     collaborationRequestSorted, collaborationRequests, filteredMembers, user, sorted, reverse, query,
                     adminOfOrganisation, managerOfOrganisation, apiKeys, filteredCollaborations, sortedCollaborationAttribute, reverseCollaborationSorted,
                     collaborationsQuery, name, short_name, identifier, alreadyExists, initial, description, schac_home_organisation,
                     collaboration_creation_allowed, disabledSubmit, services, servicesSorted, servicesReverse) => (
        <>
            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelDialogAction}
                                confirm={confirmationDialogAction}
                                question={confirmationQuestion}
                                leavePage={leavePage}/>
            {adminOfOrganisation && this.renderInvitations(inviteReverse, inviteSorted, invitations)}
            <div className="title">
                <p className="title organisation-invitations">{I18n.t("organisationDetail.collaborationRequests", {name: originalOrganisation.name})}</p>
            </div>
            {this.renderCollaborationRequests(collaborationRequestReverse, collaborationRequestSorted, collaborationRequests)}
            <EmailMembers allowEmailLink={managerOfOrganisation || adminOfOrganisation || user.admin}
                          members={this.state.members}
                          title={I18n.t("organisationDetail.members", {name: originalOrganisation.name})}/>
            {this.renderMembers(filteredMembers, user, sorted, reverse, query, adminOfOrganisation)}
            <div className="title">
                <p>{I18n.t("organisationDetail.apiKeys", {name: originalOrganisation.name})}</p>
            </div>
            {this.organisationApiKeys(user, adminOfOrganisation, managerOfOrganisation, apiKeys)}
            <div className="title">
                <p>{I18n.t("organisationDetail.collaborations", {name: originalOrganisation.name})}</p>
            </div>
            {this.renderCollaborations(filteredCollaborations, user, sortedCollaborationAttribute,
                reverseCollaborationSorted, collaborationsQuery, adminOfOrganisation, managerOfOrganisation)}
            <div className="title">
                <p>{I18n.t("organisationDetail.services", {name: originalOrganisation.name})}</p>
            </div>
            {this.renderServices(services, servicesSorted, servicesReverse, adminOfOrganisation)}
            <div className="title">
                <p>{I18n.t("organisationDetail.title", {name: originalOrganisation.name})}</p>
            </div>
            {this.organisationDetails(adminOfOrganisation, name, short_name, identifier, alreadyExists, initial,
                description, schac_home_organisation, collaboration_creation_allowed, originalOrganisation, user, disabledSubmit)}
        </>);

    render() {
        const {
            name, short_name, identifier, description, schac_home_organisation, collaboration_creation_allowed, originalOrganisation, initial, alreadyExists, filteredMembers, query,
            confirmationDialogOpen, confirmationDialogAction, confirmationQuestion, cancelDialogAction, leavePage, sorted, reverse,
            inviteReverse, inviteSorted, invitations, adminOfOrganisation, managerOfOrganisation, apiKeys,
            filteredCollaborations, sortedCollaborationAttribute, reverseCollaborationSorted, collaborationsQuery,
            collaborationRequests, collaborationRequestSorted, collaborationRequestReverse, auditLogs,
            services, servicesSorted, servicesReverse
        } = this.state;
        if (!originalOrganisation) {
            return null;
        }
        const {user} = this.props;
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-organisation-detail">
                <BackLink history={this.props.history}/>
                <Tabs className="white">
                    <div label="form">
                        {this.renderDetails(confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion,
                            leavePage, originalOrganisation, inviteReverse, inviteSorted, invitations, collaborationRequestReverse,
                            collaborationRequestSorted, collaborationRequests, filteredMembers, user, sorted, reverse, query,
                            adminOfOrganisation, managerOfOrganisation, apiKeys, filteredCollaborations, sortedCollaborationAttribute, reverseCollaborationSorted,
                            collaborationsQuery, name, short_name, identifier, alreadyExists, initial, description, schac_home_organisation,
                            collaboration_creation_allowed, disabledSubmit, services, servicesSorted, servicesReverse)}
                    </div>
                    {(adminOfOrganisation || user.admin) &&
                    <div label="history">
                        <History auditLogs={auditLogs} className="white"/>
                    </div>}
                </Tabs>
            </div>)
    }


}

export default OrganisationDetail;
import React from "react";
import ReactTooltip from "react-tooltip";
import {
    deleteApiKey, deleteCollaboration,
    deleteOrganisation,
    deleteOrganisationMembership,
    organisationById,
    organisationIdentifierExists,
    organisationNameExists, organisationShortNameExists,
    updateOrganisation
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

class OrganisationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            originalOrganisation: null,
            name: "",
            tenant_identifier: "",
            short_name: "",
            description: "",
            members: [],
            filteredMembers: [],
            invitations: [],
            apiKeys: [],
            required: ["name", "tenant_identifier"],
            alreadyExists: {},
            initial: true,
            sorted: "user__name",
            reverse: false,
            inviteSorted: "invitee_email",
            inviteReverse: false,
            query: "",
            collaborations: [],
            filteredCollaborations: [],
            sortedCollaborationAttribute: "name",
            reverseCollaborationSorted: false,
            collaborationsQuery: "",
            adminOfOrganisation: false,
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
                        reverseCollaborationSorted
                    } = this.state;
                    const members = sortObjects(json.organisation_memberships, sorted, reverse);
                    const collaborations = sortObjects(json.collaborations, sortedCollaborationAttribute, reverseCollaborationSorted);
                    this.setState({
                        originalOrganisation: json,
                        name: json.name,
                        short_name: json.short_name,
                        tenant_identifier: json.tenant_identifier,
                        description: json.description,
                        members: members,
                        filteredMembers: members,
                        collaborations: collaborations,
                        filteredCollaborations: collaborations,
                        invitations: sortObjects(json.organisation_invitations, inviteSorted, inviteReverse),
                        adminOfOrganisation: json.organisation_memberships.some(member => member.role === "admin" && member.user_id === user.id),
                        apiKeys: json.api_keys
                    })
                });
        } else {
            this.props.history.push("/404");
        }
    };

    update = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doUpdate)
        } else {
            this.doUpdate();
        }
    };

    deleteMember = member => () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisationDetail.deleteMemberConfirmation", {name: member.user.name}),
            confirmationDialogAction: this.doDeleteMember(member)
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

    deleteCollaboration = collaboration => () => {
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
            const {name, description, tenant_identifier, originalOrganisation} = this.state;
            updateOrganisation({id: originalOrganisation.id, name, description, tenant_identifier})
                .then(() => {
                    this.props.history.push(`/organisations/${originalOrganisation.id}`);
                    setFlash(I18n.t("organisationDetail.flash.updated", {name: name}))
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

    validateOrganisationTenantIdentifier = e =>
        organisationIdentifierExists(e.target.value, this.state.originalOrganisation.tenant_identifier).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, tenant: json}});
        });

    validateOrganisationShortName = e =>
        organisationShortNameExists(e.target.value, this.state.originalOrganisation.short_name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    openInvitation = invitation => e => {
        stopEvent(e);
        this.props.history.push(`/organisation-invitations/${invitation.id}`);
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

    renderInvitations = (reverse, sorted, invitations) => {
        if (invitations.length === 0) {
            return <section className="invitations-container">
                <p>{I18n.t("organisationDetail.noInvitations")}</p>
            </section>
        }
        const names = ["actions", "invitee_email", "user__name", "expiry_date", "message"];
        return (
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
        return (
            <section className="members-search">
                <div className="search">
                    <input type="text"
                           className={adminClassName}
                           onChange={this.searchMembers}
                           value={query}
                           placeholder={I18n.t("organisationDetail.searchPlaceHolder")}/>
                    {<FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {isAdmin &&
                    <Button onClick={this.invite}
                            txt={I18n.t("organisationDetail.invite")}/>
                    }
                </div>
                {this.renderMemberTable(members, user, sorted, reverse)}
            </section>

        );
    };

    renderMemberTable = (members, user, sorted, reverse) => {
        const names = ["user__name", "user__email", "user__uid", "role", "created_at", "actions"];
        const role = {value: "admin", label: "Admin"};
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
                {members.map((member, i) => <tr key={i}>
                    <td className="name">{member.user.name}</td>
                    <td className="email">{member.user.email}</td>
                    <td className="uid">{member.user.uid}</td>
                    <td className="role"><Select value={role} options={[role]}/></td>
                    <td className="since">{moment(member.created_at * 1000).format("LL")}</td>
                    <td className="actions">
                        {numberOfAdmins > 1 && <FontAwesomeIcon icon="trash" onClick={this.deleteMember(member)}/>}
                    </td>
                </tr>)}
                </tbody>
            </table>
        );
    };

    organisationApiKeys = (user, adminOfOrganisation, apiKeys) => {
        const isAdmin = user.admin || adminOfOrganisation;
        return (
            <div className="api-keys-container">
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

                {isAdmin &&
                <Button onClick={this.addApiKey}
                        txt={I18n.t("organisationDetail.newApiKey")}/>
                }
            </div>
        );
    };

    renderCollaborations = (collaborations, user, sorted, reverse, query, adminOfOrganisation) => {
        const isAdmin = user.admin || adminOfOrganisation;
        const adminClassName = isAdmin ? "with-button" : "";
        return (
            <section className="collaborations-search">
                <div className="search">
                    <input type="text"
                           className={adminClassName}
                           onChange={this.searchCollaborations}
                           value={query}
                           placeholder={I18n.t("organisationDetail.searchPlaceHolderCollaborations")}/>
                    {<FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {isAdmin &&
                    <Button onClick={this.newCollaboration}
                            txt={I18n.t("organisationDetail.newCollaboration")}/>
                    }
                </div>
                {this.renderCollaborationsTable(collaborations, user, sorted, reverse)}
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
                    <td className="actions">
                        {<FontAwesomeIcon icon="trash" onClick={this.deleteCollaboration(coll)}/>}
                    </td>
                </tr>)}
                </tbody>
            </table>
        );
    };

    organisationDetails = (name, short_name, alreadyExists, initial, tenant_identifier, description, originalOrganisation, user, disabledSubmit) => {
        return <div className="organisation-detail">
            <InputField value={name} onChange={e => {
                this.setState({
                    name: e.target.value,
                    alreadyExists: {...this.state.alreadyExists, name: false}
                })
            }}
                        placeholder={I18n.t("organisation.namePlaceHolder")}
                        onBlur={this.validateOrganisationName}
                        disabled={!user.admin}
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
                            short_name: e.target.value,
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

            <InputField value={tenant_identifier}
                        onChange={e => this.setState({
                            tenant_identifier: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, tenant_identifier: false}
                        })}
                        placeholder={I18n.t("organisation.tenantPlaceHolder")}
                        disabled={!user.admin}
                        onBlur={this.validateOrganisationTenantIdentifier}
                        name={I18n.t("organisation.tenant_identifier")}/>
            {alreadyExists.tenant && <span
                className="error">{I18n.t("organisation.alreadyExists", {
                attribute: I18n.t("organisation.tenant_identifier").toLowerCase(),
                value: tenant_identifier
            })}</span>}
            {(!initial && isEmpty(tenant_identifier)) && <span
                className="error">{I18n.t("organisation.required", {
                attribute: I18n.t("organisation.tenant_identifier").toLowerCase()
            })}</span>}

            <InputField value={description}
                        onChange={e => this.setState({description: e.target.value})}
                        disabled={!user.admin}
                        placeholder={I18n.t("organisation.descriptionPlaceholder")}
                        name={I18n.t("organisation.description")}/>

            <InputField value={moment(originalOrganisation.created_at * 1000).format("LLLL")}
                        disabled={true}
                        name={I18n.t("organisation.created")}/>
            {user.admin &&
            <section className="actions">
                <Button disabled={disabledSubmit} txt={I18n.t("organisationDetail.update")}
                        onClick={this.update}/>
                <Button className="delete" txt={I18n.t("organisationDetail.delete")}
                        onClick={this.delete}/>
            </section>}

        </div>;
    };

    render() {
        const {
            name, short_name, description, tenant_identifier, originalOrganisation, initial, alreadyExists, filteredMembers, query,
            confirmationDialogOpen, confirmationDialogAction, confirmationQuestion, cancelDialogAction, leavePage, sorted, reverse,
            inviteReverse, inviteSorted, invitations, adminOfOrganisation, apiKeys,
            filteredCollaborations, sortedCollaborationAttribute, reverseCollaborationSorted, collaborationsQuery
        } = this.state;
        if (!originalOrganisation) {
            return null;
        }
        const {user} = this.props;
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-organisation-detail">
                {!user.admin && <div className="title">
                    <a href="/home" onClick={e => {
                        stopEvent(e);
                        this.props.history.push("/home")
                    }}><FontAwesomeIcon icon="arrow-left"/>{I18n.t("home.backToHome")}</a>
                </div>}
                {user.admin && <div className="title">
                    <a href="/organisations" onClick={e => {
                        stopEvent(e);
                        this.props.history.push("/organisations")
                    }}><FontAwesomeIcon icon="arrow-left"/>{I18n.t("organisationDetail.backToOrganisations")}</a>
                </div>}
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}
                                    leavePage={leavePage}/>
                <div className="title">
                    <p className="title organisation-invitations">{I18n.t("organisationDetail.invitations", {name: originalOrganisation.name})}</p>
                </div>
                {this.renderInvitations(inviteReverse, inviteSorted, invitations)}
                <div className="title">
                    <p className="title members">{I18n.t("organisationDetail.members", {name: originalOrganisation.name})}</p>
                </div>
                {this.renderMembers(filteredMembers, user, sorted, reverse, query, adminOfOrganisation)}
                <div className="title">
                    <p>{I18n.t("organisationDetail.apiKeys", {name: originalOrganisation.name})}</p>
                </div>
                {this.organisationApiKeys(user, adminOfOrganisation, apiKeys)}
                <div className="title">
                    <p>{I18n.t("organisationDetail.collaborations", {name: originalOrganisation.name})}</p>
                </div>
                {this.renderCollaborations(filteredCollaborations, user, sortedCollaborationAttribute,
                    reverseCollaborationSorted, collaborationsQuery, query, adminOfOrganisation)}
                <div className="title">
                    <p>{I18n.t("organisationDetail.title", {name: originalOrganisation.name})}</p>
                </div>
                {this.organisationDetails(name, short_name, alreadyExists, initial, tenant_identifier, description, originalOrganisation, user, disabledSubmit)}
            </div>)
    }

}

export default OrganisationDetail;
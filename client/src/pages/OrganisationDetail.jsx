import React from "react";
import {
    deleteOrganisation,
    organisationById,
    organisationIdentifierExists,
    organisationNameExists,
    updateOrganisation
} from "../api";
import "./OrganisationDetail.scss";
import I18n from "i18n-js";
import ConfirmationDialog from "../components/ConfirmationDialog";
import InputField from "../components/InputField";
import {isEmpty, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "../components/Button";
import moment from "moment";
import Select from 'react-select';
import {setFlash} from "../utils/Flash";

class OrganisationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            originalOrganisation: null,
            name: "",
            tenant_identifier: "",
            description: "",
            sortedMembers: [],
            sortedInvitations: [],
            required: ["name", "tenant_identifier"],
            alreadyExists: {},
            initial: true,
            sorted: "name",
            reverse: false,
            inviteSorted: "name",
            inviteReverse: false,
            query: "",
            adminOfOrganisation: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            leavePage: false,

        }
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        const {user} = this.props;
        if (params.id) {
            organisationById(params.id)
                .then(json => {
                    const {sorted, reverse, inviteSorted, inviteReverse} = this.state;
                    this.setState({
                        originalOrganisation: json,
                        name: json.name,
                        tenant_identifier: json.tenant_identifier,
                        description: json.description,
                        sortedMembers: this.sortMembers(json.organisation_memberships, sorted, reverse),
                        sortedInvitations: this.sortMembers(json.organisation_invitations, inviteSorted, inviteReverse),
                        adminOfOrganisation: json.organisation_memberships.some(member => member.role === "admin" && member.user_id === user.id)
                    })
                }).catch(e => this.props.history.push("/404"));
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

    delete = () => {
        this.setState({confirmationDialogOpen: true, confirmationDialogAction: this.doDelete});
    };

    doDelete = () => {
        this.setState({confirmationDialogOpen: false});
        deleteOrganisation(this.state.originalOrganisation.id)
            .then(() => {
                this.props.history.push("/organisations");
                setFlash(I18n.t("organisationDetail.flash.deleted", {name: this.state.originalOrganisation.name}))
            });
    };

    doUpdate = () => {
        if (this.isValid()) {
            const {name, description, tenant_identifier, originalOrganisation} = this.state;
            updateOrganisation({id: originalOrganisation.id, name, description, tenant_identifier})
                .then(() => {
                    this.props.history.push("/organisations");
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
    };

    validateOrganisationName = e =>
        organisationNameExists(e.target.value, this.state.originalOrganisation.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateOrganisationTenantIdentifier = e =>
        organisationIdentifierExists(e.target.value, this.state.originalOrganisation.tenant_identifier).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, tenant: json}});
        });

    sortTable = (members, name, sorted, reverse) => () => {
        const reversed = (sorted === name ? !reverse : false);
        const sortedMembers = this.sortMembers(members, name, reversed);
        this.setState({sortedMembers: sortedMembers, sorted: name, reverse: reversed});
    };

    sortInvitationsTable = (invitations, name, sorted, reverse) => () => {
        const reversed = (sorted === name ? !reverse : false);
        const sortedInvitations = this.invitations(invitations, name, reversed);
        this.setState({sortedInvitations: sortedInvitations, inviteSorted: name, inviteReverse: reversed});
    };

    sortMembers = (members, name, reverse) => [...members].sort((a, b) => {
        const aSafe = a[name] || "";
        const bSafe = b[name] || "";
        return aSafe.toString().localeCompare(bSafe.toString()) * (reverse ? -1 : 1);
    });

    headerIcon = (name, sorted, reverse) => {
        if (name === sorted) {
            return reverse ? <FontAwesomeIcon icon="arrow-up" className="reverse"/> :
                <FontAwesomeIcon icon="arrow-down" className="current"/>
        }
        return <FontAwesomeIcon icon="arrow-down"/>;
    };

    renderInvitations = (reverse, sorted, invitations) => {
        if (invitations.length === 0) {
            return <p>{I18n.t("organisationDetail.noInvitations")}</p>
        }
        const names = ["invitee", "invitedBy", "expires", "message"];
        return (
            <section className="invitations-container">
                <table className="invitations">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortInvitationsTable(invitations, name, sorted, reverse)}>
                                {I18n.t(`organisationDetail.invitation.${name}`)}
                                {this.headerIcon(name, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {invitations.map((invite) => <tr key={invite.id}>
                        <td className="invitee">{invite.invitee_email}</td>
                        <td className="invitedBy">{invite.user.name}</td>
                        <td className="expires">{invite.expiry_date ? moment(invite.expiry_date * 1000) : I18n.t("organisationDetail.invitation.noExpires")}</td>
                        <td className="invitee">{invite.invitee_email}</td>
                    </tr>)}
                    </tbody>
                </table>
            </section>
        );

    };

    searchMembers = e => {
        const query = e.target.value.toLowerCase();
        const {sortedMembers, sorted, reverse} = this.state;
        const newMembers = sortedMembers.filter(member => member.user.name.toLowerCase().indexOf(query) > -1 ||
            member.user.email.toLowerCase().indexOf(query) > -1 ||
            member.user.uid.toLowerCase().indexOf(query) > -1);
        const newSortedMembers = this.sortMembers(newMembers, sorted, reverse);
        this.setState({sortedMembers: newSortedMembers, query: query})
    };

    renderMembers = (members, sortedMembers, user, sorted, reverse, query) => {
        const isAdmin = user.admin;
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
                    {isAdmin && <Button onClick={this.invite}
                                        txt={I18n.t("organisationDetail.invite")}/>
                    }
                </div>
                {this.renderMemberTable(members, sortedMembers, user, sorted, reverse)}
            </section>

        );
    };

    renderMemberTable = (members, sortedMembers, user, sorted, reverse) => {
        const names = ["name", "email", "uid", "role", "since"];
        const role = {value: "admin", label: "Admin"};
        return (
            <table className="members">
                <thead>
                <tr>
                    {names.map(name =>
                        <th key={name} className={name}
                            onClick={this.sortTable(members, name, sorted, reverse)}>
                            {I18n.t(`organisationDetail.member.${name}`)}
                            {this.headerIcon(name, sorted, reverse)}
                        </th>
                    )}
                </tr>
                </thead>
                <tbody>
                {sortedMembers.map((member, i) => <tr key={i}>
                    <td className="name">{member.user.name}</td>
                    <td className="email">{member.user.email}</td>
                    <td className="uid">{member.user.uid}</td>
                    <td className="role"><Select value={role} isDisabled={true} options={[role]}/></td>
                    <td className="since">{moment(member.created_at * 1000).format("LLLL")}</td>
                </tr>)}
                </tbody>
            </table>
        );
    };

    render() {
        const {
            name, description, tenant_identifier, originalOrganisation, initial, alreadyExists, sortedMembers, query, members,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, sorted, reverse,
            inviteReverse, inviteSorted, sortedInvitations
        } = this.state;
        if (!originalOrganisation) {
            return null;
        }
        const {user} = this.props;
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-organisation-detail">
                <div className="title">
                    <a href="/organisations" onClick={e => {
                        stopEvent(e);
                        this.props.history.push("/organisations")
                    }}><FontAwesomeIcon icon="arrow-left"/>{I18n.t("organisationDetail.backToOrganisations")}</a>
                    <p>{I18n.t("organisationDetail.title", {name: originalOrganisation.name})}</p>
                </div>

                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={leavePage ? undefined : I18n.t("organisation.deleteConfirmation")}
                                    leavePage={leavePage}/>
                <div className="organisation-detail">
                    <InputField value={name} onChange={e => {
                        this.setState({
                            name: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, name: false}
                        })
                    }}
                                placeholder={I18n.t("organisation.namePlaceHolder")}
                                onBlur={this.validateOrganisationName}
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

                    <InputField value={tenant_identifier}
                                onChange={e => this.setState({
                                    tenant_identifier: e.target.value,
                                    alreadyExists: {...this.state.alreadyExists, tenant_identifier: false}
                                })}
                                placeholder={I18n.t("organisation.tenantPlaceHolder")}
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
                                placeholder={I18n.t("organisation.descriptionPlaceholder")}
                                name={I18n.t("organisation.description")}/>

                    <InputField value={moment(originalOrganisation.created_at * 1000).format("LLLL")}
                                disabled={true}
                                name={I18n.t("organisation.created")}/>
                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("organisationDetail.update")}
                                onClick={this.update}/>
                        <Button className="delete" txt={I18n.t("organisationDetail.delete")}
                                onClick={this.delete}/>
                    </section>

                </div>
                <p className="title organisation-invitations">{I18n.t("organisationDetail.invitations", {name: originalOrganisation.name})}</p>
                {this.renderInvitations(inviteReverse, inviteSorted, sortedInvitations)}
                <p className="title members">{I18n.t("organisationDetail.members", {name: originalOrganisation.name})}</p>
                {this.renderMembers(members, sortedMembers, user, sorted, reverse, query)}
            </div>)
    }
}

export default OrganisationDetail;
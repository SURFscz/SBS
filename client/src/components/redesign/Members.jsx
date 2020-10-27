import EmailMembers from "../EmailMembers";
import I18n from "i18n-js";
import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "../Button";
import Select from "react-select";
import CheckBox from "../CheckBox";
import moment from "moment";
import ReactTooltip from "react-tooltip";
import {deleteOrganisationMembership, updateOrganisationMembershipRole} from "../../api";
import {isEmpty, sortObjects} from "../../utils/Utils";
import {setFlash} from "../../utils/Flash";
import {headerIcon} from "../../forms/helpers";

import "./Members.scss";

export default class Members extends React.PureComponent {

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
                            <Select
                                value={roles.find(option => option.value === member.role)}
                                options={roles}
                                onChange={this.changeMemberRole(member)}
                                isDisabled={!isAdmin}/>
                        </td>
                        <td className="suspended">
                            <CheckBox name="suspended" value={member.user.suspended} readOnly={true}/>
                        </td>
                        <td className="since">{moment(member.created_at * 1000).format("LL")}</td>
                        <td className="actions">
                            {(isAdmin && member.user.suspended) &&
                            <span data-tip data-for={`activate-member-${i}`}>
                                <FontAwesomeIcon icon="user-lock" onClick={this.activateMember(member)}/>
                                <ReactTooltip id={`activate-member-${i}`} type="info" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{
                                        __html: I18n.t("collaborationDetail.activateMemberTooltip")
                                    }}/>
                                </ReactTooltip>
                            </span>}

                            {(isAdmin && numberOfAdmins > 1) &&
                            <FontAwesomeIcon icon="trash" onClick={this.deleteMember(member)}/>}
                        </td>
                    </tr>)}
                </tbody>
            </table>
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
        const currentRole = originalOrganisation.organisation_memberships.find(m => m.user.id === member.user.id).role;
        if (currentRole === selectedOption.value) {
            return;
        }
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

    renderMembers = (members, user, sorted, reverse, query, adminOfOrganisation) => {
        const isAdmin = user.admin || adminOfOrganisation;
        const adminClassName = isAdmin ? "with-button" : "";
        const hasMembers = !isEmpty(members) || !isEmpty(query);
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

    render() {
        const {
            sorted, reverse, originalOrganisation, filteredMembers, query, adminOfOrganisation, managerOfOrganisation
        } = this.state;
        const {user} = this.props;
        return (<div className="members">
            <EmailMembers allowEmailLink={managerOfOrganisation || adminOfOrganisation || user.admin}
                          members={this.state.members}
                          title={I18n.t("organisationDetail.members", {name: originalOrganisation.name})}/>
            {
                this.renderMembers(filteredMembers, user, sorted, reverse, query, adminOfOrganisation)
            }
        </div>)

    }
}


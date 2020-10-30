import React from "react";
import "./Organisations.scss";
import I18n from "i18n-js";
import "./Entities.scss";
import Entities from "./Entities";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as InviteIcon} from "../../icons/single-neutral-question.svg";
import {ReactComponent as HandIcon} from "../../icons/toys-hand-ghost.svg";
import "./PlatformAdmins.scss";
import CheckBox from "../CheckBox";
import {updateOrganisationMembershipRole} from "../../api";
import {setFlash} from "../../utils/Flash";
import Select from "react-select";
import "./OrganisationAdmins.scss";

const roles = [
    {value: "admin", label: I18n.t(`organisation.organisationShortRoles.admin`)},
    {value: "manager", label: I18n.t(`organisation.organisationShortRoles.manager`)}
];

class OrganisationAdmins extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedMembers: {}
        }
    }

    changeMemberRole = member => selectedOption => {
        const {organisation} = this.props;
        const currentRole = organisation.organisation_memberships.find(m => m.user.id === member.user.id).role;
        if (currentRole === selectedOption.value) {
            return;
        }
        updateOrganisationMembershipRole(organisation.id, member.user.id, selectedOption.value)
            .then(() => {
                this.props.refresh();
                setFlash(I18n.t("organisationDetail.flash.memberUpdated", {
                    name: member.user.name,
                    role: selectedOption.value
                }));
            });
    };

    onCheck = memberShip => e => {
        const {selectedMembers} = this.state;
        selectedMembers[memberShip.id] = e.target.checked;
        this.setState({selectedMembers: {...selectedMembers}});
    }

    render() {
        const {user: currentUser, organisation} = this.props;
        const {selectedMembers} = this.state;
        const admins = organisation.organisation_memberships;
        const invites = organisation.organisation_invitations;
        invites.forEach(invite => invite.invite = true);

        const isAdmin = currentUser.admin;

        let i = 0;
        const columns = [
            {
                nonSortable: true,
                key: "check",
                header: "",
                mapper: entity => <div className="check">
                    <CheckBox name={++i} onChange={this.onCheck} value={selectedMembers[entity.id] || false}/>
                </div>
            },
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: entity => <div className="member-icon">
                    {entity.invite && <InviteIcon/>}
                    {!entity.invite && <UserIcon/>}
                </div>
            },
            {
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: entity =>
                    <div className="user-name-email">
                        <span className="name">{entity.invite ? "-" : entity.user.name}</span>
                        <span className="email">{entity.invite ? entity.invitee_email : entity.user.email}</span>
                    </div>
            },
            {
                key: "schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: entity => entity.invite ? entity.user.schac_home_organisation : ""
            },
            {
                key: "role",
                header: I18n.t("models.users.role"),
                mapper: entity => entity.invite ? null : <Select
                    value={roles.find(option => option.value === entity.role)}
                    options={roles}
                    onChange={this.changeMemberRole(entity)}
                    isDisabled={!isAdmin}/>
            },
            {
                key: "status",
                header: I18n.t("models.orgMembers.status"),
                mapper: entity => entity.invite ?
                    <span className="person-role invite">{I18n.t("models.orgMembers.inviteSend", {date: entity.created_at})}</span> :
                    <span className="person-role accepted">{I18n.t("models.orgMembers.accepted")}</span>
            },
            {
                nonSortable: true,
                key: "impersonate",
                header: "",
                mapper: entity => entity.invite ? null : <div className="impersonate">
                    <HandIcon/>
                </div>
            },
        ]
        return (
            <Entities entities={admins.concat(invites)} modelName="orgMembers" searchAttributes={["name", "email"]}
                      defaultSort="name" columns={columns} loading={false}
                      {...this.props}/>
        )
    }
}

export default OrganisationAdmins;
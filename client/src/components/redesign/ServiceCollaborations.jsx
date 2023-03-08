import React from "react";

import "./ServiceCollaborations.scss";
import {isEmpty} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Button from "../Button";
import {collaborationAdmins, deleteCollaborationServices, toggleNonMemberUsersAccessAllowed} from "../../api";
import SpinnerField from "./SpinnerField";
import Logo from "./Logo";
import CheckBox from "../CheckBox";
import {Tooltip} from "@surfnet/sds";
import ConfirmationDialog from "../ConfirmationDialog";

import {ReactComponent as InformationCircle} from "@surfnet/sds/icons/functional-icons/info.svg";
import {ReactComponent as EmailIcon} from "../../icons/email_new.svg";
import {ReactComponent as ThrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import {setFlash} from "../../utils/Flash";

export default class ServiceCollaborations extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaborations: [],
            selectedCollaborations: {},
            collaborationAdminEmails: {},
            confirmationDialogOpen: false,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            loading: false
        }
    }

    componentDidMount = () => {
        const {collaborations, user, service} = this.props;
        this.addRoleInformation(user, collaborations);
        collaborationAdmins(service).then(res => this.setState({
                collaborationAdminEmails: res
            })
        );
    }

    removeCollaboration = (showConfirmation, entityId) => {
        const {collaborations, service} = this.props;
        const name = (collaborations.find(coll => coll.id === entityId) || {}).name;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t(`models.serviceCollaborations.confirmation.remove${entityId ? "One" : ""}`,
                    {name: name}),
                confirmationDialogAction: () => this.removeCollaboration(false, entityId),
            });
        } else {
            const {selectedCollaborations} = this.state;
            const collaborationIdentifiers = entityId ? [entityId] : Object.entries(selectedCollaborations)
                .filter(l => l[1])
                .map(e => parseInt(e[0], 10));
            const promises = collaborationIdentifiers.map(id => deleteCollaborationServices(id, service.id));
            Promise.all(promises).then(() => this.props.refresh(() => {
                this.componentDidMount();
                setFlash(I18n.t("models.serviceCollaborations.flash.removed"));
            }));

        }
    }


    addRoleInformation = (user, collaborations) => {
        collaborations.forEach(co => {
            const membership = (user.collaboration_memberships || []).find(m => m.collaboration_id === co.id);
            co.role = membership ? membership.role : null;
        });
    }

    onCheck = collaboration => e => {
        const {selectedCollaborations} = this.state;
        selectedCollaborations[collaboration.id] = e.target.checked;
        this.setState({selectedCollaborations: {...selectedCollaborations}});
    }

    actionButtons = (selectedCollaborations, collaborationAdminEmails, collaborations) => {
        const selected = Object.values(selectedCollaborations).filter(v => v);
        const anySelected = selected.length > 0;
        if (!anySelected) {
            return null;
        }
        const names = collaborations.filter(coll => selectedCollaborations[coll.id]).map(coll => coll.name);
        const adminEmails = Object.keys(collaborationAdminEmails)
            .filter(name => names.includes(name))
            .map(name => collaborationAdminEmails[name]);
        const hrefValue = encodeURI(adminEmails.join(","));
        return (
            <div className="admin-actions">
                <Tooltip standalone={true} children={
                    <Button onClick={() => this.removeCollaboration(true)}
                            small={true}
                            txt={I18n.t("models.serviceCollaborations.disconnect")}
                            icon={<ThrashIcon/>}
                            tip={I18n.t("models.serviceCollaborations.disconnectTooltip")}
                    />}/>
                {adminEmails.length > 0 &&
                <div>
                    <Tooltip standalone={true}
                             tip={I18n.t("models.orgMembers.mailTooltip")}
                             children={<a href={`mailto:?bcc=${hrefValue}`}
                                          className="sds--btn sds--btn--primary sds--btn--small"
                                          style={{border: "none", cursor: "default"}}
                                          rel="noopener noreferrer">
                                 {I18n.t("models.orgMembers.mail")}<EmailIcon/>
                             </a>}/>

                </div>}

            </div>);
    }

    getActionIcons = (entity, collaborationAdminEmails) => {
        const hrefValue = encodeURI((collaborationAdminEmails[entity.name] || []).join(","));
        const bcc = (entity.disclose_email_information && entity.disclose_member_information) ? "" : "?bcc=";
        return (
            <div className={"action-icons-container"}>
                <div className="admin-icons">
                    {!isEmpty(hrefValue) && <div>
                        <a href={`mailto:${bcc}${hrefValue}`}
                           rel="noopener noreferrer">
                            <Tooltip
                                tip={I18n.t("models.orgMembers.mailAdminTooltip")}
                                anchorId={`mail-member-${entity.id}`}
                                standalone={true}
                                children={<EmailIcon/>}/>
                        </a>
                    </div>}
                    {entity.fromCollaboration && <div
                        onClick={() => this.removeCollaboration(true, entity.id)}>
                        <Tooltip standalone={true}
                                 tip={I18n.t("models.serviceCollaborations.disconnectOneTooltip")}
                                 children={<ThrashIcon/>}/>
                    </div>}

                </div>
            </div>
        );
    }

    render() {
        const {
            loading,
            selectedCollaborations,
            collaborationAdminEmails,
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationQuestion,
            confirmationTxt
        } = this.state;

        if (loading) {
            return <SpinnerField/>;
        }

        const {collaborations, user, modelName, service, showServiceAdminView = false} = this.props;
        const serviceKey = " services";
        const columns = [
            {
                nonSortable: true,
                key: "check",
                header: <CheckBox value={false}
                                  name={"allSelected"}
                                  hide={true}
                                  onChange={() => false}/>,

                mapper: entity => {
                    if (entity.fromCollaboration) {
                        return (
                            <div className="check">
                                <CheckBox name={entity.name}
                                          onChange={this.onCheck(entity)}
                                          value={(selectedCollaborations[entity.id]) || false}/>
                            </div>)
                    } else {
                        return (
                            <Tooltip standalone={true}
                                     children={<InformationCircle/>}
                                     tip={I18n.t("models.serviceCollaborations.organisationWarningTooltip")}/>
                        )
                    }
                }
            },
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: collaboration => <Logo src={collaboration.logo}/>
            },
            {
                key: "name",
                class: serviceKey,
                header: I18n.t("models.collaborations.name"),
                mapper: collaboration => <span>{collaboration.name}</span>
            },
            {
                key: "organisation__name",
                class: serviceKey,
                header: I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => collaboration.organisation.name
            },
            {
                key: "short_name",
                header: I18n.t("organisation.shortName"),
                mapper: collaboration =>
                    <span>{`${collaboration.organisation.short_name}:${collaboration.short_name}`}</span>,
            },
            {
                key: "role",
                class: serviceKey,
                header: I18n.t("profile.yourRole"),
                mapper: collaboration => {
                    if (collaboration.role) {
                        return <span
                            className={`person-role ${collaboration.role}`}>{I18n.t(`profile.${collaboration.role}`)}</span>
                    }
                    return null;
                }
            },
            {
                key: "fromCollaboration",
                header: I18n.t("models.serviceCollaborations.origin"),
                mapper: collaboration => collaboration.fromCollaboration ?
                    I18n.t("models.serviceCollaborations.fromCollaboration") : I18n.t("models.serviceCollaborations.fromOrganisation")
            },
            {
                nonSortable: true,
                key: "action-icons",
                header: "",
                mapper: entity => this.getActionIcons(entity, collaborationAdminEmails)
            }
        ];
        return (
            <div className={"mod-service-collaborations"}>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    confirmationTxt={confirmationTxt}
                                    question={confirmationQuestion}/>
                <div className={"options-container"}>
                    {(user.admin && !showServiceAdminView) &&
                    <CheckBox name="non_member_users_access_allowed"
                              value={service.non_member_users_access_allowed}
                              info={I18n.t("service.nonMemberUsersAccessAllowed")}
                              tooltip={I18n.t("service.nonMemberUsersAccessAllowedTooltip")}
                              onChange={() => toggleNonMemberUsersAccessAllowed(service.id, !service.non_member_users_access_allowed)
                                  .then(() =>
                                  this.props.refresh(() => {
                                      this.componentDidMount();
                                      setFlash(I18n.t("service.flash.updated", {name: service.name}));
                                  })
                              )}
                    />}
                    {service.non_member_users_access_allowed && <div className={"radio-button-container"}>
                        <span>{I18n.t("service.nonMemberUsersAccessAllowedTooltip")}</span>
                    </div>}
                </div>
                {!service.non_member_users_access_allowed && <Entities entities={collaborations}
                          modelName={modelName}
                          searchAttributes={["name"]}
                          defaultSort="name"
                          hideTitle={true}
                          columns={columns}
                          onHover={true}
                          actionHeader={"collaboration-services"}
                          actions={this.actionButtons(selectedCollaborations, collaborationAdminEmails, collaborations)}
                          loading={loading}
                          {...this.props}/>}
            </div>)
    }

}


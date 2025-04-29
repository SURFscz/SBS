import React from "react";

import "./ServiceCollaborations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import Button from "../Button";
import {collaborationAdmins, collaborationsByService, deleteCollaborationServices} from "../../api";
import SpinnerField from "./SpinnerField";
import Logo from "./Logo";
import CheckBox from "../CheckBox";
import {Chip, Tooltip} from "@surfnet/sds";
import ConfirmationDialog from "../ConfirmationDialog";
import {ReactComponent as EmailIcon} from "../../icons/email_new.svg";
import {ReactComponent as ThrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import {clearFlash, setFlash} from "../../utils/Flash";
import {chipType, isUserAllowed, ROLES} from "../../utils/UserRole";

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
            loading: true
        }
    }

    componentDidMount = () => {
        const {user, service} = this.props;
        collaborationsByService(service.id).then(collaborations => {
            this.addRoleInformation(user, collaborations);
            this.setState({
                collaborations: collaborations,
                selectedCollaborations: {},
                loading: false
            });
            //We can do this later, as it is derived functionality
            collaborationAdmins(service).then(res => this.setState({
                    collaborationAdminEmails: res
                })
            );
        })
    }

    removeCollaboration = (showConfirmation, entityId) => {
        const {service} = this.props;
        const {collaborations} = this.state;
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

            Promise.all(promises)
                .then(() => {
                    this.setState({confirmationDialogOpen: false, loading: true});
                    this.componentDidMount();
                    setFlash(I18n.t("models.serviceCollaborations.flash.removed"));
                });
        }
    }

    openCollaboration = collaboration => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    addRoleInformation = (user, collaborations) => {
        collaborations.forEach(co => {
            const membership = (user.collaboration_memberships || []).find(m => m.collaboration_id === co.id);
            co.role = membership ? membership.role : null;
            co.derived_short_name = `${co.organisation_short_name}:${co.short_name}`
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

        const {user, modelName, service, goToOrganisationsTab} = this.props;
        const {collaborations} = this.state;
        const serviceKey = " services";
        const columns = [
            {
                nonSortable: true,
                key: "check",
                header: <CheckBox value={false}
                                  name={"allSelected"}
                                  hide={true}
                                  onChange={() => false}/>,

                mapper: entity =>
                    <div className="check">
                        <CheckBox name={entity.name}
                                  onChange={this.onCheck(entity)}
                                  value={(selectedCollaborations[entity.id]) || false}/>
                    </div>
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
                mapper: collaboration => {
                    return isUserAllowed(ROLES.COLL_ADMIN, user, null, collaboration.id) ?
                        <a href={`/collaborations/${collaboration.id}`}
                           className={"neutral-appearance"}
                           onClick={this.openCollaboration(collaboration)}>{collaboration.name}</a>
                        : <span>{collaboration.name}</span>
                }
            },
            {
                key: "organisation_name",
                class: serviceKey,
                header: I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => collaboration.organisation_name
            },
            {
                key: "derived_short_name",
                header: I18n.t("organisation.shortName"),
                mapper: collaboration => collaboration.derived_short_name
            },
            {
                key: "role",
                class: serviceKey,
                header: I18n.t("profile.yourRole"),
                mapper: collaboration => {
                    if (collaboration.role) {
                        return <Chip label={I18n.t(`profile.${collaboration.role}`)}
                                     type={chipType(collaboration)}/>
                    }
                    return null;
                }
            },
            {
                nonSortable: true,
                key: "action-icons",
                header: "",
                mapper: entity => this.getActionIcons(entity, collaborationAdminEmails)
            }
        ];
        let infoMessage = I18n.t("service.connectCollaborationsInfo");
        if (service.non_member_users_access_allowed) {
            infoMessage = I18n.t("service.nonMemberUsersAccessAllowed");
        } else if (!service.non_member_users_access_allowed && service.connection_setting === "NO_ONE_ALLOWED") {
            infoMessage = I18n.t("service.noOneAllowed");
        } else if (service.access_allowed_for_all) {
            infoMessage = I18n.t("service.accessAllowedForAllInfo");
        }
        return (
            <div className={"mod-service-collaborations"}>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    confirmationTxt={confirmationTxt}
                                    question={confirmationQuestion}/>
                <div className={"info-container"}>
                    <div className={"info"}>
                        <span>{infoMessage}</span>
                        {(isEmpty(collaborations) && service.connection_setting !== "NO_ONE_ALLOWED") &&
                            <span>{` ${I18n.t("models.serviceCollaborations.noEntities")}`}</span>}
                        <Button className="ghost"
                                txt={I18n.t("service.viewSettings")}
                                onClick={() => goToOrganisationsTab()}
                        />
                    </div>
                </div>
                {!isEmpty(collaborations) &&
                    <Entities entities={collaborations}
                              modelName={modelName}
                              searchAttributes={["name"]}
                              defaultSort="name"
                              columns={columns}
                              onHover={true}
                              actionHeader={"collaboration-services"}
                              actions={this.actionButtons(selectedCollaborations, collaborationAdminEmails, collaborations)}
                              loading={loading}
                              {...this.props}/>}
            </div>)
    }

}

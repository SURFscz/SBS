import React from "react";
import "./ServiceOrganisations.scss";
import {removeDuplicates, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import {
    disallowOrganisation,
    onRequestOrganisation,
    toggleAccessAllowedForAll,
    toggleAutomaticConnectionAllowed,
    toggleReset,
    toggleAllowRestrictedOrgs,
    trustOrganisation
} from "../../api";
import {clearFlash, setFlash} from "../../utils/Flash";
import Logo from "./Logo";
import ConfirmationDialog from "../ConfirmationDialog";
import {RadioButton, SegmentedControl} from "@surfnet/sds";
import CheckBox from "../CheckBox";
import {ALWAYS, DISALLOW, ON_REQUEST, PERMISSION_OPTIONS} from "../../utils/Permissions";
import SpinnerField from "./SpinnerField";


class ServiceOrganisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            confirmationDialogOpen: false,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationDialogAction: undefined,
            disallowedOrganisation: null,
            loading: false
        }
    }

    openOrganisation = organisation => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    doToggleAutomaticConnectionAllowed = service => {
        this.setState({loading: true});
        toggleAutomaticConnectionAllowed(service.id)
            .then(() => this.refreshService());
    }

    doToggleReset = service => {
        this.setState({loading: true});
        toggleReset(service.id)
            .then(() => this.refreshService())
    }

    doToggleAccessAllowedForAll = service => {
        this.setState({loading: true});
        toggleAccessAllowedForAll(service.id)
            .then(() => this.refreshService())
    }

    doTogglesAllowRestrictedOrgs = service => {
        this.setState({loading: true});
        toggleAllowRestrictedOrgs(service.id, !service.allow_restricted_orgs)
            .then(() => this.refreshService())
    }

    changePermission = (organisation, option) => {
        const {service} = this.props;
        if (option === DISALLOW) {
            this.doDisallow(organisation, true);
        } else if (option === ON_REQUEST) {
            this.setState({loading: true});
            onRequestOrganisation(service.id, organisation.id)
                .then(() => this.refreshService());
        } else if (option === ALWAYS) {
            this.setState({loading: true});
            trustOrganisation(service.id, organisation.id)
                .then(() => this.refreshService());
        }
    }

    permissionOptions = (organisation, service) => {
        const disabled = service.automatic_connection_allowed || service.access_allowed_for_all || service.non_member_users_access_allowed;
        const allowed = service.allowed_organisations.some(org => org.id === organisation.id)
        const always = service.automatic_connection_allowed_organisations.some(org => org.id === organisation.id)
        return (
            <SegmentedControl onClick={option => this.changePermission(organisation, option)}
                              options={PERMISSION_OPTIONS}
                              optionLabelResolver={option => I18n.t(`models.serviceOrganisations.options.${option}`)}
                              option={always ? PERMISSION_OPTIONS[2] : allowed ? PERMISSION_OPTIONS[1] : PERMISSION_OPTIONS[0]}
                              disabled={disabled}/>
        );
    }

    doDisallow = (organisation, showConfirmation = true) => {
        const {service} = this.props;
        const {collAffected, orgAffected} = this.getAffectedEntities(organisation, service);
        if (showConfirmation && (collAffected.length > 0 || orgAffected.length > 0)) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => {
                    this.setState({confirmationDialogOpen: false});
                    this.doDisallow(organisation, false);
                },
                disallowedOrganisation: organisation
            });
        } else {
            this.setState({loading: true});
            disallowOrganisation(service.id, organisation.id).then(() => this.refreshService());
        }
    }

    renderConfirmation = (service, disallowedOrganisation) => {
        const {collAffected, orgAffected} = this.getAffectedEntities(disallowedOrganisation, service);
        const collAffectedUnique = removeDuplicates(collAffected, "id");
        return (
            <div className="allowed-organisations-confirmation">
                <p>{I18n.t("models.serviceOrganisations.disableAccessConsequences")}</p>
                <ul>
                    {collAffectedUnique.map(coll => <li key={coll.id}>{coll.name}
                        <span>{` - ${I18n.t("models.serviceOrganisations.collaboration")}`}</span>
                    </li>)
                    }
                    {orgAffected.map(org => <li key={org.id}>{org.name}
                        <span>{`- ${I18n.t("models.serviceOrganisations.organisation")}`}</span>
                    </li>)
                    }
                </ul>
            </div>
        );
    }

    refreshService = () => {
        this.props.refresh(() => {
            this.setState({loading: false});
            setFlash(I18n.t("service.flash.updated", {name: this.props.service.name}));
        });
    }

    getAffectedEntities = (organisation, service) => {
        const collAffected = service.collaborations.filter(coll => organisation.id === coll.organisation_id);
        const orgAffected = service.organisations.filter(org => organisation.id === org.id);
        return {collAffected, orgAffected};
    }

    render() {
        const {
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, loading, disallowedOrganisation
        } = this.state;
        const {organisations, service, user, userAdmin, showServiceAdminView} = this.props;
        const availableOrganisations = service.allow_restricted_orgs ? organisations : organisations.filter(org => !org.services_restricted);
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: org => <Logo src={org.logo}/>
            },
            {
                nonSortable: false,
                key: "permissions",
                header: I18n.t("models.serviceOrganisations.options.header"),
                mapper: org => this.permissionOptions(org, service)
            },
            {
                key: "name",
                header: I18n.t("models.organisations.name"),
                mapper: org => userAdmin ?
                    <a href={`/organisations/${org.id}`} onClick={this.openOrganisation(org)}>{org.name}</a> :
                    <span>{org.name}</span>,
            },
            {
                key: "short_name",
                header: I18n.t("organisation.shortName"),
                mapper: org => <span>{org.short_name}</span>,
            },
            {
                nonSortable: true,
                key: "role",
                header: "",
                mapper: org => {
                    const cm = user.organisation_memberships.find(m => m.organisation_id === org.id);
                    return cm ?
                        <span className={`person-role ${cm.role}`}>{I18n.t(`profile.${cm.role}`)}</span> : null;
                }
            },
            {
                key: "category",
                header: I18n.t("models.organisations.category")
            }]
        return (<div>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={I18n.t("models.serviceOrganisations.disableAccessConfirmation")}
                                    closeTimeoutMS={0}
                                    isWarning={true}>
                    {confirmationDialogOpen && this.renderConfirmation(service, disallowedOrganisation)}
                </ConfirmationDialog>
                {loading && <SpinnerField absolute={true}/>}
                <div className={"options-container"}>
                    {(user.admin && !showServiceAdminView) && <div className={"service-container"}>
                        <CheckBox name="allow_restricted_orgs"
                                  value={service.allow_restricted_orgs}
                                  info={I18n.t("service.allowRestrictedOrgs")}
                                  tooltip={I18n.t("service.allowRestrictedOrgsTooltip")}
                                  onChange={() => this.doTogglesAllowRestrictedOrgs(service)}/>
                    </div>}
                    {!service.non_member_users_access_allowed &&
                    <div className={"radio-button-container"}>
                        <RadioButton label={I18n.t("models.serviceOrganisations.permissions.eachOrganisation")}
                                     name={"permissions"}
                                     value={!service.automatic_connection_allowed && !service.access_allowed_for_all}
                                     onChange={() => this.doToggleReset(service)}
                        />
                        <RadioButton label={I18n.t("models.serviceOrganisations.permissions.allowAllRequests")}
                                     name={"permissions"}
                                     value={service.access_allowed_for_all && !service.automatic_connection_allowed}
                                     onChange={() => this.doToggleAccessAllowedForAll(service)}
                        />
                        <RadioButton label={I18n.t("models.serviceOrganisations.permissions.allowAll")}
                                     name={"permissions"}
                                     value={service.automatic_connection_allowed}
                                     onChange={() => this.doToggleAutomaticConnectionAllowed(service)}
                        />
                    </div>}
                    {service.non_member_users_access_allowed && <div className={"radio-button-container"}>
                        <span>{I18n.t("service.nonMemberUsersAccessAllowedTooltip")}</span>
                    </div>}
                </div>
                <Entities entities={availableOrganisations}
                          modelName="serviceOrganisations"
                          searchAttributes={["name"]}
                          defaultSort="name"
                          hideTitle={true}
                          columns={columns}
                          loading={false}
                          {...this.props}/>
            </div>
        )
    }

}

export default ServiceOrganisations;
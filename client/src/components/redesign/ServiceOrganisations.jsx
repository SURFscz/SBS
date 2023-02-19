import React from "react";
import "./ServiceOrganisations.scss";
import {isEmpty, removeDuplicates, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import ToggleSwitch from "./ToggleSwitch";
import {
    allowedOrganisations,
    toggleAccessAllowedForAll,
    toggleAutomaticConnectionAllowed,
    toggleWhiteListed
} from "../../api";
import {clearFlash, setFlash} from "../../utils/Flash";
import Logo from "./Logo";
import ConfirmationDialog from "../ConfirmationDialog";
import {RadioButton, SegmentedControl, Tooltip} from "@surfnet/sds";
import CheckBox from "../CheckBox";


class ServiceOrganisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisationsSelected: {},
            organisationsDeselected: [],
            toggleAll: false,
            confirmationDialogOpen: false,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationDialogAction: undefined
        }
    }

    componentDidMount = toggleAll => {
        const {service, organisations} = this.props;
        const allowedOrganisationIdentifiers = service.allowed_organisations.map(org => org.id);
        const organisationsSelected = organisations.reduce((acc, org) => {
            acc[org.id] = allowedOrganisationIdentifiers.indexOf(org.id) > -1;
            return acc;
        }, {})

        this.setState({
            organisationsSelected: organisationsSelected,
            organisationsDeselected: [],
            toggleAll: toggleAll === undefined ? allowedOrganisationIdentifiers.length === organisations.length : toggleAll
        });
    }

    openOrganisation = organisation => e => {
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    doToggleAccessAllowedForAll = service => {
        toggleAccessAllowedForAll(service.id, !service.access_allowed_for_all)
            .then(() => this.props.refresh(() => {
                this.componentDidMount();
                setFlash(I18n.t("service.flash.updated", {name: service.name}));
            }));
    }

    doTogglesWhiteListed = service => {
        toggleWhiteListed(service.id, !service.white_listed)
            .then(() => this.props.refresh(() => {
                this.componentDidMount();
                setFlash(I18n.t("service.flash.updated", {name: service.name}));
            }));
    }

    toggleChanged = organisation => value => {
        const organisationsSelected = {...this.state.organisationsSelected};
        organisationsSelected[organisation.id] = value;
        this.submit(organisationsSelected, value ? [] : [organisation.id]);
    }

    permissionOptions = (organisation, service) => {
        const disabled = service.automatic_connection_allowed || service.access_allowed_for_all;
        const options = ["disallow", "onRequest", "always"]
            .map(option => I18n.t(`models.serviceOrganisations.options.${option}`));
        return (
            <SegmentedControl onClick={() => true}
                              options={options}
                              option={options[1]}
                              disabled={disabled}/>
        );
    }

    toggle = (organisation, organisationsSelected, service, serviceAdmin) => {
        const value = organisationsSelected[organisation.id];
        const access_allowed_for_all = service.access_allowed_for_all;
        if (access_allowed_for_all) {
            return <Tooltip standalone={true}
                            tip={I18n.t("service.accessAllowedForAllInfo")}/>
        }
        return <ToggleSwitch value={access_allowed_for_all ? true : value || false}
                             animate={false}
                             disabled={!serviceAdmin}
                             onChange={this.toggleChanged(organisation)}/>;
    }

    submit = (organisationsSelected, organisationsDeselected, toggleAll, showConfirmation = true) => {
        const {collAffected, orgAffected} = this.getAffectedEntities(organisationsDeselected, this.props.service);
        if (showConfirmation && (collAffected.length > 0 || orgAffected.length > 0)) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => {
                    this.setState({confirmationDialogOpen: false});
                    this.submit(organisationsSelected, organisationsDeselected, toggleAll, false)
                },
                organisationsDeselected: organisationsDeselected
            });
        } else {
            const organisations = Object.entries(organisationsSelected)
                .filter(e => e[1])
                .map(e => ({"organisation_id": e[0]}));
            const {service} = this.props;
            allowedOrganisations(service.id, {"allowed_organisations": organisations})
                .then(() => this.props.refresh(() => {
                    this.componentDidMount(isEmpty(toggleAll) ? this.state.toggleAll : toggleAll);
                    setFlash(I18n.t("service.flash.updated", {name: service.name}));
                }));
        }
    }

    renderConfirmation = (service, organisationsDeselected) => {
        const {collAffected, orgAffected} = this.getAffectedEntities(organisationsDeselected, service);

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

    getAffectedEntities = (organisationsDeselected, service) => {
        const collAffected = service.collaborations.filter(coll => organisationsDeselected.includes(coll.organisation_id));
        const orgAffected = service.organisations.filter(org => organisationsDeselected.includes(org.id));
        return {collAffected, orgAffected};
    }

    render() {
        const {
            organisationsSelected, organisationsDeselected, confirmationDialogOpen, cancelDialogAction,
            confirmationDialogAction,
        } = this.state;
        const {organisations, service, user, userAdmin, showServiceAdminView} = this.props;
        const availableOrganisations = service.white_listed ? organisations : organisations.filter(org => !org.services_restricted);
        availableOrganisations.forEach(org => org.toggle = organisationsSelected[org.id]);
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
                    {confirmationDialogOpen && this.renderConfirmation(service, organisationsDeselected)}
                </ConfirmationDialog>
                <div className={"options-container"}>
                    {(user.admin && !showServiceAdminView) && <div className={"service-container"}>
                        <CheckBox name="white_listed"
                                  value={service.white_listed}
                                  info={I18n.t("service.whiteListed")}
                                  tooltip={I18n.t("service.whiteListedTooltip")}
                                  onChange={() => this.doTogglesWhiteListed(service)}/>
                    </div>}
                    {!service.non_member_users_access_allowed &&
                    <div className={"radio-button-container"}>
                        <RadioButton label={I18n.t("models.serviceOrganisations.permissions.eachOrganisation")}
                                     name={"permissions"}
                                     value={!service.automatic_connection_allowed && !service.access_allowed_for_all}
                                     onChange={() => true}
                        />
                        <RadioButton label={I18n.t("models.serviceOrganisations.permissions.allowAllRequests")}
                                     name={"permissions"}
                                     value={service.access_allowed_for_all}
                                     onChange={() => this.doToggleAccessAllowedForAll(service)}
                        />
                        <RadioButton label={I18n.t("models.serviceOrganisations.permissions.allowAll")}
                                     name={"permissions"}
                                     value={service.automatic_connection_allowed}
                                     onChange={() => toggleAutomaticConnectionAllowed(service.id, service.automatic_connection_allowed)
                                         .then(() => this.props.refresh(() => {
                                             this.componentDidMount();
                                             setFlash(I18n.t("service.flash.updated", {name: service.name}));
                                         }))}
                        />
                    </div>}
                    {service.non_member_users_access_allowed && <div className={"radio-button-container"}>
                        <span>{I18n.t("models.serviceOrganisations.serviceNonMemberUsersAccessAllowed")}</span>
                    </div>}
                </div>
                <Entities entities={availableOrganisations}
                          modelName="serviceOrganisations"
                          searchAttributes={["name"]}
                          defaultSort="name"
                          hideTitle={true}
                          columns={columns}
                          loading={false}
                          {...this.props}>
                </Entities>
            </div>
        )
    }

}

export default ServiceOrganisations;
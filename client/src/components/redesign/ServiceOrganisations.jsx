import React from "react";
import "./ServiceOrganisations.scss";
import {isEmpty, removeDuplicates, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import {
    disallowOrganisation,
    onRequestOrganisation,
    toggleAccessAllowedForAll,
    toggleAutomaticConnectionAllowed, toggleCRMOrganisationUsersAccessAllowed,
    toggleNonMemberUsersAccessAllowed,
    toggleOverrideAccessAllowedAllConnections,
    toggleReset,
    trustOrganisation
} from "../../api";
import {ReactComponent as ConnectionAllowedIcon} from "@surfnet/sds/icons/illustrative-icons/hr.svg";
import {ReactComponent as NoConnectionIcon} from "@surfnet/sds/icons/functional-icons/allowance-no-talking.svg";
import {clearFlash, setFlash} from "../../utils/Flash";
import Logo from "./Logo";
import ConfirmationDialog from "../ConfirmationDialog";
import {BlockSwitchChoice, Chip, SegmentedControl} from "@surfnet/sds";
import {ALWAYS, DISALLOW, ON_REQUEST, PERMISSION_OPTIONS} from "../../utils/Permissions";
import SpinnerField from "./SpinnerField";
import {chipType} from "../../utils/UserRole";
import {
    ALL_ALLOWED,
    ALL_INSTITUTIONS,
    connectionAllowed,
    connectionSetting,
    DIRECT_CONNECTION,
    institutionAccess,
    IT_DEPENDS,
    MANUALLY_APPROVE,
    NO_ONE_ALLOWED,
    NONE_INSTITUTIONS,
    SELECTED_INSTITUTION,
    SELECTED_INSTITUTION_AND_ORGANISATION,
    SOME_INSTITUTIONS
} from "../../utils/ServiceConnectionSettings";


class ServiceOrganisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            connectionAllowedValue: "",
            institutionAccessValue: "",
            connectionSettingValue: "",
            confirmationDialogOpen: false,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationDialogAction: undefined,
            disallowedOrganisation: null,
            loading: false
        }
    }

    componentDidMount = callback => {
        const {service} = this.props;
        const connectionAllowedValue = connectionAllowed(service);
        const institutionAccessValue = institutionAccess(service);
        const connectionSettingValue = connectionSetting(service);
        this.setState({
            connectionAllowedValue: connectionAllowedValue,
            institutionAccessValue: institutionAccessValue,
            connectionSettingValue: connectionSettingValue
        }, callback)
    }

    openOrganisation = organisation => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/organisations/${organisation.id}`);
    };

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

    permissionOptions = (organisation, service, connectionSettingValue, serviceAdmin) => {
        const allowed = service.allowed_organisations.some(org => org.id === organisation.id)
        const always = service.automatic_connection_allowed_organisations.some(org => org.id === organisation.id)
            || (allowed && service.automatic_connection_allowed)
        const options = PERMISSION_OPTIONS.filter(option => {
            if (service.automatic_connection_allowed) {
                return option !== ON_REQUEST;
            } else if (connectionSettingValue === MANUALLY_APPROVE) {
                return option !== ALWAYS;
            }
            if (service.access_allowed_for_all) {
                return option !== DISALLOW;
            }
            return true;
        });
        return (
            <SegmentedControl onClick={option => this.changePermission(organisation, option)}
                              options={options}
                              disabled={!serviceAdmin}
                              optionLabelResolver={option => I18n.t(`models.serviceOrganisations.options.${option}`)}
                              option={always ? ALWAYS : allowed ? PERMISSION_OPTIONS[1] : PERMISSION_OPTIONS[0]}
            />
        );
    }

    doDisallow = (organisation, showConfirmation = true, accessToNone = false) => {
        const {service} = this.props;
        const collAffected = this.getAffectedEntities(organisation, service);
        if (showConfirmation && collAffected.length > 0) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => {
                    this.setState({confirmationDialogOpen: false});
                    this.doDisallow(organisation, false, accessToNone);
                },
                disallowedOrganisation: organisation
            });
        } else {
            this.setState({loading: true});
            const organisations = Array.isArray(organisation) ? organisation : [organisation];
            const promises = accessToNone ? [toggleReset(service.id)] :
                organisations.map(org => disallowOrganisation(service.id, org.id));
            Promise.all(promises)
                .then(() => this.refreshService(accessToNone ? () => this.setState({connectionAllowedValue: NO_ONE_ALLOWED}) : null));
        }
    }

    renderConfirmation = (service, disallowedOrganisation) => {
        const collAffected= this.getAffectedEntities(disallowedOrganisation, service);
        const collAffectedUnique = removeDuplicates(collAffected, "id");
        return (
            <div className="allowed-organisations-confirmation">
                <p>{I18n.t("models.serviceOrganisations.disableAccessConsequences")}</p>
                <ul>
                    {collAffectedUnique.map(coll => <li key={coll.id}>{coll.name}
                        <span>{` - ${I18n.t("models.serviceOrganisations.collaboration")}`}</span>
                    </li>)
                    }
                </ul>
            </div>
        );
    }

    refreshService = callback => {
        this.props.refresh(() => {
            this.setState({loading: false}, () => this.componentDidMount(callback));
            setFlash(I18n.t("service.flash.updated", {name: this.props.service.name}));
        });
    }

    getAffectedEntities = (organisations, service) => {
        organisations = Array.isArray(organisations) ? organisations : [organisations];
        const organisationIdentifiers = organisations.map(org => org.id);
        return service.collaborations.filter(coll => organisationIdentifiers.includes(coll.organisation_id));
    }

    setConnectionAccessValue = value => {
        const {service, organisations} = this.props;
        switch (value) {
            case SELECTED_INSTITUTION: {
                toggleNonMemberUsersAccessAllowed(service.id, false)
                    .then(() =>
                        this.props.refresh(() => {
                            this.componentDidMount(() => this.setState({connectionAllowedValue: value}));
                            setFlash(I18n.t("service.flash.updated", {name: service.name}));
                        })
                    )
                break;
            }
            case SELECTED_INSTITUTION_AND_ORGANISATION: {
                toggleCRMOrganisationUsersAccessAllowed(service.id, true)
                    .then(() =>
                        this.props.refresh(() => {
                            this.componentDidMount(() => this.setState({connectionAllowedValue: value}));
                            setFlash(I18n.t("service.flash.updated", {name: service.name}));
                        })
                    )
                break;
            }
            case NO_ONE_ALLOWED: {
                this.doDisallow(organisations, true, true);
                break;
            }
            case ALL_ALLOWED: {
                toggleNonMemberUsersAccessAllowed(service.id, true)
                    .then(() =>
                        this.props.refresh(() => {
                            this.componentDidMount(() => this.setState({connectionAllowedValue: value}));
                            setFlash(I18n.t("service.flash.updated", {name: service.name}));
                        })
                    );
                break;
            }
            default:
                throw new Error("Unknown connection access value")
        }
    }

    setInstitutionAccessValue = value => {
        const {service} = this.props;
        this.setState({loading: true});
        switch (value) {
            case ALL_INSTITUTIONS:
            case SOME_INSTITUTIONS: {
                toggleAccessAllowedForAll(service.id, value === ALL_INSTITUTIONS)
                    .then(() => this.refreshService(() => this.setState({institutionAccessValue: value})));
                break;
            }
            case NONE_INSTITUTIONS: {
                const organisations = (service.automatic_connection_allowed_organisations || []).concat(service.allowed_organisations || []);
                const collAffected = this.getAffectedEntities(organisations, service);
                if (collAffected.length > 0) {
                    this.setState({
                        confirmationDialogOpen: true,
                        confirmationDialogAction: () => {
                            this.setState({confirmationDialogOpen: false});
                            toggleOverrideAccessAllowedAllConnections(service.id, true)
                                .then(() => this.refreshService(() => this.setState({institutionAccessValue: value})));
                        },
                        disallowedOrganisation: organisations
                    });
                } else {
                    toggleOverrideAccessAllowedAllConnections(service.id, true)
                        .then(() => this.refreshService(() => this.setState({institutionAccessValue: value})));
                }
                break;
            }
            default:
                throw new Error("Unknown institution access value")
        }
    }

    setConnectionSettingValue = value => {
        const {service} = this.props;
        const automaticConnectionAllowed = DIRECT_CONNECTION === value;
        this.setState({loading: true});
        toggleAutomaticConnectionAllowed(service.id, automaticConnectionAllowed, value)
            .then(() => this.refreshService(() => this.setState({connectionSettingValue: value})));
    }

    render() {
        const {
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, loading, disallowedOrganisation,
            connectionAllowedValue, institutionAccessValue, connectionSettingValue
        } = this.state;
        const {organisations, service, user, userAdmin, serviceAdmin, showServiceAdminView} = this.props;
        const availableOrganisations = service.allow_restricted_orgs ? organisations : organisations.filter(org => !org.services_restricted);
        const columns = [
            {
                nonSortable: true,
                key: "permissions",
                header: I18n.t("models.serviceOrganisations.options.header"),
                mapper: org => this.permissionOptions(org, service, connectionSettingValue, serviceAdmin)
            },
            {
                key: "name",
                header: I18n.t("models.organisations.name"),
                mapper: org => userAdmin ?
                    <a href={`/organisations/${org.id}`}
                       className={"neutral-appearance"}
                       onClick={this.openOrganisation(org)}>{org.name}</a> :
                    <span>{org.name}</span>,
            },
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: org => <Logo src={org.logo}/>
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
                    return cm ? <Chip label={I18n.t(`profile.${cm.role}`)}
                                      type={chipType(cm)}/> : null;
                }
            },
            {
                key: "category",
                header: I18n.t("models.organisations.category")
            }]
        const connectionAllowedChoices = [
            {
                value: SELECTED_INSTITUTION,
                title: I18n.t("service.connectionSettings.coMembers"),
                text: I18n.t("service.connectionSettings.institutionSelection"),
                icon: <ConnectionAllowedIcon/>
            },
            !isEmpty(service.organisation_name) && {
                value: SELECTED_INSTITUTION_AND_ORGANISATION,
                title: I18n.t("service.connectionSettings.crmOrganisationMembers"),
                text: service.organisation_name,
                icon: <ConnectionAllowedIcon/>
            },
            {
                value: NO_ONE_ALLOWED,
                title: I18n.t("service.connectionSettings.noOne"),
                text: I18n.t("service.connectionSettings.later"),
                icon: <NoConnectionIcon/>
            }
        ].filter(choice => choice !== false)

        if ((userAdmin && !showServiceAdminView) || connectionAllowedValue === ALL_ALLOWED) {
            connectionAllowedChoices.push({
                value: ALL_ALLOWED,
                title: I18n.t("service.connectionSettings.everyOne"),
                text: I18n.t("service.connectionSettings.everyOneText"),
                icon: null
            })
        }
        const institutionAccessChoices = [
            {
                value: ALL_INSTITUTIONS,
                title: I18n.t("service.connectionSettings.allInstitutions"),
                text: I18n.t("service.connectionSettings.allCOWelcome"),
                icon: <ConnectionAllowedIcon/>
            },
            {
                value: SOME_INSTITUTIONS,
                title: I18n.t("service.connectionSettings.onlySome"),
                text: I18n.t("service.connectionSettings.specificInstitutions"),
                icon: <NoConnectionIcon/>
            }
        ]
        if (service.non_member_users_access_allowed) {
            institutionAccessChoices.push({
                value: NONE_INSTITUTIONS,
                title: I18n.t("service.connectionSettings.none"),
                text: I18n.t("service.connectionSettings.noneText"),
                icon: null //<ConfigIcon/>
            })
        }

        const connectionSettingChoices = [
            {
                value: DIRECT_CONNECTION,
                title: I18n.t("forms.yes"),
                text: I18n.t("service.connectionSettings.directConnect"),
                icon: <ConnectionAllowedIcon/>
            },
            {
                value: MANUALLY_APPROVE,
                title: I18n.t("forms.no"),
                text: I18n.t("service.connectionSettings.manuallyApprove"),
                icon: <NoConnectionIcon/>
            },
            {
                value: IT_DEPENDS,
                title: I18n.t("service.connectionSettings.depends"),
                text: I18n.t("service.connectionSettings.settingsPerInstitution"),
                icon: null //<ConfigIcon/>
            }
        ]
        const showEntities = connectionAllowedValue !== NO_ONE_ALLOWED
            && institutionAccessValue !== NONE_INSTITUTIONS
            && (institutionAccessValue === SOME_INSTITUTIONS || connectionSettingValue === IT_DEPENDS);
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

                    <div className={`options-container ${showEntities ? "" : "no-entities"}`}>
                        <div>
                            <h4>{I18n.t("service.connectionSettings.connectQuestion")}</h4>
                            <BlockSwitchChoice value={connectionAllowedValue}
                                               items={connectionAllowedChoices}
                                               disabled={!serviceAdmin || (connectionAllowedValue === ALL_ALLOWED && !userAdmin)}
                                               setValue={this.setConnectionAccessValue}/>
                        </div>
                        {connectionAllowedValue !== NO_ONE_ALLOWED && <div>
                            <h4>{I18n.t("service.connectionSettings.whichInstitutionsQuestion")}</h4>
                            <BlockSwitchChoice value={institutionAccessValue}
                                               items={institutionAccessChoices}
                                               disabled={!serviceAdmin}
                                               setValue={this.setInstitutionAccessValue}/>
                        </div>}
                        {(connectionAllowedValue !== NO_ONE_ALLOWED && institutionAccessValue !== NONE_INSTITUTIONS) &&
                            <div>
                                <h4>{I18n.t("service.connectionSettings.directlyConnectQuestion")}</h4>
                                <BlockSwitchChoice value={connectionSettingValue}
                                                   items={connectionSettingChoices}
                                                   disabled={!serviceAdmin}
                                                   setValue={this.setConnectionSettingValue}/>
                            </div>}
                    </div>
                {(service.non_member_users_access_allowed && (!userAdmin || showServiceAdminView)) &&
                    <div className={"options-container radio-button-container"}>
                        <span>{I18n.t("service.nonMemberUsersAccessAllowedTooltip")}</span>
                    </div>}
                {showEntities &&
                    <Entities entities={availableOrganisations}
                              modelName="serviceOrganisations"
                              searchAttributes={["name"]}
                              defaultSort="name"
                              columns={columns}
                              loading={false}
                              {...this.props}/>}
            </div>
        )
    }

}

export default ServiceOrganisations;
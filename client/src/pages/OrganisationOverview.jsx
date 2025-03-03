import React from "react";
import {
    deleteOrganisation,
    organisationNameExists,
    organisationSchacHomeOrganisationExists,
    organisationShortNameExists,
    updateOrganisation
} from "../api";
import I18n from "../locale/I18n";
import "./OrganisationOverview.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {sanitizeShortName, validSchacHomeRegExp, validUrlRegExp} from "../validations/regExps";
import SpinnerField from "../components/redesign/SpinnerField";
import {isUserAllowed, ROLES} from "../utils/UserRole";
import Button from "../components/Button";
import InputField from "../components/InputField";
import ErrorIndicator from "../components/redesign/ErrorIndicator";
import {OrganisationUnits} from "../components/OrganisationUnits";
import SelectField from "../components/SelectField";
import CheckBox from "../components/CheckBox";
import CreatableField from "../components/CreatableField";
import CroppedImageField from "../components/redesign/CroppedImageField";

const toc = ["about", "units", "labels", "messaging", "settings"];

class OrganisationOverview extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.categoryOptions = props.config.organisation_categories.map(c => ({value: c, label: c}));
        this.state = {
            required: ["name", "short_name", "logo"],
            currentTab: "about",
            invalidInputs: {},
            alreadyExists: {},
            duplicatedUnit: false,
            initial: true,
            isNew: true,
            organisation: null,
            confirmationDialogOpen: false,
            warning: false,
            invalid_schac_home_organisation: null,
            schac_home_organisation: "",
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            loading: true
        };
    }

    UNSAFE_componentWillReceiveProps = nextProps => {
        const {organisation} = this.props;
        if (organisation !== nextProps.organisation) {
            this.componentDidMount(nextProps);
        }
    }

    componentDidMount = nextProps => {
        const {organisation} = nextProps ? nextProps : this.props;
        const {params} = this.props.match;
        let tab = params.subTab || this.state.currentTab;
        if (!toc.includes(tab)) {
            tab = this.state.currentTab;
        }
        this.validateOrganisation(organisation, () => {
            this.setState({
                organisation: {...organisation},
                currentTab: tab,
                loading: false
            });
        });
    };

    validateOrganisation = (organisation, callback) => {
        const invalidInputs = {};
        this.setState({invalidInputs: invalidInputs}, callback);
    }

    existingOrganisationAttribute = attr => this.state.isNew ? null : this.state.organisation[attr];

    validateOrganisationName = e =>
        organisationNameExists(e.target.value, this.existingOrganisationAttribute("name")).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateOrganisationShortName = e =>
        organisationShortNameExists(sanitizeShortName(e.target.value), this.existingOrganisationAttribute("short_name")).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    removeValue = value => e => {
        stopEvent(e);
        const {organisation, alreadyExists} = this.state;
        const {schac_home_organisations} = organisation;
        const newSchac_home_organisations = schac_home_organisations.filter(val => val.name !== value.name);
        if (!isEmpty(newSchac_home_organisations)) {
            const existingOrganisationId = organisation.id;
            Promise.all(newSchac_home_organisations.map(org => organisationSchacHomeOrganisationExists(org.name, existingOrganisationId)))
                .then(res => {
                    const anyInvalid = res.filter(b => b);
                    this.setState({
                        organisation: {...organisation, schac_home_organisations: newSchac_home_organisations},
                        invalid_schac_home_organisation: null,
                        alreadyExists: {
                            ...alreadyExists,
                            schac_home_organisations: isEmpty(anyInvalid) ? null : anyInvalid
                        }
                    });
                })
        } else {
            this.setState({
                organisation: {...organisation, schac_home_organisations: []},
                invalid_schac_home_organisation: null,
                alreadyExists: {...alreadyExists, schac_home_organisations: null}
            });
        }
    };

    addValue = e => {
        stopEvent(e);
        const schac_home_organisation = e.target.value;
        const {organisation, alreadyExists} = this.state;
        const {schac_home_organisations} = organisation;
        if (!isEmpty(schac_home_organisation)) {
            const invalid = !validSchacHomeRegExp.test(schac_home_organisation.trim());
            const duplicate = schac_home_organisations.find(sho => sho.name === schac_home_organisation.trim().toLowerCase());
            if (invalid || duplicate) {
                const invalid_schac_home_organisation = I18n.t(`organisation.${invalid ? "invalidSchacHome" : "duplicateSchacHome"}`,
                    {schac: schac_home_organisation.trim()});
                this.setState({invalid_schac_home_organisation: invalid_schac_home_organisation});
            } else {
                const existingOrganisationId = organisation.id;
                schac_home_organisations.push({name: schac_home_organisation.toLowerCase()});
                organisationSchacHomeOrganisationExists(schac_home_organisation, existingOrganisationId).then(schacHomeOrganisationExists => {
                    let existingSchacHomes = alreadyExists.schac_home_organisations;
                    if (schacHomeOrganisationExists) {
                        existingSchacHomes = existingSchacHomes || [];
                        existingSchacHomes.push(schac_home_organisation);
                    }
                    this.setState({
                        schac_home_organisation: "",
                        organisation: {...organisation, schac_home_organisations: [...schac_home_organisations]},
                        alreadyExists: {...alreadyExists, schac_home_organisations: existingSchacHomes}
                    });
                });
            }
        } else {
            this.setState({schac_home_organisation: ""});
        }
        return true;
    };

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            warning: false,
            cancelDialogAction: () => this.props.history.goBack(),
            leavePage: true
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisation.deleteConfirmation"),
            confirmationDialogAction: this.doDelete,
            warning: true,
            leavePage: false
        });
    };

    doDelete = () => {
        this.setState({confirmationDialogOpen: false});
        deleteOrganisation(this.state.organisation.id)
            .then(() => {
                this.props.history.push("/home/organisations");
                setFlash(I18n.t("organisationDetails.flash.deleted", {name: this.state.organisation.name}));
            });
    };

    isValid = () => {
        const {required, alreadyExists, administrators, isNew, duplicatedUnit, invalidInputs} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]))
            || duplicatedUnit || Object.keys(invalidInputs).some(key => invalidInputs[key]);
        return !inValid && (!isNew || !isEmpty(administrators));
    };

    submit = () => {
        const {initial, isNew} = this.state;
        const action = isNew ? this.doSubmit : this.doUpdate;
        if (initial) {
            this.setState({initial: false}, action)
        } else {
            action()
        }
    };

    doUpdate = () => {
        if (this.isValid()) {
            const {
                organisation
            } = this.state;
            this.setState({loading: true});
            organisation.units = organisation.units.filter(unit => !isEmpty(unit.name));
            updateOrganisation(organisation)
                .then(() => {
                    this.props.history.goBack();
                    setFlash(I18n.t("organisationDetails.flash.updated", {name: name}));
                })
                .catch(() => this.setState({loading: false}));
        } else {
            window.scrollTo(0, 0);
        }
    };

    renderAbout = (user, organisation, disabledSubmit, invalidInputs, initial, alreadyExists) => {
        return (
            <>
                <h3 className="section-separator">{I18n.t("organisationDetails.headers.about")}</h3>

                <InputField value={organisation.name} onChange={e => {
                    this.setState({
                        organisation: {...this.state.organisation, name: e.target.value},
                        alreadyExists: {...this.state.alreadyExists, name: false}
                    })
                }}
                            placeholder={I18n.t("organisation.namePlaceHolder")}
                            onBlur={this.validateOrganisationName}
                            error={alreadyExists.name || (!initial && isEmpty(name))}
                            name={I18n.t("organisation.name")}
                            required={true}
                />
                {alreadyExists.name && <ErrorIndicator msg={I18n.t("organisation.alreadyExists", {
                    attribute: I18n.t("organisation.name").toLowerCase(),
                    value: organisation.name
                })}/>}
                {(!initial && isEmpty(organisation.name)) && <ErrorIndicator msg={I18n.t("organisation.required", {
                    attribute: I18n.t("organisation.name").toLowerCase()
                })}/>}

                <CroppedImageField name="logo"
                                   onChange={s => this.setState({
                                       organisation: {
                                           ...this.state.organisation,
                                           logo: s
                                       }
                                   })}
                                   isNew={false}
                                   title={I18n.t("organisation.logo")}
                                   value={organisation.logo}
                                   initial={initial}
                                   secondRow={true}/>

                <InputField value={organisation.short_name}
                            name={I18n.t("organisation.shortName")}
                            placeholder={I18n.t("organisation.shortNamePlaceHolder")}
                            onBlur={this.validateOrganisationShortName}
                            disabled={!user.admin}
                            onChange={e => this.setState({
                                organisation: {
                                    ...this.state.organisation,
                                    short_name: sanitizeShortName(e.target.value)
                                },
                                alreadyExists: {...this.state.alreadyExists, short_name: false}
                            })}
                            error={alreadyExists.short_name || (!initial && isEmpty(organisation.short_name))}
                            toolTip={I18n.t("organisation.shortNameTooltip")}
                            required={true}
                />
                {alreadyExists.short_name && <ErrorIndicator msg={I18n.t("organisation.alreadyExists", {
                    attribute: I18n.t("organisation.shortName").toLowerCase(),
                    value: organisation.short_name
                })}/>}
                {(!initial && isEmpty(organisation.short_name)) &&
                    <ErrorIndicator msg={I18n.t("organisation.required", {
                        attribute: I18n.t("organisation.shortName").toLowerCase()
                    })}/>}

                <InputField value={organisation.description}
                            onChange={e => this.setState({
                                organisation: {...this.state.organisation, description: e.target.value}
                            })}
                            placeholder={I18n.t("organisation.descriptionPlaceholder")}
                            multiline={true}
                            name={I18n.t("organisation.description")}/>

                <InputField value={organisation.accepted_user_policy}
                            onChange={e => this.setState({
                                organisation: {...this.state.organisation, accepted_user_policy: e.target.value}
                            })}
                            placeholder={I18n.t("organisation.accepted_user_policyPlaceholder")}
                            externalLink={true}
                            error={invalidInputs.accepted_user_policy}
                            toolTip={I18n.t("organisation.accepted_user_policyTooltip")}
                            name={I18n.t("service.accepted_user_policy")}
                            onBlur={this.validateURI("accepted_user_policy")}/>
                {invalidInputs["accepted_user_policy"] &&
                    <ErrorIndicator
                        msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}

            </>
        );
    }

    renderUnits = organisation => {
        return (
            <>
                <h3 className="section-separator">{I18n.t("organisationDetails.headers.units")}</h3>
                <p>{I18n.t("organisationDetails.units.info")}</p>
                <OrganisationUnits units={organisation.units}
                                   setUnits={newUnits => this.setState({
                                       organisation: {
                                           ...this.state.organisation,
                                           units: newUnits
                                       }
                                   })}
                                   setDuplicated={duplicate => this.setState({duplicatedUnit: duplicate})}/>


            </>
        );
    }

    renderLabels = () => {
        return (
            <>
                <h3 className="section-separator">{I18n.t("organisationDetails.headers.labels")}</h3>
                <p>TODO</p>
            </>
        );
    }

    renderMessaging = () => {
        return (
            <>
                <h3 className="section-separator">{I18n.t("organisationDetails.headers.messaging")}</h3>
                <p>TODO</p>
            </>
        );
    }

    renderSettings = (user, organisation, disabledSubmit, invalidInputs, initial, alreadyExists, schac_home_organisation, invalid_schac_home_organisation) => {
        return (
            <>
                <h3 className="section-separator">{I18n.t("organisationDetails.headers.settings")}</h3>
                {user.admin && <SelectField value={organisation.category}
                                            small={true}
                                            options={this.categoryOptions}
                                            name={I18n.t("organisation.category")}
                                            onChange={e => this.setState({
                                                organisation: {
                                                    ...this.state.organisation,
                                                    category: e
                                                }
                                            })}/>}

                <CheckBox name={"services_restricted"}
                          value={organisation.services_restricted}
                          tooltip={I18n.t("organisation.servicesRestrictedTooltip")}
                          onChange={() => this.setState({
                              organisation: {
                                  ...this.state.organisation,
                                  services_restricted: !organisation.services_restricted
                              }
                          })}
                          info={I18n.t("organisation.servicesRestricted")}
                          readOnly={!user.admin}
                />

                {user.admin && <InputField value={organisation.crm_id}
                                           onChange={e => this.setState({
                                               organisation: {
                                                   ...this.state.organisation,
                                                   crm_id: e.target.value
                                               }
                                           })}
                                           placeholder={I18n.t("organisation.crmIdPlaceholder")}
                                           name={I18n.t("organisation.crmId")}/>}

                <CreatableField onChange={e => this.setState({
                    schac_home_organisation: e.target.value,
                    invalid_schac_home_organisation: null
                })}
                                name={I18n.t("organisation.schacHomeOrganisation")}
                                value={schac_home_organisation}
                                values={organisation.schac_home_organisations}
                                addValue={this.addValue}
                                removeValue={this.removeValue}
                                disabled={!user.admin}
                                toolTip={I18n.t("organisation.schacHomeOrganisationTooltip")}
                                placeholder={I18n.t("organisation.schacHomeOrganisationPlaceholder")}
                                error={alreadyExists.schac_home_organisations}/>

                {alreadyExists.schac_home_organisations &&
                    alreadyExists.schac_home_organisations.map(sho =>
                        <ErrorIndicator key={sho} msg={I18n.t("organisation.alreadyExists", {
                            attribute: I18n.t("organisation.schacHomeOrganisation").toLowerCase(),
                            value: sho
                        })}/>
                    )}
                {invalid_schac_home_organisation && <ErrorIndicator msg={invalid_schac_home_organisation}/>}
                <p className={"label"}>{I18n.t("organisationDetails.permissions")}</p>
                <CheckBox name={"collaboration_creation_allowed"}
                          value={organisation.collaboration_creation_allowed}
                          tooltip={I18n.t("organisation.collaborationCreationAllowedTooltip")}
                          onChange={() => this.setState({
                              organisation: {
                                  ...organisation,
                                  collaboration_creation_allowed: !organisation.collaboration_creation_allowed
                              }
                          })}
                          info={I18n.t("organisation.collaborationCreationAllowed")}
                          readOnly={isEmpty(organisation.schac_home_organisations)}
                />

                {(user.admin || organisation.service_connection_requires_approval) &&
                    <CheckBox name={"service_connection_requires_approval"}
                              value={organisation.service_connection_requires_approval}
                              tooltip={I18n.t("organisation.serviceConnectionRequiresApprovalTooltip")}
                              onChange={() => this.setState({
                                  organisation: {
                                      ...organisation,
                                      service_connection_requires_approval: !organisation.service_connection_requires_approval
                                  }
                              })}
                              info={I18n.t("organisation.serviceConnectionRequiresApproval")}
                              readOnly={!user.admin}
                    />}


            </>
        );
    }

    renderCurrentTab = (currentTab, user, organisation, disabledSubmit, invalidInputs, initial, alreadyExists, schac_home_organisation, invalid_schac_home_organisation) => {
        switch (currentTab) {
            case "about":
                return this.renderAbout(user, organisation, disabledSubmit, invalidInputs, initial, alreadyExists);
            case "units":
                return this.renderUnits(organisation);
            case "labels":
                return this.renderLabels(organisation);
            case "messaging":
                return this.renderMessaging(user, organisation, disabledSubmit, invalidInputs, initial);
            case "settings":
                return this.renderSettings(user, organisation, disabledSubmit, invalidInputs, initial, alreadyExists, schac_home_organisation, invalid_schac_home_organisation);
            default:
                throw new Error(`unknown-tab: ${currentTab}`);
        }
    }

    removeMail = email => e => {
        stopEvent(e);
        const {administrators} = this.state;
        const newAdministrators = administrators.filter(currentMail => currentMail !== email);
        this.setState({administrators: newAdministrators});
    };

    addEmails = emails => {
        const {administrators} = this.state;
        const uniqueEmails = [...new Set(administrators.concat(emails))];
        this.setState({administrators: uniqueEmails});
    };

    validateURI = name => e => {
        const uri = e.target.value;
        const {invalidInputs} = this.state;
        const inValid = !isEmpty(uri) && !validUrlRegExp.test(uri);
        this.setState({invalidInputs: {...invalidInputs, [name]: inValid}});
    };

    changeTab = tab => e => {
        stopEvent(e);
        this.setState({
            currentTab: tab,
        }, () => this.props.history.replace(`/organisations/${this.state.organisation.id}/overview/${tab}`));
    }

    sidebar = currentTab => {
        return (
            <div className={"side-bar"}>
                {/*<h3>{I18n.t("organisationDetails.details")}</h3>*/}
                <ul>
                    {toc.map(item => <li key={item} className={`${item === currentTab ? "active" : ""}`}>
                        <a href={`/${item}`}
                           className={`${item === currentTab ? "active" : ""} ${this.isValidTab(item) ? "" : "error"}`}
                           onClick={this.changeTab(item)}>{I18n.t(`organisationDetails.toc.${item}`)}</a>
                    </li>)}
                </ul>
            </div>);
    }

    getInvalidTabs = () => {
        const invalidTabs = toc.filter(item => !this.isValidTab(item))
            .map(item => I18n.t(`organisationDetails.toc.${item}`)).join(", ");
        if (invalidTabs.length > 0) {
            return I18n.t(`serviceDetails.updateDisabled`, {invalid: invalidTabs});
        }
        return null;
    }

    isValidTab = tab => {
        const {alreadyExists, invalidInputs, organisation, invalid_schac_home_organisation} = this.state;
        const {name, short_name} = organisation;

        switch (tab) {
            case "about":
                return !alreadyExists.name && !isEmpty(name) && !alreadyExists.short_name && !isEmpty(short_name) && !invalidInputs.accepted_user_policy;
            case "units":
                return true;
            case "labels":
                return true;
            case "messaging":
                return true;
            case "settings":
                return !invalid_schac_home_organisation && !alreadyExists.schac_home_organisations;
            default:
                throw new Error(`unknown-tab: ${tab}`);

        }
    }


    renderButtons = (isAdmin, disabledSubmit, currentTab) => {
        const invalidTabsMsg = this.getInvalidTabs();
        return <>
            <div className={"actions-container"}>
                {invalidTabsMsg && <span className={"error"}>{invalidTabsMsg}</span>}
                <section className="actions">
                    {(currentTab === "general") &&
                        <Button warningButton={true}
                                disabled={!isAdmin}
                                onClick={this.delete}/>}
                    <Button disabled={disabledSubmit || !isAdmin}
                            txt={I18n.t("service.update")}
                            onClick={this.submit}/>
                </section>
            </div>
        </>
    }


    render() {
        const {
            organisation,
            warning,
            loading,
            currentTab,
            schac_home_organisation,
            invalid_schac_home_organisation,
            initial,
            invalidInputs,
            alreadyExists,
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !initial && !this.isValid();
        const {user} = this.props;
        const isAdmin = isUserAllowed(ROLES.ORG_ADMIN, user, organisation.id);
        return (
            <div className="organisation-overview">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={warning}
                                    question={I18n.t("organisation.deleteConfirmation")}/>
                {this.sidebar(currentTab, isAdmin)}
                <div className={`organisation`}>
                    {this.renderCurrentTab(currentTab, user, organisation, disabledSubmit, invalidInputs, initial, alreadyExists, schac_home_organisation, invalid_schac_home_organisation)}
                    {this.renderButtons(isAdmin, disabledSubmit, currentTab, organisation, invalidInputs)}
                </div>

            </div>
        );
    }
}

export default OrganisationOverview;
import React from "react";
import {
    deleteService,
    ipNetworks,
    resetLdapPassword,
    resetTokenValue,
    serviceAbbreviationExists,
    serviceAupDelete,
    serviceEntityIdExists,
    serviceNameExists,
    updateService
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./ServiceOverview.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty, stopEvent} from "../utils/Utils";
import {sanitizeShortName, validEmailRegExp, validUrlRegExp} from "../validations/regExps";
import CheckBox from "../components/CheckBox";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import RadioButton from "../components/redesign/RadioButton";
import CroppedImageField from "../components/redesign/CroppedImageField";
import SpinnerField from "../components/redesign/SpinnerField";
import ErrorIndicator from "../components/redesign/ErrorIndicator";

class ServiceOverview extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {ip_networks: []},
            required: ["name", "entity_id", "abbreviation", "privacy_policy", "logo", "security_email"],
            alreadyExists: {},
            invalidInputs: {},
            confirmationDialogOpen: false,
            cancelDialogAction: () => true,
            confirmationDialogAction: () => true,
            confirmationTxt: null,
            confirmationHeader: null,
            ldapPassword: null,
            tokenValue: null,
            warning: false,
            isServiceAdmin: false,
            hasAdministrators: false,
            currentTab: "general",
        }
    }

    UNSAFE_componentWillReceiveProps = nextProps => {
        const {service} = this.props;
        if (service !== nextProps.service) {
            this.componentDidMount(nextProps);
        }
    }

    componentDidMount = nextProps => {
        const {service, serviceAdmin} = nextProps ? nextProps : this.props;
        const {params} = this.props.match;
        const tab = params.subTab || this.state.currentTab;
        this.validateService(service, () => {
            this.setState({
                service: {...service},
                hasAdministrators: service.service_memberships.length > 0,
                isServiceAdmin: serviceAdmin,
                currentTab: tab,
                loading: false
            }, () => {
                const {ip_networks} = this.state.service;
                if (isEmpty(ip_networks)) {
                    this.addIpAddress();
                } else {
                    Promise.all(ip_networks.map(n => ipNetworks(n.network_value, n.id)))
                        .then(res => {
                            this.setState({"service": {...this.state.service, "ip_networks": res}});
                        });
                }
            });
        })
    };

    mockEvent = value => ({target: {value: value}})

    validateService = (service, callback) => {
        const invalidInputs = {};
        ["security_email", "support_email", "email"].forEach(name => {
            invalidInputs[name] = !isEmpty(service[name]) && !validEmailRegExp.test(service[name]);
        });
        ["accepted_user_policy", "privacy_policy", "uri"].forEach(name => {
            invalidInputs[name] = !isEmpty(service[name]) && !validUrlRegExp.test(service[name]);
        })
        this.setState({invalidInputs: invalidInputs}, callback);
    }

    cancelDialogAction = () => {
        this.setState({confirmationDialogOpen: false},
            () => setTimeout(() => this.setState({ldapPassword: null, tokenValue: null}), 5)
        );
    }

    resetAups = showConfirmation => {
        const {service} = this.state;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                cancelDialogAction: this.cancelDialogAction,
                warning: true,
                confirmationDialogAction: () => this.resetAups(false),
                confirmationHeader: I18n.t("confirmationDialog.title"),
                lastAdminWarning: false,
                confirmationDialogQuestion: I18n.t("service.aup.confirmation", {name: service.name}),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
            });
        } else {
            this.setState({loading: true, confirmationDialogOpen: false});
            serviceAupDelete(service).then(() => {
                this.setState({loading: false});
                setFlash(I18n.t("service.aup.flash", {name: service.name}));
            });
        }
    }

    tokenResetAction = showConfirmation => {
        const {service} = this.state;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                cancelDialogAction: this.cancelDialogAction,
                warningf: false,
                confirmationDialogAction: () => this.tokenResetAction(false),
                confirmationHeader: I18n.t("confirmationDialog.title"),
                lastAdminWarning: false,
                confirmationDialogQuestion: I18n.t("userTokens.reset.confirmation", {name: service.name}),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
            });

        } else {
            resetTokenValue(service).then(res => {
                this.setState({
                    confirmationDialogOpen: true,
                    ldapPassword: null,
                    confirmationTxt: I18n.t("userTokens.reset.close"),
                    confirmationHeader: I18n.t("userTokens.reset.copy"),
                    cancelDialogAction: null,
                    confirmationDialogQuestion: I18n.t("userTokens.reset.info"),
                    tokenValue: res.token_value,
                    confirmationDialogAction: this.cancelDialogAction
                });
            })

        }
    }

    ldapResetAction = showConfirmation => {
        const {service} = this.state;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                cancelDialogAction: this.cancelDialogAction,
                confirmationDialogAction: () => this.ldapResetAction(false),
                warning: false,
                lastAdminWarning: false,
                confirmationHeader: I18n.t("confirmationDialog.title"),
                confirmationDialogQuestion: I18n.t("service.ldap.confirmation", {name: service.name}),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
            });

        } else {
            resetLdapPassword(service).then(res => {
                this.setState({
                    confirmationDialogOpen: true,
                    confirmationTxt: I18n.t("service.ldap.close"),
                    confirmationHeader: I18n.t("service.ldap.copy"),
                    cancelDialogAction: null,
                    confirmationDialogQuestion: I18n.t("service.ldap.info"),
                    ldapPassword: res.ldap_password,
                    tokenValue: null,
                    loading: false,
                    confirmationDialogAction: this.cancelDialogAction
                });
            })
        }
    }

    renderLdapPassword = ldapPassword => {
        return (
            <div className="ldap-password">
                <InputField copyClipBoard={true} disabled={true} value={ldapPassword}/>
            </div>
        );
    }

    validateServiceName = e =>
        serviceNameExists(e.target.value, this.props.service.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateServiceEntityId = e =>
        serviceEntityIdExists(e.target.value, this.props.service.entity_id).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, entity_id: json}});
        });

    validateServiceAbbreviation = e =>
        serviceAbbreviationExists(sanitizeShortName(e.target.value), this.props.service.abbreviation).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, abbreviation: json}});
        });

    validateEmail = name => e => {
        const email = e.target.value;
        const {invalidInputs} = this.state;
        const inValid = !isEmpty(email) && !validEmailRegExp.test(email);
        this.setState({invalidInputs: {...invalidInputs, [name]: inValid}});
    };

    validateURI = name => e => {
        const uri = e.target.value;
        const {invalidInputs} = this.state;
        const inValid = !isEmpty(uri) && !validUrlRegExp.test(uri);
        this.setState({invalidInputs: {...invalidInputs, [name]: inValid}});
    };

    validateIpAddress = index => e => {
        const currentIpNetwork = this.state.ip_networks[index];
        const address = e.target.value;
        if (!isEmpty(address)) {
            ipNetworks(address, currentIpNetwork.id)
                .then(res => {
                    const {ip_networks} = this.state.service;
                    ip_networks.splice(index, 1, res);
                    this.setState({...this.state.service, ip_networks: [...ip_networks]});
                });
        }
    }

    saveIpAddress = index => e => {
        const {ip_networks} = this.state.service;
        const network = ip_networks[index];
        network.network_value = e.target.value;
        ip_networks.splice(index, 1, network)
        this.setState({...this.state.service, ip_networks: [...ip_networks]});
    }

    addIpAddress = () => {
        const {ip_networks} = this.state.service;
        ip_networks.push({network_value: ""});
        this.setState({...this.state.service, ip_networks: [...ip_networks]});
    }

    deleteIpAddress = index => {
        const {ip_networks} = this.state.service;
        ip_networks.splice(index, 1);
        this.setState({...this.state.service, ip_networks: [...ip_networks]});
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    delete = () => {
        const {service} = this.state;
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            confirmationDialogQuestion: I18n.t("service.deleteConfirmation", {name: service.name}),
            warning: true,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationHeader: I18n.t("confirmationDialog.title"),
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        this.setState({loading: true});
        const {service} = this.state;
        deleteService(service.id).then(() => {
            setFlash(I18n.t("service.flash.deleted", {name: service.name}));
            this.props.history.push("/home");
        });
    };

    isValid = () => {
        const {required, alreadyExists, invalidInputs, hasAdministrators, service}
            = this.state;
        const {contact_email, ip_networks} = service;
        const inValid = Object.values(alreadyExists).some(val => val) ||
            required.some(attr => isEmpty(service[attr])) ||
            Object.keys(invalidInputs).some(key => invalidInputs[key]);
        const contactEmailRequired = !hasAdministrators && isEmpty(contact_email);
        const invalidIpNetworks = ip_networks.some(ipNetwork => ipNetwork.error || (ipNetwork.version === 6 && !ipNetwork.global));
        return !inValid && !contactEmailRequired && !invalidIpNetworks;
    };

    isValidTab = tab => {
        const {alreadyExists, invalidInputs, hasAdministrators, service}
            = this.state;
        const {contact_email, ip_networks} = service;
        const contactEmailRequired = !hasAdministrators && isEmpty(contact_email);
        const invalidIpNetworks = ip_networks.some(ipNetwork => ipNetwork.error || (ipNetwork.version === 6 && !ipNetwork.global));

        switch (tab) {
            case "general":
                return !isEmpty(service.name) && !alreadyExists.name && !isEmpty(service.abbreviation)
                    && !alreadyExists.abbreviation && !isEmpty(service.logo) && !invalidInputs.uri;
            case "connection":
                return !isEmpty(service.entity_id) && !alreadyExists.entity_id;
            case "contacts":
                return !isEmpty(service.security_email) && !contactEmailRequired &&
                    !invalidInputs.email && !invalidInputs.security_email && !invalidInputs.support_email
            case "policy":
                return !isEmpty(service.privacy_policy) && !invalidInputs.privacy_policy && !invalidInputs.accepted_user_policy;
            case "ldap":
                return !invalidIpNetworks;
            case "tokens":
            case "pamWebLogin":
                return true;
            default:
                throw new Error("unknown-tab")
        }
    };

    submit = () => {
        if (this.isValid()) {
            this.setState({loading: true});
            const {service} = this.state;
            const {name, ip_networks} = service;
            const strippedIpNetworks = ip_networks
                .filter(network => network.network_value && network.network_value.trim())
                .map(network => ({network_value: network.network_value, id: network.id}));
            // Prevent deletion / re-creation of existing IP Network
            strippedIpNetworks.forEach(network => {
                if (isEmpty(network.id)) {
                    delete network.id;
                } else {
                    network.id = parseInt(network.id, 10)
                }
            });
            this.setState({service: {...service, ip_networks: strippedIpNetworks}}, () => {
                updateService(this.state.service).then(() => this.afterUpdate(name, "updated"));
            });
        } else {
            window.scrollTo(0, 0);
        }
    };

    afterUpdate = (name, action) => {
        setFlash(I18n.t(`service.flash.${action}`, {name: name}));
        this.setState({loading: false});
        this.props.refresh();
    };

    changeTab = tab => e => {
        stopEvent(e);
        this.setState({currentTab: tab}, () =>
            this.props.history.replace(`/services/${this.state.service.id}/details/${tab}`));
    }

    sidebar = currentTab => {
        const toc = ["general", "connection", "contacts", "policy", "ldap", "tokens", "pamWebLogin"];
        return (
            <div className={"side-bar"}>
                <h3>{I18n.t("serviceDetails.details")}</h3>
                <ul>
                    {toc.map(item => <li key={item}>
                        <a href={`/${item}`}
                           className={`${item === currentTab ? "active" : ""} ${this.isValidTab(item) ? "" : "error"}`}
                           onClick={this.changeTab(item)}>{I18n.t(`serviceDetails.toc.${item}`)}</a>
                    </li>)}
                </ul>
            </div>
        );
    }

    changeServiceProperty = (name, checkedBox = false, alreadyExists = this.state.alreadyExists, invalidInputs = this.state.invalidInputs) => e => {
        const {service} = this.state;
        let value = checkedBox ? e.target.checked : e.target.value;
        if (name === "abbreviation") {
            value = sanitizeShortName(value);
        }
        this.setState({alreadyExists, invalidInputs, "service": {...service, [name]: value}});
    }


    renderButtons = (isAdmin, isServiceAdmin, disabledSubmit, currentTab, showServiceAdminView) => {
        const {accepted_user_policy} = this.state.service;
        const validAcceptedUserPolicy = validUrlRegExp.test(accepted_user_policy);
        return <>
            {(isAdmin || isServiceAdmin) &&
            <section className="actions">
                {(isAdmin && currentTab === "general" && !showServiceAdminView) &&
                <Button warningButton={true} txt={I18n.t("service.delete")}
                        onClick={this.delete}/>}
                {currentTab === "policy" &&
                <Button txt={I18n.t("service.aup.title")}
                        disabled={!validAcceptedUserPolicy}
                        onClick={() => this.resetAups(true)}/>}
                {currentTab === "tokens" &&
                <Button txt={I18n.t("userTokens.actionTitle")}
                        onClick={() => this.tokenResetAction(true)}/>}
                {currentTab === "ldap" &&
                <Button txt={I18n.t("service.ldap.title")}
                        onClick={() => this.ldapResetAction(true)}/>}
                <Button disabled={disabledSubmit} txt={I18n.t("service.update")}
                        onClick={this.submit}/>
            </section>}
        </>
    }

    renderPamWebLogin = (service, isAdmin, showServiceAdminView) => {
        return (
            <div className={"pamWebLogin"}>
                <RadioButton label={I18n.t("userTokens.pamWebSSOEnabled")}
                             name={"pam_web_sso_enabled"}
                             value={service.pam_web_sso_enabled}
                             disabled={!isAdmin || showServiceAdminView}
                             tooltip={I18n.t("userTokens.pamWebSSOEnabledTooltip")}
                             onChange={val => this.setState({"service": {...service, pam_web_sso_enabled: val}})}/>
            </div>)
    }

    renderTokens = (config, service, isAdmin) => {
        return (
            <div className={"tokens"}>
                <RadioButton label={I18n.t("userTokens.tokenEnabled")}
                             name={"token_enabled"}
                             value={service.token_enabled}
                             disabled={!isAdmin}
                             tooltip={I18n.t("userTokens.tokenEnabledTooltip")}
                             onChange={val => this.setState({
                                 "service": {
                                     ...service,
                                     token_enabled: val,
                                     token_validity_days: val ? 1 : ""
                                 }
                             })}/>

                <InputField value={service.token_validity_days}
                            name={I18n.t("userTokens.tokenValidityDays")}
                            maxLength={3}
                            tooltip={I18n.t("userTokens.tokenValidityDaysTooltip")}
                            onChange={e => this.setState({
                                "service": {
                                    ...service,
                                    token_validity_days: e.target.value.replace(/\D/, "")
                                }
                            })}
                            disabled={!service.token_enabled}/>

                <InputField value={config.introspect_endpoint}
                            name={I18n.t("userTokens.introspectionEndpoint")}
                            copyClipBoard={true}
                            disabled={true}/>
            </div>)
    }

    renderLdap = (config, service, isAdmin, isServiceAdmin) => {
        const ldapBindAccount = config.ldap_bind_account;
        const {entity_id} = this.state.service;
        return (
            <div className={"ldap"}>
                <InputField value={config.ldap_url}
                            name={I18n.t("service.ldap.url")}
                            toolTip={I18n.t("service.ldap.urlTooltip")}
                            copyClipBoard={true}
                            disabled={true}/>
                <InputField
                    value={ldapBindAccount.substring(ldapBindAccount.indexOf(",") + 1).replace("entity_id", entity_id)}
                    name={I18n.t("service.ldap.basedn")}
                    toolTip={I18n.t("service.ldap.basednTooltip")}
                    copyClipBoard={true}
                    disabled={true}/>
                <InputField value={ldapBindAccount.replace("entity_id", entity_id)}
                            name={I18n.t("service.ldap.username")}
                            toolTip={I18n.t("service.ldap.usernameTooltip")}
                            copyClipBoard={true}
                            disabled={true}/>
                <div className="ip-networks">
                    <label className="title" htmlFor={I18n.t("service.network")}>{I18n.t("service.network")}
                        <span className="tool-tip-section">
                                <span data-tip data-for={I18n.t("service.network")}>
                                    <FontAwesomeIcon icon="info-circle"/>
                                </span>
                                <ReactTooltip id={I18n.t("service.network")} type="light" effect="solid"
                                              data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("service.networkTooltip")}}/>
                                </ReactTooltip>
                            </span>
                        {(isAdmin || isServiceAdmin) &&
                        <span className="add-network" onClick={() => this.addIpAddress()}><FontAwesomeIcon
                            icon="plus"/></span>}
                    </label>
                    {service.ip_networks.map((network, i) =>
                        <div className="network-container" key={i}>
                            <div className="network">
                                <InputField value={network.network_value}
                                            onChange={this.saveIpAddress(i)}
                                            onBlur={this.validateIpAddress(i)}
                                            placeholder={I18n.t("service.networkPlaceholder")}
                                            error={network.error || network.syntax || (network.higher && !network.global && network.version === 6)}
                                            disabled={!isAdmin && !isServiceAdmin}
                                            onEnter={e => {
                                                this.validateIpAddress(i);
                                                e.target.blur()
                                            }}
                                />
                                {(isAdmin || isServiceAdmin) && <span className="trash">
                            <FontAwesomeIcon onClick={() => this.deleteIpAddress(i)} icon="trash"/>
                        </span>}
                            </div>
                            {(network.error && !network.syntax) &&
                            <ErrorIndicator msg={I18n.t("service.networkError", network)}/>}
                            {network.syntax && <ErrorIndicator msg={I18n.t("service.networkSyntaxError")}/>}
                            {network.higher &&
                            <span className="network-info">{I18n.t("service.networkInfo", network)}</span>}
                            {(network.higher && network.version === 6 && !network.global) &&
                            <ErrorIndicator msg={I18n.t("service.networkNotGlobal")}/>}

                        </div>
                    )}
                </div>
            </div>)
    }

    renderPolicy = (service, isAdmin, isServiceAdmin, invalidInputs, alreadyExists) => {
        return (
            <div className={"policy"}>
                <InputField value={service.privacy_policy}
                            name={I18n.t("service.privacy_policy")}
                            placeholder={I18n.t("service.privacy_policyPlaceholder")}
                            onChange={e => this.changeServiceProperty("privacy_policy", false, alreadyExists,
                                {...invalidInputs, privacy_policy: false})(e)}
                            error={isEmpty(service.privacy_policy) || invalidInputs.privacy_policy}
                            toolTip={I18n.t("service.privacy_policyTooltip")}
                            externalLink={true}
                            onBlur={this.validateURI("privacy_policy")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {isEmpty(service.privacy_policy) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.privacy_policy").toLowerCase()
                })}/>}
                {invalidInputs.privacy_policy &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "uri"})}/>}

                <InputField value={service.accepted_user_policy}
                            name={I18n.t("service.accepted_user_policy")}
                            placeholder={I18n.t("service.accepted_user_policyPlaceholder")}
                            onChange={e => this.changeServiceProperty("accepted_user_policy", false, alreadyExists,
                                {...invalidInputs, accepted_user_policy: false})(e)}
                            toolTip={I18n.t("service.accepted_user_policyTooltip")}
                            error={invalidInputs.accepted_user_policy}
                            externalLink={true}
                            onBlur={this.validateURI("accepted_user_policy")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {invalidInputs.accepted_user_policy &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "uri"})}/>}

                <RadioButton label={I18n.t("service.sirtfiCompliant")}
                             name={"sirtfi_compliant"}
                             value={service.sirtfi_compliant}
                             tooltip={I18n.t("service.sirtfiCompliantTooltip")}
                             onChange={val => this.setState({"service": {...service, sirtfi_compliant: val}})}/>

                <RadioButton label={I18n.t("service.codeOfConductCompliant")}
                             name={"code_of_conduct_compliant"}
                             value={service.code_of_conduct_compliant}
                             tooltip={I18n.t("service.codeOfConductCompliantTooltip")}
                             onChange={val => this.setState({
                                 "service": {
                                     ...service,
                                     code_of_conduct_compliant: val
                                 }
                             })}/>

                <RadioButton label={I18n.t("service.researchScholarshipCompliant")}
                             name={"research_scholarship_compliant"}
                             value={service.research_scholarship_compliant}
                             tooltip={I18n.t("service.researchScholarshipCompliantTooltip")}
                             onChange={val => this.setState({
                                 "service": {
                                     ...service,
                                     research_scholarship_compliant: val
                                 }
                             })}/>
            </div>)
    }

    renderContacts = (service, alreadyExists, isAdmin, isServiceAdmin, invalidInputs, hasAdministrators) => {
        const contactEmailRequired = !hasAdministrators && isEmpty(service.contact_email);

        return (
            <div className={"contacts"}>
                <InputField value={service.contact_email}
                            name={I18n.t("service.contact_email")}
                            placeholder={I18n.t("service.contact_emailPlaceholder")}
                            onChange={e => this.changeServiceProperty("contact_email", false, alreadyExists,
                                {...invalidInputs, email: false})(e)}
                            toolTip={I18n.t("service.contact_emailTooltip")}
                            error={invalidInputs["email"] || contactEmailRequired}
                            onBlur={this.validateEmail("email")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {invalidInputs["email"] && <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "email"})}/>}
                {contactEmailRequired &&
                <ErrorIndicator msg={I18n.t("service.contactEmailRequired")}/>}

                <InputField value={service.security_email}
                            name={I18n.t("service.security_email")}
                            placeholder={I18n.t("service.security_emailPlaceholder")}
                            onChange={e => this.changeServiceProperty("security_email", false, alreadyExists,
                                {...invalidInputs, security_email: false})(e)}
                            toolTip={I18n.t("service.security_emailTooltip")}
                            error={isEmpty(service.security_email) || invalidInputs["security_email"]}
                            onBlur={this.validateEmail("security_email")}
                            disabled={!isAdmin && !isServiceAdmin}/>

                {invalidInputs["security_email"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "email"})}/>}

                {isEmpty(service.security_email) &&
                <ErrorIndicator msg={I18n.t("service.securityEmailRequired")}/>}

                <InputField value={service.support_email}
                            name={I18n.t("service.support_email")}
                            placeholder={I18n.t("service.support_emailPlaceholder")}
                            onChange={e => this.changeServiceProperty("support_email", false, alreadyExists,
                                {...invalidInputs, support_email: false})(e)}
                            toolTip={I18n.t("service.support_emailTooltip")}
                            error={invalidInputs["support_email"]}
                            onBlur={this.validateEmail("support_email")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {invalidInputs["support_email"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "email"})}/>}
            </div>)
    }

    renderConnection = (config, service, alreadyExists, isAdmin, isServiceAdmin, showServiceAdminView) => {
        const serviceRequestUrlValid = !isEmpty(service.uri) && service.automatic_connection_allowed;
        const serviceRequestUrl = serviceRequestUrlValid ?
            `${config.base_url}/service-request?entityID=${encodeURIComponent(service.entity_id)}&redirectUri=${encodeURIComponent(service.uri)}` :
            I18n.t("service.service_requestError");

        return (
            <div className={"connection"}>
                <InputField value={service.entity_id}
                            onChange={this.changeServiceProperty("entity_id", false, {
                                ...alreadyExists, entity_id: false
                            })}
                            placeholder={I18n.t("service.entity_idPlaceHolder")}
                            onBlur={this.validateServiceEntityId}
                            name={I18n.t("service.entity_id")}
                            toolTip={I18n.t("service.entity_idTooltip")}
                            error={alreadyExists.entity_id || isEmpty(service.entity_id)}
                            copyClipBoard={true}
                            disabled={!isAdmin || showServiceAdminView}/>
                {alreadyExists.entity_id && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                    attribute: I18n.t("service.entity_id").toLowerCase(),
                    value: service.entity_id
                })}/>}
                {isEmpty(service.entity_id) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.entity_id").toLowerCase()
                })}/>}

                {(isAdmin && !showServiceAdminView) && <InputField value={serviceRequestUrl}
                                                                   name={I18n.t("service.service_request")}
                                                                   toolTip={I18n.t("service.service_requestTooltip")}
                                                                   copyClipBoard={serviceRequestUrlValid}
                                                                   history={this.props.history}
                                                                   disabled={true}
                />}

                <CheckBox name="automatic_connection_allowed"
                          value={service.automatic_connection_allowed}
                          info={I18n.t("service.automaticConnectionAllowed")}
                          tooltip={I18n.t("service.automaticConnectionAllowedTooltip")}
                          onChange={this.changeServiceProperty("automatic_connection_allowed", true)}
                          readOnly={!isAdmin && !isServiceAdmin}/>

                {(isAdmin && !showServiceAdminView) && <CheckBox name="non_member_users_access_allowed"
                                                                 value={service.non_member_users_access_allowed}
                                                                 info={I18n.t("service.nonMemberUsersAccessAllowed")}
                                                                 tooltip={I18n.t("service.nonMemberUsersAccessAllowedTooltip")}
                                                                 onChange={this.changeServiceProperty("non_member_users_access_allowed", true)}/>}

                {(isAdmin && !showServiceAdminView) && <CheckBox name="white_listed"
                                                                 value={service.white_listed}
                                                                 info={I18n.t("service.whiteListed")}
                                                                 tooltip={I18n.t("service.whiteListedTooltip")}
                                                                 onChange={this.changeServiceProperty("white_listed", true)}/>}
            </div>)
    }

    renderGeneral = (service, alreadyExists, isAdmin, isServiceAdmin, invalidInputs) => {
        return <>
            <InputField value={service.name}
                        onChange={this.changeServiceProperty("name", false, {...alreadyExists, name: false})}
                        placeholder={I18n.t("service.namePlaceHolder")}
                        onBlur={this.validateServiceName}
                        error={alreadyExists.name}
                        name={I18n.t("service.name")}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {alreadyExists.name && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                attribute: I18n.t("service.name").toLowerCase(),
                value: service.name
            })}/>}
            {(isEmpty(service.name)) && <ErrorIndicator msg={I18n.t("service.required", {
                attribute: I18n.t("service.name").toLowerCase()
            })}/>}

            <CroppedImageField name="logo"
                               onChange={s => this.setState({"service": {...service, "logo": s}})}
                               isNew={false}
                               title={I18n.t("service.logo")}
                               value={service.logo}
                               initial={false}
                               secondRow={true}/>

            <InputField value={service.abbreviation}
                        onChange={this.changeServiceProperty("abbreviation", false, {
                            ...alreadyExists, abbreviation: false
                        })}
                        placeholder={I18n.t("service.abbreviationPlaceHolder")}
                        onBlur={this.validateServiceAbbreviation}
                        name={I18n.t("service.abbreviation")}
                        toolTip={I18n.t("service.abbreviationTooltip")}
                        error={alreadyExists.abbreviation || isEmpty(service.abbreviation)}
                        copyClipBoard={false}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {alreadyExists.abbreviation && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                attribute: I18n.t("service.abbreviation").toLowerCase(),
                value: service.abbreviation
            })}/>}
            {(isEmpty(service.abbreviation)) && <ErrorIndicator msg={I18n.t("service.required", {
                attribute: I18n.t("service.abbreviation").toLowerCase()
            })}/>}

            <InputField value={service.description}
                        name={I18n.t("service.description")}
                        placeholder={I18n.t("service.descriptionPlaceholder")}
                        onChange={this.changeServiceProperty("description")}
                        multiline={true}
                        disabled={!isAdmin && !isServiceAdmin}/>

            <InputField value={service.uri}
                        name={I18n.t("service.uri")}
                        placeholder={I18n.t("service.uriPlaceholder")}
                        onChange={e => this.changeServiceProperty("uri", false, alreadyExists,
                            {...invalidInputs, uri: false})(e)}
                        toolTip={I18n.t("service.uriTooltip")}
                        externalLink={true}
                        error={invalidInputs.uri}
                        onBlur={this.validateURI("uri")}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {invalidInputs.uri &&
            <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "uri"})}/>}
        </>
    }

    renderCurrentTab = (config, currentTab, service, alreadyExists, isAdmin, isServiceAdmin, disabledSubmit,
                        invalidInputs, hasAdministrators, showServiceAdminView) => {
        switch (currentTab) {
            case "general":
                return this.renderGeneral(service, alreadyExists, isAdmin, isServiceAdmin, invalidInputs);
            case "connection":
                return this.renderConnection(config, service, alreadyExists, isAdmin, isServiceAdmin, showServiceAdminView);
            case "contacts":
                return this.renderContacts(service, alreadyExists, isAdmin, isServiceAdmin, invalidInputs, hasAdministrators);
            case "policy":
                return this.renderPolicy(service, isAdmin, isServiceAdmin, invalidInputs, alreadyExists);
            case "ldap":
                return this.renderLdap(config, service, isAdmin, isServiceAdmin);
            case "tokens":
                return this.renderTokens(config, service, isAdmin);
            case "pamWebLogin":
                return this.renderPamWebLogin(service, isAdmin, showServiceAdminView);
            default:
                throw new Error("unknown-tab")
        }
    }

    render() {
        const {
            alreadyExists,
            service,
            confirmationDialogOpen,
            confirmationDialogAction,
            cancelDialogAction,
            invalidInputs,
            warning,
            hasAdministrators,
            isServiceAdmin,
            currentTab,
            loading,
            confirmationTxt,
            confirmationHeader,
            confirmationDialogQuestion,
            ldapPassword,
            tokenValue,
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !this.isValid();
        const {user, config, showServiceAdminView} = this.props;
        const isAdmin = user.admin;
        return (
            <div className="service-overview">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={warning}
                                    largeWidth={!isEmpty(tokenValue)}
                                    confirmationTxt={confirmationTxt}
                                    confirmationHeader={confirmationHeader}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}>
                    {ldapPassword && this.renderLdapPassword(ldapPassword)}
                    {tokenValue && this.renderLdapPassword(tokenValue)}
                </ConfirmationDialog>

                {this.sidebar(currentTab)}
                <div className={"service"}>
                    <h1 className="section-separator">{I18n.t(`serviceDetails.toc.${currentTab}`)}</h1>
                    {this.renderCurrentTab(config, currentTab, service, alreadyExists, isAdmin, isServiceAdmin,
                        disabledSubmit, invalidInputs, hasAdministrators, showServiceAdminView)}
                    {this.renderButtons(isAdmin, isServiceAdmin, disabledSubmit, currentTab, showServiceAdminView)}
                </div>
            </div>
        );
    };

}

export default ServiceOverview;
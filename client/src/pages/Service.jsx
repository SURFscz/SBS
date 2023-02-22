import React from "react";
import {
    createService,
    deleteService,
    ipNetworks,
    serviceAbbreviationExists,
    serviceById,
    serviceEntityIdExists,
    serviceNameExists,
    updateService
} from "../api";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./Service.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty, stopEvent} from "../utils/Utils";
import {sanitizeShortName, validEmailRegExp, validUrlRegExp} from "../validations/regExps";
import CheckBox from "../components/CheckBox";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import RadioButton from "../components/redesign/RadioButton";
import CroppedImageField from "../components/redesign/CroppedImageField";
import SpinnerField from "../components/redesign/SpinnerField";
import ErrorIndicator from "../components/redesign/ErrorIndicator";
import EmailField from "../components/EmailField";
import {isUserServiceAdmin} from "../utils/UserRole";

class Service extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = this.initialState();
    }

    initialState = () => ({
        service: {},
        name: "",
        abbreviation: "",
        logo: "",
        entity_id: "",
        description: "",
        address: "",
        identity_type: "",
        uri: "",
        uri_info: "",
        accepted_user_policy: "",
        privacy_policy: "",
        automatic_connection_allowed: false,
        access_allowed_for_all: false,
        non_member_users_access_allowed: false,
        allow_restricted_orgs: false,
        research_scholarship_compliant: null,
        code_of_conduct_compliant: null,
        sirtfi_compliant: null,
        token_enabled: false,
        token_validity_days: "",
        pam_web_sso_enabled: false,
        contact_email: "",
        support_email: "",
        security_email: "",
        ip_networks: [],
        administrators: [],
        email: "",
        message: "",
        required: ["name", "entity_id", "abbreviation", "privacy_policy", "logo", "security_email",
            "research_scholarship_compliant", "code_of_conduct_compliant", "sirtfi_compliant"],
        alreadyExists: {},
        initial: true,
        isNew: true,
        invalidInputs: {},
        confirmationDialogOpen: false,
        leavePage: false,
        confirmationDialogAction: () => true,
        cancelDialogAction: () => true,
        warning: false,
        loading: true,
        isServiceAdmin: false,
        hasAdministrators: false
    });

    UNSAFE_componentWillReceiveProps = nextProps => {
        if (nextProps.isNew) {
            this.setState(this.initialState(), () => this.componentDidMount(true))
        }
    };

    componentDidMount = forceNew => {
        const params = this.props.match.params;
        const {isNew} = this.props;
        if (params.id || isNew) {
            if (isNew || forceNew) {
                const {user} = this.props;
                if (!user.admin) {
                    this.props.history.push("/404");
                } else {
                    this.addIpAddress();
                    this.setState({loading: false});
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {value: I18n.t("breadcrumb.service", {name: I18n.t("breadcrumb.newService")})}
                        ];
                    });
                }
            } else {
                serviceById(params.id)
                    .then(res => {
                        const {user} = this.props;
                        this.setState({
                            ...res,
                            service: res,
                            isNew: false,
                            hasAdministrators: res.service_memberships.length > 0,
                            isServiceAdmin: isUserServiceAdmin(user, res),
                            loading: false
                        }, () => {
                            const {ip_networks} = this.state.service;
                            if (isEmpty(ip_networks)) {
                                this.addIpAddress();
                            } else {
                                Promise.all(ip_networks.map(n => ipNetworks(n.network_value, n.id)))
                                    .then(res => {
                                        this.setState({"ip_networks": res});
                                    });
                            }
                        });
                        AppStore.update(s => {
                            s.breadcrumb.paths = [
                                {path: "/", value: I18n.t("breadcrumb.home")},
                                {path: `/services/${res.id}`, value: I18n.t("breadcrumb.service", {name: res.name})},
                                {value: I18n.t("home.edit")}
                            ];
                        });
                    });
            }
        } else {
            this.props.history.push("/404");
        }
    };

    validateServiceName = e =>
        serviceNameExists(e.target.value, this.state.isNew ? null : this.state.service.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateServiceEntityId = e =>
        serviceEntityIdExists(e.target.value, this.state.isNew ? null : this.state.service.entity_id).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, entity_id: json}});
        });

    validateServiceAbbreviation = e =>
        serviceAbbreviationExists(sanitizeShortName(e.target.value), this.state.isNew ? null : this.state.service.abbreviation).then(json => {
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
                    const {ip_networks} = this.state;
                    ip_networks.splice(index, 1, res);
                    const updatedIpNetworks = [...ip_networks];
                    this.setState({ip_networks: updatedIpNetworks});
                });
        }
    }

    saveIpAddress = index => e => {
        const {ip_networks} = this.state;
        const network = ip_networks[index];
        network.network_value = e.target.value;
        ip_networks.splice(index, 1, network)
        const updatedIpNetworks = [...ip_networks];
        this.setState({ip_networks: updatedIpNetworks});
    }

    addIpAddress = () => {
        const {ip_networks} = this.state;
        ip_networks.push({network_value: ""});
        this.setState({ip_networks: [...ip_networks]});
    }

    deleteIpAddress = index => {
        const {ip_networks} = this.state;
        ip_networks.splice(index, 1);
        this.setState({ip_networks: [...ip_networks]});
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            warning: false,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.goBack()),
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            warning: true,
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        this.setState({loading: true});
        const {service} = this.state;
        deleteService(service.id).then(() => {
            this.props.history.push("/home/services");
            setFlash(I18n.t("service.flash.deleted", {name: service.name}));
        });
    };

    isValid = () => {
        const {required, alreadyExists, invalidInputs, contact_email, hasAdministrators, ip_networks}
            = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) ||
            required.some(attr => isEmpty(this.state[attr])) ||
            Object.keys(invalidInputs).some(key => invalidInputs[key]);
        const contactEmailRequired = !hasAdministrators && isEmpty(contact_email);
        const invalidIpNetworks = ip_networks.some(ipNetwork => ipNetwork.error || (ipNetwork.version === 6 && !ipNetwork.global));
        return !inValid && !contactEmailRequired && !invalidIpNetworks;
    };

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    doSubmit = () => {
        if (this.isValid()) {
            this.setState({loading: true});
            const {name, isNew, ip_networks} = this.state;
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
            this.setState({ip_networks: strippedIpNetworks}, () => {
                if (isNew) {
                    createService(this.state).then(res => this.afterUpdate(name, "created", res));
                } else {
                    updateService(this.state).then(res => this.afterUpdate(name, "updated", res));
                }
            });
        } else {
            window.scrollTo(0, 0);
        }
    };

    afterUpdate = (name, action, res) => {
        setFlash(I18n.t(`service.flash.${action}`, {name: name}));
        this.props.history.push("/services/" + res.id);
    };

    renderIpNetworks = (ip_networks, isAdmin, isServiceAdmin) => {
        return (<div className="ip-networks">
            <label className="title" htmlFor={I18n.t("service.network")}>{I18n.t("service.network")}
                <Tooltip tip={I18n.t("service.networkTooltip")}/>
                {(isAdmin || isServiceAdmin) &&
                <span className="add-network" onClick={() => this.addIpAddress()}><FontAwesomeIcon icon="plus"/></span>}
            </label>
            {ip_networks.map((network, i) =>
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
                    {network.higher && <span className="network-info">{I18n.t("service.networkInfo", network)}</span>}
                    {(network.higher && network.version === 6 && !network.global) &&
                    <ErrorIndicator msg={I18n.t("service.networkNotGlobal")}/>}

                </div>
            )}
        </div>);
    }

    removeMail = email => e => {
        stopEvent(e);
        const {administrators} = this.state;
        const newAdministrators = administrators.filter(currentMail => currentMail !== email);
        this.setState({administrators: newAdministrators});
    };

    addEmail = e => {
        const email = e.target.value;
        const {administrators} = this.state;
        const delimiters = [",", " ", ";", "\n", "\t"];
        let emails;
        if (!isEmpty(email) && delimiters.some(delimiter => email.indexOf(delimiter) > -1)) {
            emails = email.replace(/[;\s]/g, ",").split(",").filter(part => part.trim().length > 0 && validEmailRegExp.test(part));
        } else if (!isEmpty(email) && validEmailRegExp.test(email.trim())) {
            emails = [email];
        }
        if (isEmpty(emails)) {
            this.setState({email: ""});
        } else {
            const uniqueEmails = [...new Set(administrators.concat(emails))];
            this.setState({email: "", administrators: uniqueEmails});
        }
    };

    serviceDetailTab = (title, name, isAdmin, alreadyExists, initial, entity_id, abbreviation, description, uri, automatic_connection_allowed,
                        access_allowed_for_all, non_member_users_access_allowed, contact_email, support_email, security_email, invalidInputs, contactEmailRequired,
                        accepted_user_policy, uri_info, privacy_policy, isNew, service, disabledSubmit, allow_restricted_orgs, sirtfi_compliant, token_enabled, pam_web_sso_enabled,
                        token_validity_days, code_of_conduct_compliant,
                        research_scholarship_compliant, config, ip_networks, administrators, message, email, logo, isServiceAdmin) => {
        const ldapBindAccount = config.ldap_bind_account;
        return (
            <div className="service">

                <h1 className="section-separator">{I18n.t("service.about")}</h1>

                <InputField value={name} onChange={e => this.setState({
                    name: e.target.value,
                    alreadyExists: {...this.state.alreadyExists, name: false}
                })}
                            placeholder={I18n.t("service.namePlaceHolder")}
                            onBlur={this.validateServiceName}
                            error={alreadyExists.name || (!initial && isEmpty(name))}
                            name={I18n.t("service.name")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {alreadyExists.name && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                    attribute: I18n.t("service.name").toLowerCase(),
                    value: name
                })}/>}
                {(!initial && isEmpty(name)) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.name").toLowerCase()
                })}/>}

                <CroppedImageField name="logo" onChange={s => this.setState({logo: s})}
                                   isNew={isNew} title={I18n.t("service.logo")}
                                   value={logo}
                                   initial={initial} secondRow={true}/>

                <InputField value={entity_id} onChange={e => this.setState({
                    entity_id: e.target.value,
                    alreadyExists: {...this.state.alreadyExists, entity_id: false}
                })}
                            placeholder={I18n.t("service.entity_idPlaceHolder")}
                            onBlur={this.validateServiceEntityId}
                            name={I18n.t("service.entity_id")}
                            toolTip={I18n.t("service.entity_idTooltip")}
                            error={alreadyExists.entity_id || (!initial && isEmpty(entity_id))}
                            copyClipBoard={true}
                            disabled={!isAdmin}/>
                {alreadyExists.entity_id && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                    attribute: I18n.t("service.entity_id").toLowerCase(),
                    value: entity_id
                })}/>}
                {(!initial && isEmpty(entity_id)) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.entity_id").toLowerCase()
                })}/>}

                <InputField value={abbreviation} onChange={e => this.setState({
                    abbreviation: sanitizeShortName(e.target.value),
                    alreadyExists: {...this.state.alreadyExists, abbreviation: false}
                })}
                            placeholder={I18n.t("service.abbreviationPlaceHolder")}
                            onBlur={this.validateServiceAbbreviation}
                            name={I18n.t("service.abbreviation")}
                            toolTip={I18n.t("service.abbreviationTooltip")}
                            error={alreadyExists.abbreviation || (!initial && isEmpty(abbreviation))}
                            copyClipBoard={false}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {alreadyExists.abbreviation && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                    attribute: I18n.t("service.abbreviation").toLowerCase(),
                    value: abbreviation
                })}/>}
                {(!initial && isEmpty(abbreviation)) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.abbreviation").toLowerCase()
                })}/>}

                <InputField value={privacy_policy}
                            name={I18n.t("service.privacy_policy")}
                            placeholder={I18n.t("service.privacy_policyPlaceholder")}
                            onChange={e => this.setState({
                                privacy_policy: e.target.value,
                                invalidInputs: {...invalidInputs, privacy_policy: false}
                            })}
                            error={!initial && isEmpty(privacy_policy)}
                            toolTip={I18n.t("service.privacy_policyTooltip")}
                            externalLink={true}
                            onBlur={this.validateURI("privacy_policy")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {(!initial && isEmpty(privacy_policy)) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.privacy_policy").toLowerCase()
                })}/>}
                {invalidInputs["privacy_policy"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "uri"})}/>}


                <InputField value={description}
                            name={I18n.t("service.description")}
                            placeholder={I18n.t("service.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            multiline={true}
                            disabled={!isAdmin && !isServiceAdmin}/>

                <InputField value={uri_info}
                            name={I18n.t("service.infoUri")}
                            placeholder={I18n.t("service.infoUriPlaceholder")}
                            onChange={e => this.setState({
                                uri_info: e.target.value,
                                invalidInputs: {...invalidInputs, uri_info: false}
                            })}
                            toolTip={I18n.t("service.infoUriTooltip")}
                            externalLink={true}
                            onBlur={this.validateURI("uri_info")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {invalidInputs["uri_info"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "uri"})}/>}

                <InputField value={uri}
                            name={I18n.t("service.uri")}
                            placeholder={I18n.t("service.uriPlaceholder")}
                            onChange={e => this.setState({
                                uri: e.target.value,
                                invalidInputs: {...invalidInputs, uri: false}
                            })}
                            toolTip={I18n.t("service.uriTooltip")}
                            externalLink={true}
                            onBlur={this.validateURI("uri")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {invalidInputs["uri"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "uri"})}/>}


                <CheckBox name="automatic_connection_allowed" value={automatic_connection_allowed}
                          info={I18n.t("service.automaticConnectionAllowed")}
                          tooltip={I18n.t("service.automaticConnectionAllowedTooltip")}
                          onChange={e => this.setState({automatic_connection_allowed: e.target.checked})}
                          readOnly={!isAdmin && !isServiceAdmin}/>

                <CheckBox name="access_allowed_for_all" value={access_allowed_for_all}
                          info={I18n.t("service.accessAllowedForAll")}
                          tooltip={I18n.t("service.accessAllowedForAllTooltip")}
                          onChange={e => this.setState({access_allowed_for_all: e.target.checked})}
                          readOnly={!isAdmin && !isServiceAdmin}/>

                {isAdmin && <CheckBox name="non_member_users_access_allowed" value={non_member_users_access_allowed}
                                      info={I18n.t("service.nonMemberUsersAccessAllowed")}
                                      tooltip={I18n.t("service.nonMemberUsersAccessAllowedTooltip")}
                                      onChange={e => this.setState({non_member_users_access_allowed: e.target.checked})}
                                      readOnly={!isAdmin && !isServiceAdmin}/>}

                {isAdmin && <CheckBox name="allow_restricted_orgs" value={allow_restricted_orgs}
                                      info={I18n.t("service.allowRestrictedOrgs")}
                                      tooltip={I18n.t("service.allowRestrictedOrgsTooltip")}
                                      onChange={e => this.setState({allow_restricted_orgs: e.target.checked})}
                                      readOnly={!isAdmin && !isServiceAdmin}/>}

                <InputField value={accepted_user_policy}
                            name={I18n.t("service.accepted_user_policy")}
                            placeholder={I18n.t("service.accepted_user_policyPlaceholder")}
                            onChange={e => this.setState({
                                accepted_user_policy: e.target.value,
                                invalidInputs: {...invalidInputs, accepted_user_policy: false}
                            })}
                            toolTip={I18n.t("service.accepted_user_policyTooltip")}
                            externalLink={true}
                            onBlur={this.validateURI("accepted_user_policy")}
                            disabled={!isAdmin && !isServiceAdmin}/>
                {invalidInputs["accepted_user_policy"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "uri"})}/>}

                {this.renderIpNetworks(ip_networks, isAdmin, isServiceAdmin)}
                <div className="contacts">
                    <h1 className="section-separator first">{I18n.t("service.contacts")}</h1>

                    <InputField value={contact_email}
                                name={I18n.t("service.contact_email")}
                                placeholder={I18n.t("service.contact_emailPlaceholder")}
                                onChange={e => this.setState({
                                    contact_email: e.target.value,
                                    invalidInputs: !isEmpty(e.target.value) ? invalidInputs : {
                                        ...invalidInputs,
                                        email: false
                                    }
                                })}
                                toolTip={I18n.t("service.contact_emailTooltip")}
                                error={invalidInputs["email"] || (!initial && contactEmailRequired)}
                                onBlur={this.validateEmail("email")}
                                disabled={!isAdmin && !isServiceAdmin}/>
                    {invalidInputs["email"] && <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "email"})}/>}
                    {(!initial && contactEmailRequired) &&
                    <ErrorIndicator msg={I18n.t("service.contactEmailRequired")}/>}

                    <InputField value={security_email}
                                name={I18n.t("service.security_email")}
                                placeholder={I18n.t("service.security_emailPlaceholder")}
                                onChange={e => this.setState({
                                    security_email: e.target.value,
                                    invalidInputs: !isEmpty(e.target.value) ? invalidInputs : {
                                        ...invalidInputs,
                                        security_email: false
                                    }
                                })}
                                toolTip={I18n.t("service.security_emailTooltip")}
                                error={(!initial && isEmpty(security_email)) || invalidInputs["security_email"]}
                                onBlur={this.validateEmail("security_email")}
                                disabled={!isAdmin && !isServiceAdmin}/>

                    {invalidInputs["security_email"] &&
                    <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "email"})}/>}

                    {(!initial && isEmpty(security_email)) &&
                    <ErrorIndicator msg={I18n.t("service.securityEmailRequired")}/>}

                    <InputField value={support_email}
                                name={I18n.t("service.support_email")}
                                placeholder={I18n.t("service.support_emailPlaceholder")}
                                onChange={e => this.setState({
                                    support_email: e.target.value,
                                    invalidInputs: !isEmpty(e.target.value) ? invalidInputs : {
                                        ...invalidInputs,
                                        support_email: false
                                    }
                                })}
                                toolTip={I18n.t("service.support_emailTooltip")}
                                error={invalidInputs["support_email"]}
                                onBlur={this.validateEmail("support_email")}
                                disabled={!isAdmin && !isServiceAdmin}/>
                    {invalidInputs["support_email"] &&
                    <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: "email"})}/>}

                </div>
                <div className="ldap">
                    <h1 className="section-separator first">{I18n.t("service.ldap.section")}</h1>
                    <InputField value={config.ldap_url}
                                name={I18n.t("service.ldap.url")}
                                toolTip={I18n.t("service.ldap.urlTooltip")}
                                copyClipBoard={true}
                                disabled={true}/>
                    <InputField value={ldapBindAccount.replace("entity_id", entity_id)}
                                name={I18n.t("service.ldap.username")}
                                toolTip={I18n.t("service.ldap.usernameTooltip")}
                                copyClipBoard={true}
                                disabled={true}/>
                    <InputField
                        value={ldapBindAccount.substring(ldapBindAccount.indexOf(",") + 1).replace("entity_id", entity_id)}
                        name={I18n.t("service.ldap.basedn")}
                        toolTip={I18n.t("service.ldap.basednTooltip")}
                        copyClipBoard={true}
                        disabled={true}/>
                </div>
                <div className="compliance">
                    <h1 className="section-separator first">{I18n.t("service.compliancy")}</h1>

                    <RadioButton label={I18n.t("service.sirtfiCompliant")}
                                 name={"sirtfi_compliant"}
                                 value={sirtfi_compliant}
                                 tooltip={I18n.t("service.sirtfiCompliantTooltip")}
                                 onChange={val => this.setState({sirtfi_compliant: val})}/>
                    {(!initial && isEmpty(sirtfi_compliant)) &&
                    <ErrorIndicator msg={I18n.t("service.required", {
                        attribute: I18n.t("service.sirtfiCompliant").toLowerCase()
                    })}/>}
                    <RadioButton label={I18n.t("service.codeOfConductCompliant")}
                                 name={"code_of_conduct_compliant"}
                                 value={code_of_conduct_compliant}
                                 tooltip={I18n.t("service.codeOfConductCompliantTooltip")}
                                 onChange={val => this.setState({code_of_conduct_compliant: val})}/>
                    {(!initial && isEmpty(code_of_conduct_compliant)) &&
                    <ErrorIndicator msg={I18n.t("service.required", {
                        attribute: I18n.t("service.codeOfConductCompliant").toLowerCase()
                    })}/>}

                    <RadioButton label={I18n.t("service.researchScholarshipCompliant")}
                                 name={"research_scholarship_compliant"}
                                 value={research_scholarship_compliant}
                                 tooltip={I18n.t("service.researchScholarshipCompliantTooltip")}
                                 onChange={val => this.setState({research_scholarship_compliant: val})}/>
                    {(!initial && isEmpty(research_scholarship_compliant)) &&
                    <ErrorIndicator msg={I18n.t("service.required", {
                        attribute: I18n.t("service.researchScholarshipCompliant").toLowerCase()
                    })}/>}

                </div>
                <div className="tokens">
                    <h1 className="section-separator first">{I18n.t("userTokens.tokens")}</h1>


                    <CheckBox name={"token_enabled"}
                              value={token_enabled}
                              tooltip={I18n.t("userTokens.tokenEnabledTooltip")}
                              info={I18n.t("userTokens.tokenEnabled")}
                              readOnly={!isAdmin}
                              onChange={() => this.setState({
                                  token_enabled: !token_enabled,
                                  token_validity_days: token_enabled ? "" : 1
                              })}
                    />

                    <InputField value={token_validity_days}
                                name={I18n.t("userTokens.tokenValidityDays")}
                                maxLength={3}
                                tooltip={I18n.t("userTokens.tokenValidityDaysTooltip")}
                                onChange={e => this.setState({token_validity_days: e.target.value.replace(/\D/, '')})}
                                disabled={!token_enabled}
                    />

                    <CheckBox name={"pam_web_sso_enabled"}
                              value={pam_web_sso_enabled}
                              onChange={() => this.setState({pam_web_sso_enabled: !pam_web_sso_enabled})}
                              tooltip={I18n.t("userTokens.pamWebSSOEnabledTooltip")}
                              readOnly={!isAdmin}
                              info={I18n.t("userTokens.pamWebSSOEnabled")}
                    />

                    <InputField value={config.introspect_endpoint}
                                name={I18n.t("userTokens.introspectionEndpoint")}
                                copyClipBoard={true}
                                disabled={true}
                    />

                </div>
                {isNew &&
                <div className="email-invitations">
                    <h1 className="section-separator first last">{I18n.t("service.invitations")}</h1>

                    <EmailField value={email}
                                onChange={e => this.setState({email: e.target.value})}
                                addEmail={this.addEmail}
                                removeMail={this.removeMail}
                                name={I18n.t("invitation.invitees")}
                                isAdmin={true}
                                emails={administrators}/>
                </div>}
                {isNew && <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                                      placeholder={I18n.t("collaboration.messagePlaceholder")}
                                      name={I18n.t("collaboration.message")}
                                      toolTip={I18n.t("collaboration.messageTooltip")}
                                      multiline={true}/>}

                {(isNew && isAdmin) &&
                <section className="actions">
                    <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    <Button disabled={disabledSubmit} txt={I18n.t("service.add")}
                            onClick={this.submit}/>
                </section>}
                {(!isNew && (isAdmin || isServiceAdmin)) &&
                <section className="actions">
                    {!isServiceAdmin && <Button warningButton={true}
                                                onClick={this.delete}/>}
                    <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    <Button disabled={disabledSubmit} txt={I18n.t("service.update")}
                            onClick={this.submit}/>
                </section>}

            </div>);
    }

    render() {
        //status,address, identity_type
        const {
            alreadyExists,
            service,
            initial,
            confirmationDialogOpen,
            cancelDialogAction,
            name,
            entity_id,
            abbreviation,
            description,
            uri,
            uri_info,
            accepted_user_policy,
            privacy_policy,
            contact_email, support_email, security_email,
            confirmationDialogAction,
            leavePage,
            isNew,
            invalidInputs,
            automatic_connection_allowed,
            access_allowed_for_all,
            non_member_users_access_allowed,
            allow_restricted_orgs,
            sirtfi_compliant,
            token_enabled,
            pam_web_sso_enabled,
            token_validity_days,
            code_of_conduct_compliant,
            research_scholarship_compliant,
            ip_networks,
            administrators, message, email, isServiceAdmin,
            logo,
            warning,
            loading,
            hasAdministrators
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !initial && !this.isValid();
        const {user, config} = this.props;
        const isAdmin = user.admin;
        const title = isAdmin ? (isNew ? I18n.t("service.titleNew") : I18n.t("service.titleUpdate", {name: service.name}))
            : I18n.t("service.titleReadOnly", {name: service.name});
        const contactEmailRequired = !hasAdministrators && isEmpty(contact_email);
        return (
            <>
                {isNew && <UnitHeader obj={({name: I18n.t("models.services.new"), svg: ServicesIcon})}/>}
                {!isNew && <UnitHeader obj={service}
                                       name={service.name}
                                       history={user.admin && this.props.history}
                                       mayEdit={false}/>}
                <div className="mod-service">
                    <ConfirmationDialog isOpen={confirmationDialogOpen}
                                        cancel={cancelDialogAction}
                                        confirm={confirmationDialogAction}
                                        leavePage={leavePage}
                                        isWarning={warning}
                                        question={I18n.t("service.deleteConfirmation", {name: service.name})}/>

                    {this.serviceDetailTab(title, name, isAdmin, alreadyExists, initial, entity_id, abbreviation, description, uri, automatic_connection_allowed,
                        access_allowed_for_all, non_member_users_access_allowed, contact_email, support_email, security_email, invalidInputs, contactEmailRequired, accepted_user_policy, uri_info, privacy_policy,
                        isNew, service, disabledSubmit, allow_restricted_orgs, sirtfi_compliant, token_enabled, pam_web_sso_enabled, token_validity_days, code_of_conduct_compliant,
                        research_scholarship_compliant, config, ip_networks, administrators, message, email, logo, isServiceAdmin)}
                </div>
            </>);
    }

}

export default Service;
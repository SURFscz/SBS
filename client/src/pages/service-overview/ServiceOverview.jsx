import React from "react";
import {
    allCRMOrganisations,
    createServiceToken,
    deleteService,
    deleteServiceToken,
    parseSAMLMetaData,
    requestDeleteService,
    resetLdapPassword,
    resetOidcClientSecret,
    resetScimBearerToken,
    serviceAbbreviationExists,
    serviceAupDelete,
    serviceEntityIdExists,
    serviceNameExists,
    serviceTokenValue,
    sweep,
    updateService
} from "../../api";
import I18n from "../../locale/I18n";
import {ReactComponent as CriticalIcon} from "@surfnet/sds/icons/functional-icons/alert-circle.svg";
import {ReactComponent as ThrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import {ReactComponent as CheckIcon} from "@surfnet/sds/icons/functional-icons/success.svg";
import InputField from "../../components/input-field/InputField";
import "./ServiceOverview.scss";
import "../../components/_redesign/api-keys/ApiKeys.scss";
import Button from "../../components/button/Button";
import {setFlash} from "../../utils/Flash";
import {commaSeparatedArrayToValues, isEmpty, splitListSemantically, stopEvent} from "../../utils/Utils";
import {
    CO_SHORT_NAME,
    sanitizeShortName,
    SRAM_USERNAME,
    validEmailRegExp,
    validRedirectUrlRegExp,
    validUrlRegExp
} from "../../validations/regExps";
import {Tooltip} from "@surfnet/sds";
import DOMPurify from "dompurify";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import Entities from "../../components/_redesign/entities/Entities";
import ConfirmationDialog from "../../components/confirmation-dialog/ConfirmationDialog";
import ErrorIndicator from "../../components/_redesign/error-indicator/ErrorIndicator";
import CroppedImageField from "../../components/_redesign/cropped-image-field/CroppedImageField";
import SpinnerField from "../../components/_redesign/spinner-field/SpinnerField";
import CheckBox from "../../components/checkbox/CheckBox";
import SelectField from "../../components/select-field/SelectField";
import {dateFromEpoch} from "../../utils/Date";
import {isUserServiceAdmin} from "../../utils/UserRole";
import {SAMLMetaData} from "../../components/saml-metadata/SAMLMetaData";
import UploadButton from "../../components/upload-button/UploadButton";

const toc = ["general", "contacts", "policy", "SCIMServer", "SCIMClient", "ldap", "pamWebLogin", "tokens",
    "OIDC", "SAML", "Export"];

class ServiceOverview extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            required: ["name", "abbreviation", "logo", "security_email"],
            alreadyExists: {},
            invalidInputs: {},
            confirmationDialogOpen: false,
            cancelDialogAction: () => true,
            confirmationDialogAction: () => true,
            cancelButtonLabel: I18n.t("confirmationDialog.cancel"),
            confirmationTxt: null,
            confirmationHeader: null,
            ldapPassword: null,
            tokenValue: null,
            warning: false,
            isServiceAdmin: false,
            isServiceManager: false,
            hasAdministrators: false,
            currentTab: "general",
            createNewServiceToken: false,
            tokenType: null,
            description: "",
            hashedToken: null,
            initial: true,
            sweepSuccess: null,
            sweepResults: null,
            originalSCIMConfiguration: {},
            scimBearerToken: null,
            scimTokenChange: false,
            parsedSAMLMetaData: null,
            parsedSAMLMetaDataError: false,
            parsedSAMLMetaDataURLError: false,
            invalidRedirectUrls: {},
            invalidRedirectUrlHttpNonLocalHost: {},
            crmOrganisations: [],
            oidcClientSecret: null,
            oidcClientSecretModal: false
        }
    }

    UNSAFE_componentWillReceiveProps = nextProps => {
        const {service} = this.props;
        if (service !== nextProps.service) {
            this.componentDidMount(nextProps);
        }
    }

    componentDidMount = nextProps => {
        const {service, serviceAdmin, serviceManager, showServiceAdminView, user} = nextProps ? nextProps : this.props;
        const {params} = this.props.match;
        let tab = params.subTab || this.state.currentTab;
        if (!toc.includes(tab)) {
            tab = this.state.currentTab;
        }
        service.redirect_urls = commaSeparatedArrayToValues(service.redirect_urls);
        service.acs_locations = commaSeparatedArrayToValues(service.acs_locations);
        service.grants = commaSeparatedArrayToValues(service.grants);
        this.validateService(service, () => {
            this.setState({
                service: {...service},
                hasAdministrators: service.service_memberships.length > 0,
                isServiceAdmin: serviceAdmin,
                isServiceManager: serviceManager,
                currentTab: tab,
                originalSCIMConfiguration: {scim_bearer_token: service.scim_bearer_token, scim_url: service.scim_url},
                loading: false
            }, () => {
                const {saml_enabled, saml_metadata, saml_metadata_url} = this.state.service;
                if (user.admin && !showServiceAdminView) {
                    allCRMOrganisations().then(organisations => this.setState({
                        crmOrganisations: organisations.map(org => ({
                            label: `${org.name} (${org.crm_id})`,
                            value: org.id
                        }))
                    }))
                }
                if (saml_enabled && (!isEmpty(saml_metadata) || !isEmpty(saml_metadata_url))) {
                    parseSAMLMetaData(saml_metadata, saml_metadata_url)
                        .then(metaData => this.setState({
                            parsedSAMLMetaData: metaData.result,
                            parsedSAMLMetaDataError: false,
                            parsedSAMLMetaDataURLError: false
                        }))
                        .catch(() => this.setState({
                            parsedSAMLMetaData: null,
                            parsedSAMLMetaDataError: !isEmpty(saml_metadata_url),
                            parsedSAMLMetaDataURLError: !isEmpty(saml_metadata)
                        }))
                }
            });
        })
    };

    validateService = (service, callback) => {
        const invalidInputs = {};
        ["email"].forEach(name => {
            invalidInputs[name] = !(isEmpty(service[name]) || validEmailRegExp.test(service[name]));
        });
        ["security_email", "support_email"].forEach(name => {
            invalidInputs[name] = !(isEmpty(service[name]) || validEmailRegExp.test(service[name]) || validUrlRegExp.test(service[name]));
        });
        ["accepted_user_policy", "uri_info", "uri", "scim_url"].forEach(name => {
            let serviceElement = service[name];
            if (name === "uri" && !isEmpty(serviceElement)) {
                serviceElement = serviceElement.toLowerCase().replaceAll(CO_SHORT_NAME, "").replaceAll(SRAM_USERNAME, "");
            }
            invalidInputs[name] = !isEmpty(serviceElement) && !validUrlRegExp.test(serviceElement);
        });
        const invalidRedirectUrls = {};
        service.redirect_urls.forEach((url, index) => invalidRedirectUrls[index] = !validRedirectUrlRegExp.test(url));
        this.setState({invalidInputs: invalidInputs, invalidRedirectUrls: invalidRedirectUrls}, callback);
    }

    cancelDialogAction = () => {
        this.setState({confirmationDialogOpen: false}, () => setTimeout(() => this.setState({
            ldapPassword: null,
            tokenValue: null,
            scimTokenChange: false,
            oidcClientSecretModal: false,
            oidcClientSecret: null,
            scimBearerToken: null
        }), 5));
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
                scimTokenChange: false,
                sweepSuccess: null,
                ldapPassword: null,
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

    newServiceToken = tokenType => {
        serviceTokenValue().then(res => {
            this.setState({
                createNewServiceToken: true,
                description: "",
                tokenType: tokenType,
                hashedToken: res.value,
                initial: true
            });
        })
    }

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({createNewServiceToken: false, initial: true});
    }

    saveServiceToken = () => {
        const {hashedToken, description, service, tokenType} = this.state;
        if (isEmpty(description)) {
            this.setState({initial: false});
        } else {
            createServiceToken({
                hashed_token: hashedToken,
                description: description,
                token_type: tokenType,
                service_id: service.id,
                token_validity_days: service.token_validity_days
            }).then(() => {
                this.afterUpdate(service.name, "tokenAdded")
            });
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
                scimTokenChange: false,
                sweepSuccess: null,
                ldapPassword: null,
                oidcClientSecret: null,
                oidcClientSecretModal: false,
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
                    scimTokenChange: false,
                    sweepSuccess: null,
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

    oidcClientSecretResetAction = showConfirmation => {
        const {service} = this.state;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                cancelDialogAction: this.cancelDialogAction,
                confirmationDialogAction: () => this.oidcClientSecretResetAction(false),
                warning: false,
                lastAdminWarning: false,
                scimTokenChange: false,
                sweepSuccess: null,
                ldapPassword: null,
                oidcClientSecret: null,
                oidcClientSecretModal: false,
                confirmationHeader: I18n.t("confirmationDialog.title"),
                confirmationDialogQuestion: I18n.t("service.oidc.confirmation", {name: service.name}),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
            });
        } else {
            resetOidcClientSecret(service).then(res => {
                this.setState({
                    confirmationDialogOpen: true,
                    confirmationTxt: I18n.t("service.oidc.close"),
                    confirmationHeader: I18n.t("service.oidc.copy"),
                    cancelDialogAction: null,
                    confirmationDialogQuestion: I18n.t("service.oidc.info"),
                    oidcClientSecret: res.oidc_client_secret,
                    scimTokenChange: false,
                    oidcClientSecretModal: true,
                    sweepSuccess: null,
                    tokenValue: null,
                    loading: false,
                    confirmationDialogAction: this.cancelDialogAction
                });
            })
        }
    }

    renderOidcClientSecret = oidcClientSecret => {
        return (
            <div className="ldap-password">
                <InputField copyClipBoard={true} disabled={true} value={oidcClientSecret}/>
            </div>
        );
    }

    renderScimTokenChange = scimBearerToken => {
        return (
            <div className="scim-bearer-token">
                <InputField multiline={true}
                            value={scimBearerToken}
                            onChange={e => this.setState({scimBearerToken: e.target.value})}/>
            </div>
        );
    }

    scimTokenChangeAction = showConfirmation => {
        const {service, invalidInputs} = this.state;
        const {scim_url} = service;
        if (isEmpty(scim_url) || invalidInputs.scim_url) {
            this.setState({
                confirmationDialogOpen: true,
                cancelDialogAction: null,
                confirmationDialogAction: this.cancelDialogAction,
                warning: false,
                lastAdminWarning: false,
                scimTokenChange: false,
                sweepSuccess: null,
                ldapPassword: null,
                confirmationHeader: I18n.t("confirmationDialog.warning"),
                confirmationDialogQuestion: I18n.t("service.scim_token.scimUrlRequired"),
                confirmationTxt: I18n.t("confirmationDialog.ok"),
            });
        } else if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                cancelDialogAction: this.cancelDialogAction,
                confirmationDialogAction: () => this.scimTokenChangeAction(false),
                warning: false,
                lastAdminWarning: false,
                scimTokenChange: true,
                sweepSuccess: null,
                ldapPassword: null,
                confirmationHeader: I18n.t("confirmationDialog.title"),
                confirmationDialogQuestion: I18n.t("service.scim_token.confirmation", {name: service.name}),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
            });
        } else {
            const {scimBearerToken} = this.state;
            resetScimBearerToken(service, scimBearerToken)
                .then(() => {
                    setFlash(I18n.t("service.scim_token.success"));
                    this.setState({
                        confirmationDialogOpen: false,
                        scimTokenChange: false,
                        loading: false,
                        scimBearerToken: null,
                        "service": {...service, has_scim_bearer_token: true}
                    });
                })
        }
    }

    validateServiceName = e => serviceNameExists(e.target.value, this.props.service.name).then(json => {
        this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
    });

    validateServiceEntityId = (e, protocol) => {
        let val = e.target.value;
        if (protocol === "oidc") {
            val = val.replaceAll(":", "@");
        }
        serviceEntityIdExists(val, this.props.service.entity_id).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, entity_id: json}});
            if (protocol === "oidc") {
                const {service} = this.state;
                this.setState({service: {...service, entity_id: val}});
            }
        })
    };

    validateServiceAbbreviation = e => serviceAbbreviationExists(sanitizeShortName(e.target.value), this.props.service.abbreviation).then(json => {
        this.setState({alreadyExists: {...this.state.alreadyExists, abbreviation: json}});
    });

    validateEmail = (name, allowWebsite = false) => e => {
        const email = e.target.value;
        const {invalidInputs} = this.state;
        const valid = isEmpty(email) || validEmailRegExp.test(email) || (allowWebsite && validUrlRegExp.test(email));
        this.setState({invalidInputs: {...invalidInputs, [name]: !valid}});
    };

    validateURI = (name, acceptPlaceholders = false) => e => {
        const uri = e.target.value;
        const {invalidInputs, service} = this.state;
        const removedPlaceholders = acceptPlaceholders ? uri.toLowerCase().replaceAll(CO_SHORT_NAME, "").replaceAll(SRAM_USERNAME, "") : uri;
        const inValid = !isEmpty(uri) && !validUrlRegExp.test(removedPlaceholders);
        this.setState({invalidInputs: {...invalidInputs, [name]: inValid}});
        if (name === "saml_metadata_url" && !inValid && !isEmpty(uri)) {
            parseSAMLMetaData(null, uri)
                .then(metaData => this.setState({
                    service: {...service, saml_metadata: metaData.xml},
                    parsedSAMLMetaData: metaData.result,
                    parsedSAMLMetaDataURLError: false
                }))
                .catch(() => this.setState({
                    parsedSAMLMetaData: null,
                    parsedSAMLMetaDataURLError: true
                }))
        }
    };

    onFileUpload = e => {
        const files = e.target.files;
        if (!isEmpty(files)) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const metaData = reader.result.toString();
                this.setState({service: {...this.state.service, saml_metadata: metaData}});
                parseSAMLMetaData(metaData, null)
                    .then(metaData => this.setState({
                        parsedSAMLMetaData: metaData.result,
                        parsedSAMLMetaDataError: false
                    }))
                    .catch(() => this.setState({
                        parsedSAMLMetaData: null,
                        parsedSAMLMetaDataError: true
                    }))
            };
            reader.readAsText(file);
        }
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    delete = () => {
        const {service} = this.state;
        const {user} = this.props;
        const userServiceAdmin = isUserServiceAdmin(user, {id: service.id});
        if (!isEmpty(service.collaborations) && userServiceAdmin) {
            this.setState({
                confirmationDialogOpen: true,
                leavePage: false,
                confirmationDialogQuestion: I18n.t("service.deleteWarning"),
                confirmationTxt: I18n.t("confirmationDialog.ok"),
                cancelDialogAction: null,
                lastAdminWarning: false,
                scimTokenChange: false,
                sweepSuccess: null,
                ldapPassword: null,
                confirmationHeader: I18n.t("confirmationDialog.title"),
                confirmationDialogAction: this.closeConfirmationDialog
            });
        } else {
            this.setState({
                confirmationDialogOpen: true,
                leavePage: false,
                confirmationDialogQuestion: I18n.t(`service.${userServiceAdmin ? "requestDeleteConfirmation" : "deleteConfirmation"}`,
                    {name: service.name}),
                warning: true,
                lastAdminWarning: false,
                scimTokenChange: false,
                sweepSuccess: null,
                ldapPassword: null,
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                cancelDialogAction: this.closeConfirmationDialog,
                confirmationHeader: I18n.t("confirmationDialog.title"),
                confirmationDialogAction: userServiceAdmin ? this.doRequestDelete : this.doDelete
            });
        }
    };

    doDelete = () => {
        this.setState({loading: true});
        const {service} = this.state;
        deleteService(service.id).then(() => {
            setFlash(I18n.t("service.flash.deleted", {name: service.name}));
            this.props.history.push("/home");
        });
    };

    doRequestDelete = () => {
        this.setState({loading: true, confirmationDialogOpen: false});
        const {service} = this.state;
        requestDeleteService(service.id).then(() => {
            this.setState({loading: false});
            setFlash(I18n.t("service.flash.requestDeleted", {name: service.name}));
        });
    }

    doDeleteToken = serviceToken => {
        this.setState({loading: true});
        const {service} = this.state;
        deleteServiceToken(serviceToken.id).then(() => {
            this.afterUpdate(service.name, "tokenDeleted");
        });
    };

    isValid = () => {
        return toc.every(tab => this.isValidTab(tab));
    };

    renderSAMLMetaData = parsedSAMLMetaData => {
        return <SAMLMetaData parsedSAMLMetaData={parsedSAMLMetaData}/>;
    }

    doSweep = (service, override) => {
        const {originalSCIMConfiguration} = this.state;
        if (!override && (originalSCIMConfiguration.scim_url !== service.scim_url || originalSCIMConfiguration.scim_bearer_token !== service.scim_bearer_token)) {
            this.setState({
                sweepSuccess: null,
                confirmationDialogQuestion: I18n.t("service.sweep.saveBeforeTestQuestion"),
                confirmationDialogAction: () => this.submit(false, true),
                confirmationHeader: I18n.t("service.sweep.saveBeforeTest"),
                cancelButtonLabel: I18n.t("forms.ignore"),
                confirmationTxt: I18n.t("confirmationDialog.confirm"),
                warning: false,
                lastAdminWarning: false,
                scimTokenChange: false,
                ldapPassword: null,
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}, () => this.doSweep(service, true)),
                confirmationDialogOpen: true
            });
        } else {
            this.setState({loading: true});
            sweep(service).then(res => {
                this.setState({
                    loading: false,
                    sweepSuccess: true,
                    sweepResults: res,
                    lastAdminWarning: false,
                    scimTokenChange: false,
                    ldapPassword: null,
                    confirmationDialogQuestion: null,
                    cancelButtonLabel: I18n.t("confirmationDialog.cancel"),
                    confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
                    confirmationHeader: I18n.t("service.sweep.test"),
                    confirmationTxt: I18n.t("confirmationDialog.ok"),
                    warning: false,
                    cancelDialogAction: null,
                    confirmationDialogOpen: true
                });
            }).catch(e => {
                this.setState({
                    loading: false,
                    sweepSuccess: false,
                    confirmationDialogQuestion: null,
                    confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
                    confirmationHeader: I18n.t("service.sweep.test"),
                    confirmationTxt: I18n.t("confirmationDialog.ok"),
                    warning: false,
                    cancelDialogAction: null,
                    confirmationDialogOpen: true
                });
                if (e.response && e.response.json) {
                    e.response.json().then(res => {
                        this.setState({
                            sweepResults: res,
                        });
                    })
                }
            })

        }
    }

    isValidTab = tab => {
        const {alreadyExists, invalidInputs, hasAdministrators, service, initial, invalidRedirectUrls} = this.state;
        const {
            contact_email, redirect_urls, saml_metadata, saml_metadata_url, providing_organisation,
            oidc_enabled, saml_enabled, grants, entity_id
        } = service;
        const contactEmailRequired = !hasAdministrators && isEmpty(contact_email);

        switch (tab) {
            case "general":
                return !isEmpty(service.name) && !alreadyExists.name && !isEmpty(service.abbreviation)
                    && !alreadyExists.abbreviation && !isEmpty(service.logo) && !invalidInputs.uri
                    && !isEmpty(providing_organisation);
            case "contacts":
                return !isEmpty(service.security_email) && !contactEmailRequired && !invalidInputs.email && !invalidInputs.security_email && !invalidInputs.support_email
            case "policy":
                return !invalidInputs.privacy_policy && !invalidInputs.accepted_user_policy;
            case "SCIMServer":
                return !invalidInputs.scim_url && !(service.scim_enabled && isEmpty(service.scim_url) && !initial);
            case "SCIMClient":
                return true;
            case "ldap":
                return true;
            case "tokens":
                return true;
            case "pamWebLogin":
                return true;
            case "OIDC":
                return !oidc_enabled ||
                    (!isEmpty(redirect_urls) && Object.keys(invalidRedirectUrls).some(val => val) && !isEmpty(grants)
                        && !isEmpty(entity_id));
            case "SAML":
                return !saml_enabled || (!isEmpty(saml_metadata) || !isEmpty(saml_metadata_url)) && !isEmpty(entity_id);
            case "Export":
                return true;
            default:
                throw new Error(`unknown-tab: ${tab}`);
        }
    }

    submit = (override, sweepAfterwards = false) => {
        this.setState({initial: false}, () => {
            if (this.isValid()) {
                const {service} = this.state;
                const tokenInfo = [
                    {
                        type: "scim",
                        label: I18n.t("serviceDetails.toc.SCIMClient"),
                        enabled: "scim_client_enabled"
                    }, {
                        type: "pam",
                        label: I18n.t("serviceDetails.toc.pamWebLogin"),
                        enabled: "pam_web_sso_enabled"
                    }, {
                        type: "introspection",
                        label: I18n.t("serviceDetails.toc.tokens"),
                        enabled: "token_enabled"
                    }
                ]
                tokenInfo.forEach(obj => obj.count = service.service_tokens.filter(token => token.token_type === obj.type).length);
                const filteredTokenInfo = tokenInfo
                    .filter(obj => obj.count > 0 && !service[obj.enabled]);
                const count = filteredTokenInfo.reduce((acc, info) => {
                    acc = acc + info.count;
                    return acc;
                }, 0);
                const types = filteredTokenInfo.map(info => info.label);
                const typesInfo = splitListSemantically(types, I18n.t("service.compliancySeparator"));
                const question = I18n.t("serviceDetails.disableTokenConfirmation", {
                    count: count,
                    type: typesInfo,
                    tokens: I18n.t(`serviceDetails.${count > 1 ? "multiple" : "single"}Tokens`)
                })
                if (!isEmpty(filteredTokenInfo) && !override) {
                    this.setState({
                        confirmationDialogOpen: true,
                        leavePage: false,
                        lastAdminWarning: false,
                        scimTokenChange: false,
                        sweepSuccess: null,
                        ldapPassword: null,
                        confirmationDialogQuestion: question,
                        warning: true,
                        confirmationTxt: I18n.t("confirmationDialog.confirm"),
                        cancelDialogAction: this.closeConfirmationDialog,
                        confirmationHeader: I18n.t("confirmationDialog.title"),
                        confirmationDialogAction: () => this.submit(true)
                    });
                } else {
                    this.setState({loading: true});
                    const {name, redirect_urls, grants, acs_locations, entity_id} = service;
                    service.entity_id = service.oidc_enabled ? entity_id.replaceAll(":", "@").trim() : entity_id.trim();
                    ["name"].forEach(attr => service[attr] = service[attr] ? service[attr].trim() : null)
                    const newService = {
                        ...service,
                        sweep_scim_daily_rate: service.sweep_scim_daily_rate ? service.sweep_scim_daily_rate.value : 0,
                        redirect_urls: isEmpty(redirect_urls) ? null : redirect_urls.join(","),
                        grants: isEmpty(grants) ? null : grants.join(","),
                        acs_locations: isEmpty(acs_locations) ? null : acs_locations.join(",")
                    };
                    updateService(newService)
                        .then(() => this.afterUpdate(name, "updated", sweepAfterwards))
                        .catch(() => this.setState({loading: false}));
                }
            } else {
                window.scrollTo(0, 0);
            }
        });
    };

    afterUpdate = (name, action, sweepAfterwards = false) => {
        setFlash(I18n.t(`service.flash.${action}`, {name: name}));
        this.setState({loading: false, initial: false, createNewServiceToken: false, confirmationDialogOpen: false});
        this.props.refresh(() => {
            this.componentDidMount();
            if (sweepAfterwards) {
                setTimeout(() => this.doSweep(this.state.service, true), 275)
            }
        });
    };

    changeTab = tab => e => {
        stopEvent(e);
        this.setState({
            currentTab: tab,
            createNewServiceToken: false,
            sweepSuccess: null,
            sweepResults: null,
        }, () => this.props.history.replace(`/services/${this.state.service.id}/details/${tab}`));
    }

    getInvalidTabs = () => {
        const invalidTabs = toc.filter(item => !this.isValidTab(item))
            .map(item => I18n.t(`serviceDetails.toc.${item}`)).join(", ");
        if (invalidTabs.length > 0) {
            return I18n.t(`serviceDetails.updateDisabled`, {invalid: invalidTabs});
        }
        return null;
    }

    sidebar = (currentTab, isManageEnabled, showServiceAdminView) => {
        return (
            <div className={"side-bar"}>
                <ul>
                    {toc.filter(tab => !showServiceAdminView || tab !== "Export")
                        .filter(tab => isManageEnabled || (tab !== "OIDC" && tab !== "SAML"))
                        .map(item => <li key={item} className={`${item === currentTab ? "active" : ""}`}>
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
        if (typeof value === "string" && isEmpty(value)) {
            value = null;
        }
        this.setState({alreadyExists, invalidInputs, "service": {...service, [name]: value}});
    }

    removeServiceToken = serviceToken => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            confirmationDialogQuestion: I18n.t("serviceDetails.tokenDeleteConfirmation"),
            warning: true,
            lastAdminWarning: false,
            scimTokenChange: false,
            sweepSuccess: null,
            ldapPassword: null,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationHeader: I18n.t("confirmationDialog.title"),
            confirmationDialogAction: () => this.doDeleteToken(serviceToken)
        });
    };

    addRedirectURL = e => {
        stopEvent(e);
        const {service} = this.state;
        const newRedirectUrls = [...service.redirect_urls];
        newRedirectUrls.push("");
        this.setState({
            service: {...service, redirect_urls: newRedirectUrls}
        });
    }

    removeRedirectURL = (e, index) => {
        stopEvent(e);
        const {service} = this.state;
        const newRedirectUrls = [...service.redirect_urls];
        newRedirectUrls.splice(index, 1);
        this.setState({
            service: {...service, redirect_urls: [...newRedirectUrls]}
        });
    }

    redirectUrlChanged = (e, index) => {
        const {service, invalidRedirectUrls, invalidRedirectUrlHttpNonLocalHost} = this.state;
        const newRedirectUrls = [...service.redirect_urls];
        const value = e.target.value;
        newRedirectUrls[index] = value;
        this.setState({
            invalidRedirectUrls: {...invalidRedirectUrls, [index]: false},
            invalidRedirectUrlHttpNonLocalHost: {...invalidRedirectUrlHttpNonLocalHost, [index]: false},
            service: {...service, redirect_urls: newRedirectUrls}
        });
    }

    validateRedirectUrl = (e, index) => {
        const {invalidRedirectUrls, invalidRedirectUrlHttpNonLocalHost} = this.state;
        const value = e.target.value;
        const nonLocalHost = value.startsWith("http://") && !value.startsWith("http://localhost");
        const valid = validRedirectUrlRegExp.test(value);
        this.setState({
            invalidRedirectUrls: {...invalidRedirectUrls, [index]: !valid},
            invalidRedirectUrlHttpNonLocalHost: {...invalidRedirectUrlHttpNonLocalHost, [index]: nonLocalHost}
        });
    }

    toggleGrant = (grantName, toggleValue) => {
        const {service} = this.state;
        const {grants} = service;
        let newGrants = [...grants];
        if (toggleValue) {
            newGrants.push(grantName);
        } else {
            newGrants = newGrants.filter(grant => grant !== grantName);
        }
        this.setState({service: {...service, grants: newGrants}});
    }

    grantsChanged = (selectedOptions, service) => {
        const newGrants = selectedOptions === null ? [] : Array.isArray(selectedOptions) ? [...selectedOptions] : [selectedOptions];
        this.setState({
            service: {
                ...service, grants: newGrants
            }
        });
    }

    renderButtons = (isAdmin, isServiceAdmin, disabledSubmit, currentTab, showServiceAdminView, createNewServiceToken,
                     service, invalidInputs) => {
        const invalidTabsMsg = this.getInvalidTabs();
        return <>
            {!createNewServiceToken &&
                <div className={"actions-container"}>
                    {invalidTabsMsg && <span className={"error"}>{invalidTabsMsg}</span>}
                    <section className="actions">
                        {(currentTab === "general") &&
                            <Button warningButton={true}
                                    disabled={!isAdmin && !isServiceAdmin}
                                    onClick={this.delete}/>}
                        {currentTab === "SCIMServer" &&
                            <Tooltip tip={I18n.t("service.sweep.testTooltip")} children={
                                <Button txt={I18n.t("service.sweep.test")}
                                        disabled={!service.scim_enabled || (!isAdmin && !isServiceAdmin) || isEmpty(service.scim_url) || invalidInputs.scim_url}
                                        onClick={() => this.doSweep(service)}/>
                            }/>}
                        <Button disabled={disabledSubmit || (!isAdmin && !isServiceAdmin)}
                                txt={I18n.t("service.update")}
                                onClick={this.submit}/>
                    </section>
                </div>}
        </>
    }

    renderPamWebLogin = (service, isAdmin, isServiceAdmin, createNewServiceToken, tokenType) => {
        if (createNewServiceToken) {
            return this.renderNewServiceTokenForm();
        }

        return (
            <div className={"pamWebLogin"}>
                <CheckBox name={"pam_web_sso_enabled"}
                          value={service.pam_web_sso_enabled || false}
                          onChange={e => this.setState({
                              "service": {
                                  ...service, pam_web_sso_enabled: e.target.checked
                              }
                          })}
                          readOnly={!isAdmin && !isServiceAdmin}
                          tooltip={I18n.t("userTokens.pamWebSSOEnabledTooltip")}
                          info={I18n.t("userTokens.pamWebSSOEnabled")}
                />
                {!service.pam_web_sso_enabled && <p>{I18n.t("service.pamWebSSO.pamWebSSODisclaimer")}</p>}
                {service.pam_web_sso_enabled &&
                    this.renderServiceTokens(service, isServiceAdmin, service.pam_web_sso_enabled, tokenType, I18n.t("userTokens.pamWebSSOEnabled"))}
            </div>
        )
    }

    renderSCIMClient = (service, isAdmin, isServiceAdmin, showServiceAdminView, createNewServiceToken, tokenType) => {
        if (createNewServiceToken) {
            return this.renderNewServiceTokenForm();
        }
        return (
            <div className="scim">
                <CheckBox name={"scim_client_enabled"}
                          value={service.scim_client_enabled || false}
                          tooltip={I18n.t("scim.scimClientEnabledTooltip")}
                          info={I18n.t("scim.scimClientEnabled")}
                          readOnly={!isAdmin && !isServiceAdmin}
                          onChange={e => this.setState({
                              "service": {
                                  ...service, scim_client_enabled: e.target.checked
                              }
                          })}
                />
                {!service.scim_client_enabled &&
                    <p>{I18n.t("scim.scimClientDisclaimer")}</p>
                }
                {service.scim_client_enabled &&
                    this.renderServiceTokens(service, isServiceAdmin, service.scim_client_enabled, tokenType, I18n.t("scim.scimClientEnabled"))}
            </div>
        )
    }

    renderScimResults = (service, sweepSuccess, sweepResults) => {
        return (
            <div className="sweep-results">
                <p className={sweepSuccess ? "success" : "failure"}>{sweepSuccess ? <CheckIcon/> : <CriticalIcon/>}
                    {I18n.t(`service.sweep.${sweepSuccess ? "success" : "failure"}`,
                        {url: sweepResults?.scim_url})}</p>
                {(!isEmpty(sweepResults) && sweepResults.error) && <div className="response">
                    <p>{I18n.t("service.sweep.response")}</p>
                    <em>{sweepResults.error}</em>
                </div>}
            </div>
        );
    }

    renderSCIMServer = (service, isAdmin, isServiceAdmin, showServiceAdminView, alreadyExists, invalidInputs, initial) => {
        let sweepScimDailyRate = null;
        if (service.sweep_scim_enabled && service.sweep_scim_daily_rate && service.sweep_scim_daily_rate.value) {
            sweepScimDailyRate = service.sweep_scim_daily_rate
        } else if (service.sweep_scim_enabled && service.sweep_scim_daily_rate !== null && service.sweep_scim_daily_rate !== 0) {
            sweepScimDailyRate = {
                label: service.sweep_scim_daily_rate, value: parseInt(service.sweep_scim_daily_rate, 10)
            }
        }
        return (
            <div className={"scim"}>
                <CheckBox name={"scim_enabled"}
                          value={service.scim_enabled || false}
                          tooltip={I18n.t("scim.scimEnabledTooltip")}
                          info={I18n.t("scim.scimEnabled")}
                          readOnly={!isAdmin && !isServiceAdmin}
                          onChange={e => this.setState({"service": {...service, scim_enabled: e.target.checked}})}
                />
                {!service.scim_enabled && <p>{I18n.t("scim.scimDisclaimer")}</p>}
                {service.scim_enabled && <>
                    <InputField value={service.scim_url}
                                name={I18n.t("scim.scimURL")}
                                placeholder={I18n.t("scim.scimURLPlaceHolder")}
                                onChange={e => this.changeServiceProperty("scim_url", false, alreadyExists, {
                                    ...invalidInputs,
                                    scim_url: false
                                })(e)}
                                toolTip={I18n.t("scim.scimURLTooltip")}
                                error={invalidInputs.scim_url || (!initial && isEmpty(service.scim_url) && service.scim_enabled)}
                                onBlur={this.validateURI("scim_url")}
                                disabled={!service.scim_enabled || (!isAdmin && !isServiceAdmin)}/>
                    {invalidInputs.scim_url &&
                        <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}
                    {(!initial && isEmpty(service.scim_url) && service.scim_enabled) &&
                        <ErrorIndicator msg={I18n.t("models.userTokens.required", {
                            attribute: I18n.t("scim.scimURL")
                        })}/>}

                    {(service.scim_enabled && (isAdmin || isServiceAdmin)) &&
                        <div className="input-field sds--text-field">
                            <label htmlFor="">{I18n.t("scim.scimBearerToken")}
                                <Tooltip tip={I18n.t("scim.scimBearerTokenTooltip")}/>
                            </label>
                            <div className="scim-token-link">
                                <span>{I18n.t(`service.scim_token.preTitle${service.has_scim_bearer_token ? "" : "NoToken"}`)}
                                    {(isAdmin || isServiceAdmin) &&
                                        <a href="/scim/Scim"
                                           onClick={e => {
                                               stopEvent(e);
                                               this.scimTokenChangeAction(true)
                                           }}>
                                            {I18n.t(`service.scim_token.title${service.has_scim_bearer_token ? "" : "NoToken"}`)}
                                        </a>}
                                </span>
                            </div>
                        </div>}

                    <CheckBox name={"sweep_scim_enabled"}
                              value={service.sweep_scim_enabled || false}
                              tooltip={I18n.t("scim.sweepScimEnabledTooltip")}
                              info={I18n.t("scim.sweepScimEnabled")}
                              readOnly={!service.scim_enabled || (!isAdmin && !isServiceAdmin)}
                              onChange={e => this.setState({
                                  "service": {
                                      ...service,
                                      sweep_scim_enabled: e.target.checked,
                                      sweep_scim_daily_rate: e.target.checked ? {label: 1, value: 1} : null
                                  }
                              })}
                    />

                    <CheckBox name={"sweep_remove_orphans"}
                              value={(service.sweep_remove_orphans && service.sweep_scim_enabled) || false}
                              tooltip={I18n.t("scim.scimSweepDeleteOrphansTooltip")}
                              info={I18n.t("scim.scimSweepDeleteOrphans")}
                              readOnly={!service.scim_enabled || !service.sweep_scim_enabled || (!isAdmin && !isServiceAdmin)}
                              onChange={e => this.setState({
                                  "service": {
                                      ...service, sweep_remove_orphans: e.target.checked
                                  }
                              })}
                    />

                    <SelectField value={sweepScimDailyRate}
                                 options={[...Array(25).keys()].filter(i => i % 4 === 0).map(i => ({
                                     label: i === 0 ? 1 : i, value: i === 0 ? 1 : i
                                 }))}
                                 name={I18n.t("scim.sweepScimDailyRate")}
                                 toolTip={I18n.t("scim.sweepScimDailyRateTooltip")}
                                 disabled={!service.scim_enabled || !service.sweep_scim_enabled || (!isAdmin && !isServiceAdmin)}
                                 onChange={item => this.setState({
                                     "service": {
                                         ...service, sweep_scim_daily_rate: item
                                     }
                                 })}/>
                </>}
            </div>
        )
    }

    renderNewServiceTokenForm = () => {
        const {description, hashedToken, initial, tokenType} = this.state;
        return (<div className="api-key-container">
            <div>
                <a href={"/#cancel"} className={"back-to-api-keys"} onClick={this.cancelSideScreen}>
                    <ChevronLeft/>{I18n.t("serviceDetails.backToApiKeys")}
                </a>
            </div>
            <div className="new-api-key">
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("serviceDetails.secretDisclaimer"))}}/>
                <InputField value={hashedToken}
                            name={I18n.t("serviceDetails.secret")}
                            toolTip={I18n.t("serviceDetails.secretTooltip")}
                            disabled={true}
                            copyClipBoard={true}/>

                <InputField value={description}
                            onChange={e => this.setState({description: e.target.value})}
                            placeholder={I18n.t("serviceDetails.descriptionPlaceHolder")}
                            error={(!initial && isEmpty(description))}
                            name={I18n.t("serviceDetails.description")}
                            toolTip={I18n.t("serviceDetails.descriptionTooltip")}
                            required={true}
                />
                {(!initial && isEmpty(description)) && <ErrorIndicator
                    msg={I18n.t("models.userTokens.required", {
                        attribute: I18n.t("serviceDetails.description").toLowerCase()
                    })}/>}
                <InputField value={tokenType.toUpperCase()}
                            name={I18n.t("serviceDetails.tokenType")}
                            disabled={true}
                            toolTip={I18n.t("serviceDetails.tokenTypeTooltip", {tokenType: tokenType})}
                />
                <section className="actions">
                    <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancelSideScreen}/>
                    <Button txt={I18n.t("forms.submit")}
                            disabled={!initial && isEmpty(description)}
                            onClick={this.saveServiceToken}/>
                </section>
            </div>

        </div>);
    }

    renderTokens = (config, service, isAdmin, isServiceAdmin, createNewServiceToken, tokenType) => {
        if (createNewServiceToken) {
            return this.renderNewServiceTokenForm();
        }

        return (
            <div className={"tokens"}>
                <CheckBox name={"token_enabled"}
                          value={service.token_enabled || false}
                          tooltip={I18n.t("userTokens.tokenEnabledTooltip")}
                          info={I18n.t("userTokens.tokenEnabled")}
                          readOnly={!isAdmin && !isServiceAdmin}
                          onChange={e => this.setState({
                              "service": {
                                  ...service,
                                  token_enabled: e.target.checked,
                                  token_validity_days: e.target.checked ? 1 : ""
                              }
                          })}
                />
                {!service.token_enabled && <p>{I18n.t("userTokens.userTokenDisclaimer")}</p>}
                {service.token_enabled &&
                    <>
                        <InputField value={config.introspect_endpoint}
                                    name={I18n.t("userTokens.introspectionEndpoint")}
                                    copyClipBoard={true}
                                    disabled={true}/>

                        <InputField value={service.token_validity_days}
                                    name={I18n.t("userTokens.tokenValidityDays")}
                                    maxLength={3}
                                    tooltip={I18n.t("userTokens.tokenValidityDaysTooltip")}
                                    onChange={e => this.setState({
                                        "service": {
                                            ...service, token_validity_days: e.target.value.replace(/\D/, "")
                                        }
                                    })}
                                    disabled={!service.token_enabled || (!isAdmin && !isServiceAdmin)}/>

                        {this.renderServiceTokens(service, isServiceAdmin, service.token_enabled, tokenType,
                            I18n.t("userTokens.tokenEnabled").toLowerCase())}
                    </>}
            </div>
        )
    }

    renderServiceTokens = (service, isServiceAdmin, enabled, tokenType, action) => {
        const columns = [{
            key: "hashed_token",
            header: I18n.t("serviceDetails.hashedToken"),
            mapper: () => I18n.t("serviceDetails.tokenValue"),
        }, {
            key: "description",
            header: I18n.t("serviceDetails.description"),
            mapper: serviceToken => <span className={"cut-of-lines"}>{serviceToken.description}</span>
        }, {
            key: "token_type",
            header: I18n.t("serviceDetails.tokenType"),
            mapper: serviceToken => <span>{serviceToken.token_type.toUpperCase()}</span>
        }, {
            key: "created_at",
            header: I18n.t("models.userTokens.createdAt"),
            mapper: serviceToken => dateFromEpoch(serviceToken.created_at)
        }]
        if (isServiceAdmin) {
            columns.push({
                nonSortable: true,
                key: "trash",
                header: "",
                mapper: serviceToken => <span onClick={() => this.removeServiceToken(serviceToken)}>
                    <ThrashIcon/>
                </span>
            })
        }
        const customNoEntities = enabled ? I18n.t("serviceDetails.noTokens") : I18n.t("serviceDetails.enableTokens", {action: action});
        return <>
            <div className="input-field">
                <label className={"service-details-tokens"}>{I18n.t("serviceDetails.tokens")}
                    <Tooltip tip={I18n.t(`serviceDetails.tokensTooltips.${tokenType}`)}/>
                </label>
                <Entities
                    entities={enabled ? service.service_tokens.filter(token => token.token_type === tokenType) : []}
                    modelName="serviceTokens"
                    defaultSort="description"
                    columns={columns}
                    loading={false}
                    customNoEntities={customNoEntities}
                    showNew={false}
                    hideTitle={true}
                    displaySearch={false}
                    {...this.props}/>
                {(enabled && isServiceAdmin) &&
                    <div className="add-token-link">
                        <a href="/token"
                           onClick={e => {
                               stopEvent(e);
                               this.newServiceToken(tokenType)
                           }}>{I18n.t("serviceDetails.addToken")}</a>
                    </div>}
            </div>
        </>
    }

    renderLdap = (config, service, isAdmin, isServiceAdmin) => {
        const ldapBindAccount = config.ldap_bind_account;
        const {ldap_identifier, ldap_enabled} = this.state.service;
        return (
            <div className={"ldap"}>
                <CheckBox name={"ldap_enabled"}
                          value={service.ldap_enabled || false}
                          tooltip={I18n.t("service.ldap.ldapEnabledTooltip")}
                          info={I18n.t("service.ldap.ldapClient")}
                          readOnly={!isAdmin && !isServiceAdmin}
                          onChange={e => this.setState({
                              "service": {
                                  ...service, ldap_enabled: e.target.checked
                              }
                          })}
                />
                {!service.ldap_enabled &&
                    <p>{I18n.t("service.ldap.ldapDisclaimer")}</p>
                }
                {service.ldap_enabled && <div>
                    <InputField value={config.ldap_url}
                                name={I18n.t("service.ldap.section")}
                                toolTip={I18n.t("service.ldap.urlTooltip")}
                                copyClipBoard={true}
                                disabled={true}/>
                    <InputField
                        value={ldapBindAccount.substring(ldapBindAccount.indexOf(",") + 1).replace("entity_id", ldap_identifier)}
                        name={I18n.t("service.ldap.basedn")}
                        toolTip={I18n.t("service.ldap.basednTooltip")}
                        copyClipBoard={true}
                        disabled={true}/>
                    <InputField value={ldapBindAccount.replace("entity_id", ldap_identifier)}
                                name={I18n.t("service.ldap.username")}
                                toolTip={I18n.t("service.ldap.usernameTooltip")}
                                copyClipBoard={true}
                                disabled={true}/>
                    <div className="ip-networks">
                        {(ldap_enabled) &&
                            <div className="add-token-link">
                                <span>{I18n.t("service.ldap.preTitle")}
                                    {(isAdmin || isServiceAdmin) && <a href="/token"
                                                                       onClick={e => {
                                                                           stopEvent(e);
                                                                           this.ldapResetAction(true)
                                                                       }}>{I18n.t("service.ldap.title")}</a>}
                                    </span>
                            </div>}
                    </div>
                </div>}
            </div>)
    }

    renderOidc = (config, service, isAdmin, isServiceAdmin, alreadyExists, showServiceAdminView, oidcClientSecret,
                  oidcClientSecretModal) => {
        const {invalidRedirectUrls, invalidRedirectUrlHttpNonLocalHost} = this.state;
        const {redirect_urls, grants} = this.state.service;
        return (
            <div className="oidc">
                <CheckBox name={"oidc_enabled"}
                          value={service.oidc_enabled || false}
                          tooltip={I18n.t("service.oidc.oidcEnabledTooltip")}
                          info={I18n.t("service.oidc.oidcClient")}
                          readOnly={service.saml_enabled || !isAdmin}
                          onChange={e => this.oidcEnabledChanged(service, e)}
                />
                {(!service.oidc_enabled && !service.saml_enabled) &&
                    <p>{I18n.t("service.oidc.oidcDisclaimer")}</p>
                }
                {(!service.oidc_enabled && service.saml_enabled) &&
                    <p>{I18n.t("service.oidc.oidcDisabledExclusivity")}</p>}
                {service.oidc_enabled &&
                    <>
                        <InputField value={service.entity_id}
                                    onChange={this.changeServiceProperty("entity_id", false, {
                                        ...alreadyExists, entity_id: false
                                    })}
                                    placeholder={I18n.t("service.entity_idPlaceHolder")}
                                    onBlur={e => this.validateServiceEntityId(e, "oidc")}
                                    name={I18n.t("service.entity_id")}
                                    toolTip={I18n.t("service.entity_idTooltip")}
                                    required={true}
                                    error={alreadyExists.entity_id || isEmpty(service.entity_id)}
                                    copyClipBoard={true}
                                    disabled={!isAdmin || showServiceAdminView}/>
                        {alreadyExists.entity_id && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                            attribute: I18n.t("service.entity_id").toLowerCase(), value: service.entity_id
                        })}/>}
                        {isEmpty(service.entity_id) && <ErrorIndicator msg={I18n.t("service.required", {
                            attribute: I18n.t("service.entity_id").toLowerCase()
                        })}/>}

                        <CheckBox name={I18n.t("service.grants.authorization_code")}
                                  value={grants.includes("authorization_code")}
                                  info={I18n.t("service.grants.authorization_code")}
                                  onChange={e => this.toggleGrant("authorization_code", e.target.checked)}
                        />

                        <div className="redirect_urls">
                            {Array.isArray(redirect_urls) && redirect_urls.map((redirectUrl, index) =>
                                <div className="redirect_url">
                                    <InputField key={index}
                                                value={redirectUrl}
                                                name={index === 0 ? I18n.t("service.openIDConnectRedirects") : null}
                                                toolTip={I18n.t("service.openIDConnectRedirectsTooltip")}
                                                onChange={e => this.redirectUrlChanged(e, index)}
                                                error={invalidRedirectUrls[index] || invalidRedirectUrlHttpNonLocalHost[index]}
                                                onBlur={e => this.validateRedirectUrl(e, index)}
                                                onDelete={index > 0 ? e => this.removeRedirectURL(e, index) : null}
                                    />
                                    {invalidRedirectUrls[index] &&
                                        <ErrorIndicator
                                            msg={I18n.t("forms.invalidInput", {name: `URL: ${redirectUrl}`})}
                                            subMsg={invalidRedirectUrlHttpNonLocalHost[index]
                                                ? I18n.t("forms.invalidRedirectUrl") : null}/>}

                                </div>)}
                            {isEmpty(redirect_urls.filter(url => !isEmpty(url))) &&
                                <ErrorIndicator
                                    msg={I18n.t("service.required", {attribute: I18n.t("service.openIDConnectRedirects")})}/>}
                            <div className={"add-redirect-url"}>
                                <a onClick={this.addRedirectURL}>{I18n.t("service.oidc.addRedirectURL")}</a>
                            </div>
                        </div>

                        <CheckBox name={"is_public_client"}
                                  value={service.is_public_client}
                                  onChange={() => this.setState({
                                      service: {
                                          ...service,
                                          is_public_client: !service.is_public_client
                                      }
                                  })}
                                  tooltip={I18n.t("service.isPublicClientTooltip")}
                                  info={I18n.t("service.isPublicClient")}
                        />
                        {(oidcClientSecret && !service.is_public_client && !oidcClientSecretModal) &&
                            <div className="new-oidc-secret">
                                <InputField value={oidcClientSecret}
                                            name={I18n.t("service.oidc.oidcClientSecret")}
                                            toolTip={I18n.t("service.oidc.oidcClientSecretTooltip")}
                                            disabled={true}
                                            copyClipBoard={true}
                                            extraInfo={I18n.t("service.oidc.oidcClientSecretDisclaimer")}/>
                            </div>}
                        {(!oidcClientSecret && !service.is_public_client) &&
                            <div className="add-token-link">
                                <span>{I18n.t("service.oidc.preTitle")}
                                    {(isAdmin || isServiceAdmin) &&
                                        <a href="/secret"
                                           onClick={e => {
                                               stopEvent(e);
                                               this.oidcClientSecretResetAction(true)
                                           }}>{I18n.t("service.oidc.title")}</a>}
                                    ¬                                </span>
                            </div>}
                    </>}
            </div>)
    }

    oidcEnabledChanged = (service, e) => {
        this.setState({
            service: {
                ...service,
                oidc_enabled: e.target.checked,
                redirect_urls: [""],
                saml_enabled: e.target.checked ? false : service.saml_enabled,
                grants: e.target.checked ? ["authorization_code"] : []
            }
        });
        if (e.target.checked) {
            resetOidcClientSecret(service)
                .then(res => this.setState({
                    oidcClientSecret: res.oidc_client_secret
                }));
        } else {
            this.setState({oidcClientSecret: null});
        }
    }

    renderSAML = (config, service, isAdmin, isServiceAdmin, invalidInputs, alreadyExists, showServiceAdminView) => {
        const {parsedSAMLMetaData, parsedSAMLMetaDataError, parsedSAMLMetaDataURLError} = this.state;
        return (
            <div className="saml">
                <CheckBox name={"saml_enabled"}
                          value={service.saml_enabled || false}
                          tooltip={I18n.t("service.saml.samlEnabledTooltip")}
                          info={I18n.t("service.saml.samlClient")}
                          readOnly={service.oidc_enabled || !isAdmin}
                          onChange={e => this.setState({
                              service: {
                                  ...service,
                                  saml_enabled: e.target.checked,
                                  oidc_enabled: e.target.checked ? false : service.oidc_enabled
                              }
                          })}
                />
                {(!service.saml_enabled && !service.oidc_enabled) &&
                    <p>{I18n.t("service.saml.samlDisclaimer")}</p>}
                {(!service.saml_enabled && service.oidc_enabled) &&
                    <p>{I18n.t("service.saml.samlDisabledExclusivity")}</p>}
                {service.saml_enabled &&
                    <div>
                        <div className="meta-data-section">
                            <div>
                                <InputField value={service.entity_id}
                                            onChange={this.changeServiceProperty("entity_id", false, {
                                                ...alreadyExists, entity_id: false
                                            })}
                                            placeholder={I18n.t("service.entity_idPlaceHolder")}
                                            onBlur={e => this.validateServiceEntityId(e, "saml")}
                                            name={I18n.t("service.entity_id")}
                                            toolTip={I18n.t("service.entity_idTooltip")}
                                            required={true}
                                            error={alreadyExists.entity_id || isEmpty(service.entity_id)}
                                            copyClipBoard={true}
                                            disabled={!isAdmin || showServiceAdminView}/>
                                {alreadyExists.entity_id && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                                    attribute: I18n.t("service.entity_id").toLowerCase(), value: service.entity_id
                                })}/>}
                                {isEmpty(service.entity_id) && <ErrorIndicator msg={I18n.t("service.required", {
                                    attribute: I18n.t("service.entity_id").toLowerCase()
                                })}/>}

                                <InputField value={service.saml_metadata_url}
                                            name={I18n.t("service.samlMetadataURL")}
                                            placeholder={I18n.t("service.samlMetadataPlaceholder")}
                                            onChange={e => this.setState({
                                                service: {...service, saml_metadata_url: e.target.value},
                                                invalidInputs: {...invalidInputs, saml_metadata_url: false},
                                                parsedSAMLMetaDataURLError: false
                                            })}
                                            disabled={!isAdmin && !isServiceAdmin}
                                            externalLink={true}
                                            onBlur={this.validateURI("saml_metadata_url")}
                                />
                                {invalidInputs["saml_metadata_url"] && <ErrorIndicator
                                    msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}
                                {(parsedSAMLMetaDataURLError && !invalidInputs["saml_metadata_url"]) && <ErrorIndicator
                                    msg={I18n.t("forms.invalidInput", {name: I18n.t("service.samlMetadataURL")})}/>}
                            </div>
                            <UploadButton name={I18n.t("service.samlMetadataUpload")}
                                          txt={I18n.t("service.samlMetadataUpload")}
                                          acceptFileFormat={".xml"}
                                          onFileUpload={this.onFileUpload}/>
                        </div>
                        {parsedSAMLMetaDataError && <ErrorIndicator
                            msg={I18n.t("forms.invalidInput", {name: I18n.t("service.samlMetadata")})}/>}
                        {(isEmpty(service.saml_metadata_url) && isEmpty(service.saml_metadata)) &&
                            <ErrorIndicator msg={I18n.t("service.saml.samlError")}/>}
                        {!isEmpty(parsedSAMLMetaData) &&
                            this.renderSAMLMetaData(parsedSAMLMetaData)}
                    </div>}

            </div>
        );
    }

    renderExport = (config, service) => {
        const syncActivated = service.oidc_enabled || service.saml_enabled;
        const manageEnabled = config.manage_enabled;
        return (
            <div className="export">
                <CheckBox name={"oidc_enabled"}
                          value={service.oidc_enabled || false}
                          info={I18n.t("service.oidc.oidcClient")}
                          readOnly={true}
                />
                <CheckBox name={"saml_enabled"}
                          value={service.saml_enabled || false}
                          info={I18n.t("service.saml.samlClient")}
                          readOnly={true}
                />
                {!manageEnabled && <p>{I18n.t("service.export.exportDisabled")}</p>}
                {manageEnabled && <p>{I18n.t(`service.export.${syncActivated ? "export" : "noExport"}`)}</p>}
                {(syncActivated && manageEnabled) && <>
                    <InputField
                        value={service.exported_at ? dateFromEpoch(service.exported_at) : I18n.t("service.export.notExported")}
                        name={I18n.t("service.export.lastExportDate")}
                        disabled={true}
                        externalLink={false}/>
                    {service.exported_at &&
                        <InputField
                            value={I18n.t(`service.export.${service.export_successful ? "successful" : "failure"}`)}
                            name={I18n.t("service.export.lastExportStatus")}
                            disabled={true}
                            externalLink={false}/>}
                    {service.export_external_identifier &&
                        <>
                            <InputField
                                value={service.export_external_identifier}
                                name={I18n.t("service.export.externalIdentifier")}
                                disabled={true}
                                externalLink={false}/>
                            <InputField
                                value={service.export_external_version.toString()}
                                name={I18n.t("service.export.externalVersion")}
                                disabled={true}
                                externalLink={false}/>
                            <InputField
                                value={I18n.t("service.export.externalLinkValue", {
                                    base_url: config.manage_base_url,
                                    external_identifier: service.export_external_identifier
                                })}
                                name={I18n.t("service.export.externalLink")}
                                disabled={true}
                                externalLink={true}/>
                        </>}
                </>}
            </div>
        );
    }

    renderPolicy = (service, isAdmin, isServiceAdmin, invalidInputs, alreadyExists) => {
        const validAcceptedUserPolicy = validUrlRegExp.test(service.accepted_user_policy);
        return (<div className={"policy"}>
            <InputField value={service.privacy_policy}
                        name={I18n.t("service.privacy_policy")}
                        placeholder={I18n.t("service.privacy_policyPlaceholder")}
                        onChange={e => this.changeServiceProperty("privacy_policy", false, alreadyExists, {
                            ...invalidInputs,
                            privacy_policy: false
                        })(e)}
                        error={invalidInputs.privacy_policy}
                        toolTip={I18n.t("service.privacy_policyTooltip")}
                        externalLink={true}
                        onBlur={this.validateURI("privacy_policy")}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {invalidInputs.privacy_policy &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}

            <InputField value={service.accepted_user_policy}
                        name={I18n.t("service.accepted_user_policy")}
                        placeholder={I18n.t("service.accepted_user_policyPlaceholder")}
                        onChange={e => this.changeServiceProperty("accepted_user_policy", false, alreadyExists, {
                            ...invalidInputs,
                            accepted_user_policy: false
                        })(e)}
                        toolTip={I18n.t("service.accepted_user_policyTooltip")}
                        error={invalidInputs.accepted_user_policy}
                        externalLink={true}
                        button={<Button txt={I18n.t("service.aup.title")}
                                        disabled={!validAcceptedUserPolicy || (!isAdmin && !isServiceAdmin)}
                                        onClick={() => this.resetAups(true)}/>}
                        onBlur={this.validateURI("accepted_user_policy")}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {invalidInputs.accepted_user_policy &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}

        </div>)
    }

    renderContacts = (service, alreadyExists, isAdmin, isServiceAdmin, invalidInputs, hasAdministrators) => {
        const contactEmailRequired = !hasAdministrators && isEmpty(service.contact_email);
        return (<div className={"contacts"}>
            <InputField value={service.contact_email}
                        name={I18n.t("service.contact_email")}
                        placeholder={I18n.t("service.contact_emailPlaceholder")}
                        onChange={e => this.changeServiceProperty("contact_email", false, alreadyExists, {
                            ...invalidInputs,
                            email: false
                        })(e)}
                        toolTip={I18n.t("service.contact_emailTooltip")}
                        error={invalidInputs["email"] || contactEmailRequired}
                        onBlur={this.validateEmail("email")}
                        required={contactEmailRequired}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {invalidInputs["email"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.email")})}/>}
            {contactEmailRequired && <ErrorIndicator msg={I18n.t("service.contactEmailRequired")}/>}

            <InputField value={service.security_email}
                        name={I18n.t("service.security_email")}
                        placeholder={I18n.t("service.security_emailPlaceholder")}
                        onChange={e => this.changeServiceProperty("security_email", false, alreadyExists, {
                            ...invalidInputs,
                            security_email: false
                        })(e)}
                        required={true}
                        toolTip={I18n.t("service.security_emailTooltip")}
                        error={isEmpty(service.security_email) || invalidInputs["security_email"]}
                        onBlur={this.validateEmail("security_email", true)}
                        disabled={!isAdmin && !isServiceAdmin}/>

            {invalidInputs["security_email"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.email")})}/>}

            {isEmpty(service.security_email) && <ErrorIndicator msg={I18n.t("service.securityEmailRequired")}/>}

            <InputField value={service.support_email}
                        name={I18n.t("service.support_email")}
                        placeholder={I18n.t("service.support_emailPlaceholder")}
                        onChange={e => this.changeServiceProperty("support_email", false, alreadyExists, {
                            ...invalidInputs,
                            support_email: false
                        })(e)}
                        toolTip={I18n.t("service.support_emailTooltip")}
                        error={invalidInputs["support_email"]}
                        onBlur={this.validateEmail("support_email", true)}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {invalidInputs["support_email"] &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.email")})}/>}
            {!isEmpty(service.support_email) &&
                <CheckBox name="support_email_unauthorized_users"
                          value={service.support_email_unauthorized_users || false}
                          info={I18n.t("service.support_email_unauthorized_users")}
                          readOnly={!isAdmin && !isServiceAdmin}
                          tooltip={I18n.t("service.support_email_unauthorized_usersPlaceholder")}
                          onChange={this.changeServiceProperty("support_email_unauthorized_users", true)}/>
            }
        </div>)
    }

    renderGeneral = (config, service, alreadyExists, isAdmin, isServiceAdmin, invalidInputs, showServiceAdminView, crmOrganisations) => {
        return <>
            <InputField value={service.name}
                        onChange={this.changeServiceProperty("name", false, {...alreadyExists, name: false})}
                        placeholder={I18n.t("service.namePlaceHolder")}
                        onBlur={this.validateServiceName}
                        error={alreadyExists.name}
                        name={I18n.t("service.name")}
                        required={true}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {alreadyExists.name && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                attribute: I18n.t("service.name").toLowerCase(), value: service.name
            })}/>}
            {(isEmpty(service.name)) && <ErrorIndicator msg={I18n.t("service.required", {
                attribute: I18n.t("service.name").toLowerCase()
            })}/>}

            <CroppedImageField name="logo"
                               onChange={s => this.setState({"service": {...service, "logo": s}})}
                               isNew={false}
                               title={I18n.t("service.logo")}
                               value={service.logo}
                               disabled={!isAdmin && !isServiceAdmin}
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
                        required={true}
                        error={alreadyExists.abbreviation || isEmpty(service.abbreviation)}
                        copyClipBoard={false}
                        disabled={!isAdmin || showServiceAdminView}/>
            {alreadyExists.abbreviation && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                attribute: I18n.t("service.abbreviation").toLowerCase(), value: service.abbreviation
            })}/>}
            {(isEmpty(service.abbreviation)) && <ErrorIndicator msg={I18n.t("service.required", {
                attribute: I18n.t("service.abbreviation").toLowerCase()
            })}/>}

            <InputField value={service.description || ""}
                        name={I18n.t("service.description")}
                        placeholder={I18n.t("service.descriptionPlaceholder")}
                        onChange={this.changeServiceProperty("description")}
                        multiline={true}
                        disabled={!isAdmin && !isServiceAdmin}/>

            <CheckBox name="allow_restricted_orgs"
                      value={service.allow_restricted_orgs || false}
                      info={I18n.t("service.allowRestrictedOrgs")}
                      readOnly={!isAdmin || showServiceAdminView}
                      tooltip={I18n.t("service.allowRestrictedOrgsTooltip")}
                      onChange={this.changeServiceProperty("allow_restricted_orgs", true)}/>

            <InputField value={service.providing_organisation}
                        name={I18n.t("service.providingOrganisation")}
                        placeholder={I18n.t("service.providingOrganisationPlaceholder")}
                        onChange={this.changeServiceProperty("providing_organisation")}
                        required={true}
            />
            {(isEmpty(service.providing_organisation)) &&
                <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.providingOrganisation").toLowerCase()
                })}/>}

            <InputField value={service.uri_info}
                        name={I18n.t("service.infoUri")}
                        placeholder={I18n.t("service.infoUriPlaceholder")}
                        onChange={e => this.changeServiceProperty("uri_info", false, alreadyExists, {
                            ...invalidInputs,
                            uri: false
                        })(e)}
                        toolTip={I18n.t("service.infoUriTooltip")}
                        error={invalidInputs.uri_info}
                        externalLink={true}
                        onBlur={this.validateURI("uri_info")}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {invalidInputs.uri_info &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}

            <InputField value={service.uri}
                        name={I18n.t("service.uri")}
                        placeholder={I18n.t("service.uriPlaceholder")}
                        onChange={e => this.changeServiceProperty("uri", false, alreadyExists, {
                            ...invalidInputs,
                            uri: false
                        })(e)}
                        toolTip={I18n.t("service.uriTooltip")}
                        externalLink={true}
                        error={invalidInputs.uri}
                        onBlur={this.validateURI("uri", true)}
                        disabled={!isAdmin && !isServiceAdmin}/>
            {invalidInputs.uri &&
                <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}

            {(isAdmin && !showServiceAdminView) &&
                <SelectField
                    value={crmOrganisations.find(org => org.value === service.crm_organisation_id)}
                    options={crmOrganisations}
                    clearable={true}
                    placeholder={I18n.t("organisation.crmIdPlaceholder")}
                    name={I18n.t("organisation.crmId")}
                    toolTip={I18n.t("organisation.crmIdTooltip")}
                    onChange={item => this.setState({
                        "service": {...service, crm_organisation_id: item ? item.value : null}
                    })}/>
            }
        </>
    }

    renderCurrentTab = (config, currentTab, service, alreadyExists, isAdmin, isServiceAdmin, disabledSubmit,
                        invalidInputs, hasAdministrators, showServiceAdminView, createNewServiceToken, initial,
                        crmOrganisations, oidcClientSecret, oidcClientSecretModal) => {
        switch (currentTab) {
            case "general":
                return this.renderGeneral(config, service, alreadyExists, isAdmin, isServiceAdmin, invalidInputs, showServiceAdminView, crmOrganisations);
            case "contacts":
                return this.renderContacts(service, alreadyExists, isAdmin, isServiceAdmin, invalidInputs, hasAdministrators);
            case "policy":
                return this.renderPolicy(service, isAdmin, isServiceAdmin, invalidInputs, alreadyExists);
            case "SCIMServer":
                return this.renderSCIMServer(service, isAdmin, isServiceAdmin, showServiceAdminView, alreadyExists, invalidInputs, initial);
            case "SCIMClient":
                return this.renderSCIMClient(service, isAdmin, isServiceAdmin, showServiceAdminView, createNewServiceToken, "scim");
            case "ldap":
                return this.renderLdap(config, service, isAdmin, isServiceAdmin);
            case "tokens":
                return this.renderTokens(config, service, isAdmin, isServiceAdmin, createNewServiceToken, "introspection");
            case "pamWebLogin":
                return this.renderPamWebLogin(service, isAdmin, isServiceAdmin, createNewServiceToken, "pam");
            case "OIDC":
                return this.renderOidc(config, service, isAdmin, isServiceAdmin, alreadyExists, showServiceAdminView, oidcClientSecret, oidcClientSecretModal);
            case "SAML":
                return this.renderSAML(config, service, isAdmin, isServiceAdmin, invalidInputs, alreadyExists, showServiceAdminView);
            case "Export":
                return this.renderExport(config, service);
            default:
                throw new Error(`unknown-tab: ${currentTab}`);
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
            cancelButtonLabel,
            confirmationDialogQuestion,
            ldapPassword,
            tokenValue,
            createNewServiceToken,
            initial,
            sweepResults,
            sweepSuccess,
            scimTokenChange,
            scimBearerToken,
            oidcClientSecret,
            oidcClientSecretModal,
            crmOrganisations
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !this.isValid();
        const {user, config, showServiceAdminView} = this.props;
        const isAdmin = user.admin;
        const presentTab = (showServiceAdminView && currentTab === "Export") ? "general" : currentTab;
        return (
            <div className="service-overview">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    cancelButtonLabel={cancelButtonLabel}
                                    isWarning={warning}
                                    largeWidth={!isEmpty(tokenValue) || scimTokenChange}
                                    confirmationTxt={confirmationTxt}
                                    disabledConfirm={scimTokenChange && isEmpty(scimBearerToken)}
                                    confirmationHeader={confirmationHeader}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}>
                    {ldapPassword && this.renderLdapPassword(ldapPassword)}
                    {(oidcClientSecret && oidcClientSecretModal) && this.renderOidcClientSecret(oidcClientSecret)}
                    {!isEmpty(sweepSuccess) && this.renderScimResults(service, sweepSuccess, sweepResults)}
                    {scimTokenChange && this.renderScimTokenChange(scimBearerToken)}
                </ConfirmationDialog>

                {this.sidebar(presentTab, config.manage_enabled, showServiceAdminView)}
                <div className={`service ${createNewServiceToken ? "no-grid" : ""}`}>
                    <h2 className="section-separator">{I18n.t(`serviceDetails.toc.${presentTab}`)}</h2>
                    {this.renderCurrentTab(config, presentTab, service, alreadyExists, isAdmin, isServiceAdmin, disabledSubmit,
                        invalidInputs, hasAdministrators, showServiceAdminView, createNewServiceToken, initial, crmOrganisations,
                        oidcClientSecret, oidcClientSecretModal)}
                    {this.renderButtons(isAdmin, isServiceAdmin, disabledSubmit, presentTab, showServiceAdminView,
                        createNewServiceToken, service, invalidInputs)}
                </div>
            </div>);
    }

}

export default ServiceOverview;

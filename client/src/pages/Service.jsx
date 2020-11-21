import React from "react";
import {
    createService,
    deleteService,
    ipNetworks,
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
import {isEmpty} from "../utils/Utils";
import {validEmailRegExp} from "../validations/regExps";
import CheckBox from "../components/CheckBox";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import RadioButton from "../components/redesign/RadioButton";
import CroppedImageField from "../components/redesign/CroppedImageField";
import SpinnerField from "../components/redesign/SpinnerField";

class Service extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = this.initialState();
    }

    initialState = () => ({
        service: {},
        name: "",
        logo: "",
        entity_id: "",
        description: "",
        address: "",
        identity_type: "",
        uri: "",
        accepted_user_policy: "",
        automatic_connection_allowed: true,
        white_listed: false,
        research_scholarship_compliant: false,
        code_of_conduct_compliant: false,
        sirtfi_compliant: false,
        contact_email: "",
        ip_networks: [],
        required: ["name", "entity_id", "logo"],
        alreadyExists: {},
        initial: true,
        isNew: true,
        invalidInputs: {},
        confirmationDialogOpen: false,
        leavePage: false,
        confirmationDialogAction: () => true,
        cancelDialogAction: () => true,
        loading: true
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
                const isAdmin = this.props.user.admin;
                if (!isAdmin) {
                    this.props.history.push("/404");
                } else {
                    this.addIpAddress();
                    this.setState({loading: false});
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {value: I18n.t("breadcrumb.services")},
                            {value: I18n.t("breadcrumb.newService")}
                        ];
                    });
                }
            } else {
                serviceById(params.id)
                    .then(res => {
                        this.setState({
                            ...res,
                            service: res,
                            isNew: false,
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
                                {value: I18n.t("breadcrumb.services")},
                                {path: `/services/${res[0].id}`, value: res[0].name},
                                {path: "/", value: I18n.t("home.edit")}
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

    validateEmail = e => {
        const email = e.target.value;
        const {invalidInputs} = this.state;
        const inValid = !isEmpty(email) && !validEmailRegExp.test(email);
        this.setState({invalidInputs: {...invalidInputs, email: inValid}});
    };

    validateIpAddress = index => e => {
        const currentIpNetwork = this.state.ip_networks[index];
        const address = e.target.value;
        ipNetworks(address, currentIpNetwork.id)
            .then(res => {
                    const {ip_networks} = this.state;
                    ip_networks.splice(index, 1, res);
                    const updatedIpNetworks = [...ip_networks];
                    this.setState({ip_networks: updatedIpNetworks});
                }
            );
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
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.goBack()),
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
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
        const {required, alreadyExists, invalidInputs, contact_email, automatic_connection_allowed, ip_networks}
            = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) ||
            required.some(attr => isEmpty(this.state[attr])) ||
            Object.keys(invalidInputs).some(key => invalidInputs[key]);
        const contactEmailRequired = !automatic_connection_allowed && isEmpty(contact_email);
        const invalidIpNetworks = ip_networks.some(ipNetwork => ipNetwork.error)
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
        }
    };

    afterUpdate = (name, action, res) => {
        setFlash(I18n.t(`service.flash.${action}`, {name: name}));
        this.props.history.push("/services/" + res.id);
    };

    renderIpNetworks = (ip_networks, isAdmin) => {
        return (<div className="ip-networks">
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
                {isAdmin &&
                <span className="add-network" onClick={() => this.addIpAddress()}><FontAwesomeIcon icon="plus"/></span>}
            </label>
            {ip_networks.map((network, i) =>
                <div className="network-container" key={i}>
                    <div className="network">
                        <InputField value={network.network_value}
                                    onChange={this.saveIpAddress(i)}
                                    onBlur={this.validateIpAddress(i)}
                                    placeholder={I18n.t("service.networkPlaceholder")}
                                    disabled={!isAdmin}
                                    onEnter={e => {
                                        this.validateIpAddress(i);
                                        e.target.blur()
                                    }}
                        />
                        {isAdmin && <span className="trash">
                            <FontAwesomeIcon onClick={() => this.deleteIpAddress(i)} icon="trash"/>
                        </span>}
                    </div>
                    {(network.error && !network.syntax) && <span
                        className="error">{I18n.t("service.networkError", network)}</span>}
                    {network.syntax && <span
                        className="error">{I18n.t("service.networkSyntaxError")}</span>}
                    {network.higher && <span
                        className="network-info">{I18n.t("service.networkInfo", network)}</span>}
                </div>
            )}
        </div>);
    }

    serviceDetailTab = (title, name, isAdmin, alreadyExists, initial, entity_id, description, uri, automatic_connection_allowed,
                        contact_email, invalidInputs, contactEmailRequired,
                        accepted_user_policy, isNew, service, disabledSubmit, white_listed, sirtfi_compliant, code_of_conduct_compliant,
                        research_scholarship_compliant, config, ip_networks, logo) => {
        const redirectUri = uri || entity_id || "https://redirectUri";
        const serviceRequestUrl = `${config.base_url}/service-request?entityID=${encodeURIComponent(entity_id)}&redirectUri=${encodeURIComponent(redirectUri)}`;
        return (
            <div className="service">

                <h1 className="section-separator">{I18n.t("service.about")}</h1>

                <InputField value={name} onChange={e => this.setState({
                    name: e.target.value,
                    alreadyExists: {...this.state.alreadyExists, name: false}
                })}
                            placeholder={I18n.t("service.namePlaceHolder")}
                            onBlur={this.validateServiceName}
                            name={I18n.t("service.name")}
                            disabled={!isAdmin}/>
                {alreadyExists.name && <span
                    className="error">{I18n.t("service.alreadyExists", {
                    attribute: I18n.t("service.name").toLowerCase(),
                    value: name
                })}</span>}
                {(!initial && isEmpty(name)) && <span
                    className="error">{I18n.t("service.required", {
                    attribute: I18n.t("service.name").toLowerCase()
                })}</span>}

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
                            copyClipBoard={true}
                            disabled={!isAdmin}/>
                {alreadyExists.entity_id && <span
                    className="error">{I18n.t("service.alreadyExists", {
                    attribute: I18n.t("service.entity_id").toLowerCase(),
                    value: entity_id
                })}</span>}
                {(!initial && isEmpty(entity_id)) && <span
                    className="error">{I18n.t("service.required", {
                    attribute: I18n.t("service.entity_id").toLowerCase()
                })}</span>}

                {!isNew && <InputField value={serviceRequestUrl}
                                       name={I18n.t("service.service_request")}
                                       toolTip={I18n.t("service.service_requestTooltip")}
                                       copyClipBoard={true}
                                       history={this.props.history}
                                       disabled={true}
                />}

                <InputField value={description}
                            name={I18n.t("service.description")}
                            placeholder={I18n.t("service.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            disabled={!isAdmin}/>

                <InputField value={uri}
                            name={I18n.t("service.uri")}
                            placeholder={I18n.t("service.uriPlaceholder")}
                            onChange={e => this.setState({uri: e.target.value})}
                            toolTip={I18n.t("service.uriTooltip")}
                            externalLink={true}
                            disabled={!isAdmin}/>

                <CheckBox name="automatic_connection_allowed" value={automatic_connection_allowed}
                          info={I18n.t("service.automaticConnectionAllowed")}
                          tooltip={I18n.t("service.automaticConnectionAllowedTooltip")}
                          onChange={e => this.setState({automatic_connection_allowed: e.target.checked})}
                          readOnly={!isAdmin}/>

                <CheckBox name="white_listed" value={white_listed}
                          info={I18n.t("service.whiteListed")}
                          tooltip={I18n.t("service.whiteListedTooltip")}
                          onChange={e => this.setState({white_listed: e.target.checked})}
                          readOnly={!isAdmin}/>

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
                            onBlur={this.validateEmail}
                            disabled={!isAdmin}/>

                {invalidInputs["email"] && <span
                    className="error">{I18n.t("forms.invalidInput", {name: "email"})}</span>}

                {(!initial && contactEmailRequired) && <span
                    className="error">{I18n.t("service.contactEmailRequired")}</span>}

                <InputField value={accepted_user_policy}
                            name={I18n.t("service.accepted_user_policy")}
                            placeholder={I18n.t("service.accepted_user_policyPlaceholder")}
                            onChange={e => this.setState({accepted_user_policy: e.target.value})}
                            toolTip={I18n.t("service.accepted_user_policyTooltip")}
                            disabled={!isAdmin}/>

                {this.renderIpNetworks(ip_networks, isAdmin)}

                <h1 className="section-separator last">{I18n.t("service.compliancy")}</h1>

                <RadioButton label={I18n.t("service.sirtfiCompliant")}
                             name={"sirtfi_compliant"}
                             value={sirtfi_compliant}
                             tooltip={I18n.t("service.sirtfiCompliantTooltip")}
                             onChange={val => this.setState({sirtfi_compliant: val})}/>

                <RadioButton label={I18n.t("service.codeOfConductCompliant")}
                             name={"code_of_conduct_compliant"}
                             value={code_of_conduct_compliant}
                             tooltip={I18n.t("service.codeOfConductCompliantTooltip")}
                             onChange={val => this.setState({code_of_conduct_compliant: val})}/>

                <RadioButton label={I18n.t("service.researchScholarshipCompliant")}
                             name={"research_scholarship_compliant"}
                             value={research_scholarship_compliant}
                             tooltip={I18n.t("service.researchScholarshipCompliantTooltip")}
                             onChange={val => this.setState({research_scholarship_compliant: val})}/>

                {(isNew && isAdmin) &&
                <section className="actions">
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    <Button disabled={disabledSubmit} txt={I18n.t("service.add")}
                            onClick={this.submit}/>
                </section>}
                {(!isNew && isAdmin) &&
                <section className="actions">
                    <Button warningButton={true} txt={I18n.t("service.delete")}
                            onClick={this.delete}/>
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    <Button disabled={disabledSubmit} txt={I18n.t("service.update")}
                            onClick={this.submit}/>
                </section>}

            </div>);
    }

    render() {
        //status,address, identity_type
        const {
            alreadyExists, service, initial, confirmationDialogOpen, cancelDialogAction, name,
            entity_id, description, uri, accepted_user_policy, contact_email,
            confirmationDialogAction, leavePage, isNew, invalidInputs, automatic_connection_allowed,
            white_listed, sirtfi_compliant, code_of_conduct_compliant,
            research_scholarship_compliant, ip_networks, logo, loading
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !initial && !this.isValid();
        const {user, config} = this.props;
        const isAdmin = user.admin;
        const title = isAdmin ? (isNew ? I18n.t("service.titleNew") : I18n.t("service.titleUpdate", {name: service.name}))
            : I18n.t("service.titleReadOnly", {name: service.name});
        const contactEmailRequired = !automatic_connection_allowed && isEmpty(contact_email);
        return (
            <div className="mod-service">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={I18n.t("service.deleteConfirmation", {name: service.name})}/>
                {isNew && <UnitHeader obj={({name: I18n.t("models.services.new"), svg: ServicesIcon})}/>}
                {!isNew && <UnitHeader obj={service}
                                       auditLogPath={`services/${service.id}`}
                                       name={service.name}
                                       history={user.admin && this.props.history}
                                       mayEdit={false}/>}

                {this.serviceDetailTab(title, name, isAdmin, alreadyExists, initial, entity_id, description, uri, automatic_connection_allowed,
                    contact_email, invalidInputs, contactEmailRequired, accepted_user_policy,
                    isNew, service, disabledSubmit, white_listed, sirtfi_compliant, code_of_conduct_compliant,
                    research_scholarship_compliant, config, ip_networks, logo)}
            </div>);
    };

}

export default Service;
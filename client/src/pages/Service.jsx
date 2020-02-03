import React from "react";
import {
    auditLogsInfo,
    createService,
    deleteService,
    searchOrganisations,
    serviceById,
    serviceEntityIdExists,
    serviceNameExists,
    updateService
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./Service.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty} from "../utils/Utils";
import SelectField from "../components/SelectField";
import {serviceStatuses} from "../forms/constants";
import moment from "moment";
import {validEmailRegExp} from "../validations/regExps";
import CheckBox from "../components/CheckBox";
import BackLink from "../components/BackLink";
import Tabs from "../components/Tabs";
import History from "../components/History";

class Service extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.statusOptions = serviceStatuses.map(type => ({
            value: type,
            label: I18n.t(`service.status.${type}`)
        }));
        this.state = {
            service: {},
            name: "",
            entity_id: "",
            description: "",
            address: "",
            identity_type: "",
            uri: "",
            accepted_user_policy: "",
            automatic_connection_allowed: true,
            white_listed: false,
            allowed_organisations: [],
            organisations: [],
            contact_email: "",
            status: this.statusOptions[0].value,
            required: ["name", "entity_id"],
            alreadyExists: {},
            initial: true,
            isNew: true,
            invalidInputs: {},
            confirmationDialogOpen: false,
            leavePage: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            auditLogs: {"audit_logs": []}
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            if (params.id !== "new") {
                Promise.all([serviceById(params.id), searchOrganisations("*")])
                    .then(res => {
                        this.setState({
                            ...res[0],
                            service: res[0],
                            isNew: false,
                            allowed_organisations: this.mapOrganisationsToOptions(res[0].allowed_organisations),
                            organisations: this.mapOrganisationsToOptions(res[1])
                        }, () => this.props.user.admin && this.fetchAuditLogs(res[0].id))
                    });
            } else {
                const isAdmin = this.props.user.admin;
                if (!isAdmin) {
                    this.props.history.push("/404");
                } else {
                    searchOrganisations("*")
                        .then(r => this.setState({organisations: this.mapOrganisationsToOptions(r)}))
                }
            }
        } else {
            this.props.history.push("/404");
        }
    };

    fetchAuditLogs = serviceId => auditLogsInfo(serviceId, "services").then(json => this.setState({auditLogs: json}));

    mapOrganisationsToOptions = organisations => organisations.map(org => ({
        label: org.name,
        value: org.id,
        organisation_id: org.id
    }));

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

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoServices = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push("/services"));

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: true,
            cancelDialogAction: this.gotoServices, confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog, confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const {service} = this.state;
        deleteService(service.id).then(() => {
            this.props.history.push("/services");
            setFlash(I18n.t("service.flash.deleted", {name: service.name}));
        });
    };

    isValid = () => {
        const {required, alreadyExists, invalidInputs, contact_email, automatic_connection_allowed} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) ||
            required.some(attr => isEmpty(this.state[attr])) ||
            Object.keys(invalidInputs).some(key => invalidInputs[key]);
        const contactEmailRequired = !automatic_connection_allowed && isEmpty(contact_email);
        return !inValid && !contactEmailRequired;
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
            const {name, isNew} = this.state;
            if (isNew) {
                createService(this.state).then(() => this.afterUpdate(name, "created"));
            } else {
                updateService(this.state).then(() => this.afterUpdate(name, "updated"));
            }
        }
    };

    afterUpdate = (name, action) => {
        window.scrollTo(0, 0);
        setFlash(I18n.t(`service.flash.${action}`, {name: name}));
        this.props.history.push("/services");
    };

    serviceDetailTab = (title, name, isAdmin, alreadyExists, initial, entity_id, description, uri, automatic_connection_allowed,
                        contact_email, invalidInputs, contactEmailRequired, allowed_organisations, organisations,
                        accepted_user_policy, isNew, service, disabledSubmit, white_listed) => (
        <div className="service">
            {!isNew && <p className="title">{title}</p>}
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

            {(isAdmin && !isNew) && <InputField value={`/service-request/${encodeURIComponent(entity_id)}`}
                        name={I18n.t("service.service_request")}
                        toolTip={I18n.t("service.service_requestTooltip")}
                        link={`/service-request/${encodeURIComponent(entity_id)}`}
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

            {/*<InputField value={identity_type}*/}
            {/*            name={I18n.t("service.identity_type")}*/}
            {/*            placeholder={I18n.t("service.identity_typePlaceholder")}*/}
            {/*            onChange={e => this.setState({identity_type: e.target.value})}*/}
            {/*            toolTip={I18n.t("service.identity_typeTooltip")}*/}
            {/*            disabled={!isAdmin}/>*/}

            {/*<SelectField value={this.statusOptions.find(option => status === option.value)}*/}
            {/*             options={this.statusOptions}*/}
            {/*             name={I18n.t("service.status.name")}*/}
            {/*             clearable={false}*/}
            {/*             placeholder={I18n.t("service.statusPlaceholder")}*/}
            {/*             disabled={!isAdmin}*/}
            {/*             onChange={selectedOption => this.setState({status: selectedOption ? selectedOption.value : null})}*/}
            {/*/>*/}

            {/*<InputField value={address}*/}
            {/*            name={I18n.t("service.address")}*/}
            {/*            placeholder={I18n.t("service.addressPlaceholder")}*/}
            {/*            onChange={e => this.setState({address: e.target.value})}*/}
            {/*            disabled={!isAdmin}/>*/}

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

            <SelectField value={allowed_organisations}
                         options={organisations}
                         name={I18n.t("service.allowedOrganisations")}
                         placeholder={I18n.t("service.allowedOrganisationsPlaceholder")}
                         toolTip={I18n.t("service.allowedOrganisationsTooltip")}
                         isMulti={true}
                         onChange={selectedOptions => this.setState({allowed_organisations: isEmpty(selectedOptions) ? [] : [...selectedOptions]})}
            />

            <InputField value={accepted_user_policy}
                        name={I18n.t("service.accepted_user_policy")}
                        placeholder={I18n.t("service.accepted_user_policyPlaceholder")}
                        onChange={e => this.setState({accepted_user_policy: e.target.value})}
                        toolTip={I18n.t("service.accepted_user_policyTooltip")}
                        disabled={!isAdmin}/>

            {!isNew && <InputField value={moment(service.created_at * 1000).format("LLLL")}
                                   disabled={true}
                                   name={I18n.t("organisation.created")}/>}

            {(isNew && isAdmin) &&
            <section className="actions">
                <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                <Button disabled={disabledSubmit} txt={I18n.t("service.add")}
                        onClick={this.submit}/>
            </section>}
            {(!isNew && isAdmin) &&
            <section className="actions">
                <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                <Button className="delete" txt={I18n.t("service.delete")}
                        onClick={this.delete}/>
                <Button disabled={disabledSubmit} txt={I18n.t("service.update")}
                        onClick={this.submit}/>
            </section>}

        </div>);

    render() {
        //status,address, identity_type
        const {
            alreadyExists, service, initial, confirmationDialogOpen, cancelDialogAction, name,
            entity_id, description, uri, accepted_user_policy, contact_email,
            confirmationDialogAction, leavePage, isNew, invalidInputs, automatic_connection_allowed, organisations,
            allowed_organisations, auditLogs, white_listed
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const isAdmin = this.props.user.admin;
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
                <BackLink history={this.props.history}/>
                {isNew && <p className="title">{title}</p>}
                <Tabs>
                    <div label="form">
                        {this.serviceDetailTab(title, name, isAdmin, alreadyExists, initial, entity_id, description, uri, automatic_connection_allowed,
                            contact_email, invalidInputs, contactEmailRequired, allowed_organisations, organisations, accepted_user_policy,
                            isNew, service, disabledSubmit, white_listed)}
                    </div>
                    {(isAdmin && !isNew) && <div label="history">
                        <History auditLogs={auditLogs}/>
                    </div>}
                </Tabs>
            </div>);
    };

}

export default Service;
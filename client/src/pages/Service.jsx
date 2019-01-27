import React from "react";
import {
    createService,
    deleteService,
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
import {isEmpty, stopEvent} from "../utils/Utils";
import SelectField from "../components/SelectField";
import {serviceStatuses} from "../forms/constants";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {getParameterByName} from "../utils/QueryParameters";

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
            contact_email: "",
            status: this.statusOptions[0].value,
            required: ["name", "entity_id"],
            alreadyExists: {},
            initial: true,
            isNew: true,
            confirmationDialogOpen: false,
            leavePage: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            back: "/services"
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            if (params.id !== "new") {
                const back = getParameterByName("back", window.location.search);
                serviceById(params.id)
                    .then(json => this.setState({
                        ...json,
                        service: json,
                        isNew: false,
                        back: isEmpty(back) ? this.state.back : back
                    }));
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

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoServices = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push(`/services`));

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
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
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
                createService(this.state).then(() => {
                    this.gotoServices();
                    setFlash(I18n.t("service.flash.created", {name: name}));
                });
            } else {
                updateService(this.state).then(() => {
                    this.gotoServices();
                    setFlash(I18n.t("service.flash.updated", {name: name}));
                });
            }
        }
    };

    render() {
        const {
            alreadyExists, service, initial, confirmationDialogOpen, cancelDialogAction, name,
            entity_id, description, address, identity_type, uri, accepted_user_policy, contact_email, status,
            confirmationDialogAction, leavePage, isNew, back
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const title = isNew ? I18n.t("service.titleNew") : I18n.t("service.titleUpdate", {name: service.name});
        return (
            <div className="mod-service">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={I18n.t("service.deleteConfirmation", {name: service.name})}/>
                <div className="title">
                    <a href={back} onClick={e => {
                        stopEvent(e);
                        this.props.history.push(back)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {back.indexOf("collaborations") > -1 ? I18n.t("collaborationDetail.backToCollaborations") : I18n.t("service.backToServices")}
                    </a>
                    <p className="title">{title}</p>
                </div>

                <div className="service">
                    <InputField value={name} onChange={e => this.setState({
                        name: e.target.value,
                        alreadyExists: {...this.state.alreadyExists, name: false}
                    })}
                                placeholder={I18n.t("service.namePlaceHolder")}
                                onBlur={this.validateServiceName}
                                name={I18n.t("service.name")}/>
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
                                toolTip={I18n.t("service.entity_idTooltip")}/>
                    {alreadyExists.entity_id && <span
                        className="error">{I18n.t("service.alreadyExists", {
                        attribute: I18n.t("service.entity_id").toLowerCase(),
                        value: entity_id
                    })}</span>}
                    {(!initial && isEmpty(entity_id)) && <span
                        className="error">{I18n.t("service.required", {
                        attribute: I18n.t("service.entity_id").toLowerCase()
                    })}</span>}

                    <InputField value={description}
                                name={I18n.t("service.description")}
                                placeholder={I18n.t("service.descriptionPlaceholder")}
                                onChange={e => this.setState({description: e.target.value})}/>

                    <InputField value={address}
                                name={I18n.t("service.address")}
                                placeholder={I18n.t("service.addressPlaceholder")}
                                onChange={e => this.setState({address: e.target.value})}/>

                    <InputField value={identity_type}
                                name={I18n.t("service.identity_type")}
                                placeholder={I18n.t("service.identity_typePlaceholder")}
                                onChange={e => this.setState({identity_type: e.target.value})}
                                toolTip={I18n.t("service.identity_typeTooltip")}/>

                    <InputField value={uri}
                                name={I18n.t("service.uri")}
                                placeholder={I18n.t("service.uriPlaceholder")}
                                onChange={e => this.setState({uri: e.target.value})}
                                toolTip={I18n.t("service.uriTooltip")}/>

                    <SelectField value={this.statusOptions.find(option => status === option.value)}
                                 options={this.statusOptions}
                                 name={I18n.t("service.status.name")}
                                 clearable={true}
                                 placeholder={I18n.t("service.statusPlaceholder")}
                                 onChange={selectedOption => this.setState({status: selectedOption ? selectedOption.value : null})}
                    />

                    <InputField value={contact_email}
                                name={I18n.t("service.contact_email")}
                                placeholder={I18n.t("service.contact_emailPlaceholder")}
                                onChange={e => this.setState({contact_email: e.target.value})}
                                toolTip={I18n.t("service.contact_emailTooltip")}/>

                    <InputField value={accepted_user_policy}
                                name={I18n.t("service.accepted_user_policy")}
                                placeholder={I18n.t("service.accepted_user_policyPlaceholder")}
                                onChange={e => this.setState({accepted_user_policy: e.target.value})}
                                toolTip={I18n.t("service.accepted_user_policyTooltip")}/>

                    {isNew &&
                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("service.add")}
                                onClick={this.submit}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>}
                    {!isNew &&
                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("service.update")}
                                onClick={this.submit}/>
                        <Button className="delete" txt={I18n.t("service.delete")}
                                onClick={this.delete}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>}

                </div>
            </div>);
    };
}

export default Service;
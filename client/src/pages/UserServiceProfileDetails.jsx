import React from "react";
import {updateUserServiceProfiles, userServiceProfileById} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./UserServiceProfileDetails.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty, stopEvent} from "../utils/Utils";
import SelectField from "../components/SelectField";

import {userServiceProfileStatuses} from "../forms/constants";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {validEmailRegExp, validPublicSSHKeyRegExp} from "../validations/regExps";

class UserServiceProfileDetails extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.statusOptions = userServiceProfileStatuses.map(type => ({
            value: type,
            label: I18n.t(`userServiceProfile.statusValues.${type}`)
        }));

        this.state = {
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            service: {},
            collaboration_membership: {authorisation_groups: [], collaboration: {}},
            fileName: null,
            fileTypeError: false,
            invalidInputs: {},
            initial: true,
            fileInputKey: new Date().getMilliseconds()
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            userServiceProfileById(params.id)
                .then(json => this.setState({
                    ...json
                }));
        } else {
            this.props.history.push("/404");
        }
    };

    validateEmail = e => {
        const email = e.target.value;
        const {invalidInputs} = this.state;
        const inValid = !isEmpty(email) && !validEmailRegExp.test(email);
        this.setState({invalidInputs: {...invalidInputs, email: inValid}});
    };

    gotoUserServiceProfiles = e => {
        stopEvent(e);
        this.props.history.push(`/user-service-profiles`)
    };

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoUserServiceProfiles,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    isValid = () => {
        const {invalidInputs} = this.state;
        const inValid = Object.keys(invalidInputs).some(key => invalidInputs[key]);
        return !inValid;
    };


    doSubmit = () => {
        if (this.isValid()) {
            updateUserServiceProfiles(this.state).then(() => {
                this.gotoUserServiceProfiles();
                setFlash(I18n.t("userServiceProfile.flash.updated", {name: this.state.service.name}));
            });
        }
    };

    authorisationByCollaborationMembership = (service, collaborationMembership) => collaborationMembership.authorisation_groups.find(authorisationGroup => authorisationGroup.services.find(s => s.id === service.id));

    validateSSHKey = e => {
        const sshKey = e.target.value;
        const fileTypeError = !isEmpty(sshKey) && !validPublicSSHKeyRegExp.test(sshKey);
        this.setState({fileTypeError: fileTypeError, fileInputKey: new Date().getMilliseconds()});
    };

    onFileRemoval = e => {
        stopEvent(e);
        this.setState({
            fileName: null, ssh_key: "", fileTypeError: false,
            fileInputKey: new Date().getMilliseconds()
        });
    };

    onFileUpload = e => {
        const files = e.target.files;
        if (!isEmpty(files)) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const sshKey = reader.result.toString();
                if (validPublicSSHKeyRegExp.test(sshKey)) {
                    this.setState({fileName: file.name, fileTypeError: false, ssh_key: sshKey});
                } else {
                    this.setState({fileName: file.name, fileTypeError: true, ssh_key: ""});
                }
            };
            reader.readAsText(file);
        }
    };

    render() {
        const {
            service, collaboration_membership, name, email, address, identifier, ssh_key, role, status,
            confirmationDialogAction, confirmationDialogOpen, cancelDialogAction, fileName, fileTypeError, fileInputKey,
            invalidInputs, initial
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const title = I18n.t("userServiceProfile.titleUpdate", {name: service.name});
        const back = "/home";
        const authorisationGroup = this.authorisationByCollaborationMembership(service, collaboration_membership);
        return (
            <div className="mod-user-service-profile">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={true}/>
                <div className="title">
                    <a href={back} onClick={e => {
                        stopEvent(e);
                        this.props.history.push(back)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {back.indexOf("collaborations") > -1 ? I18n.t("collaborationDetail.backToCollaborations") : I18n.t("userServiceProfile.backToServices")}
                    </a>
                    <p className="title">{title}</p>
                </div>

                <div className="user-service-profile">
                    <InputField value={service.name}
                                name={I18n.t("userServiceProfile.service__name")}
                                disabled={true}
                                link={`/services/${service.id}`}
                                history={this.props.history}/>

                    <InputField value={authorisationGroup ? authorisationGroup.name : ""}
                                name={I18n.t("userServiceProfile.authorisation__name")}
                                disabled={true}
                                link={authorisationGroup ? `/collaboration-authorisation-group-details/${collaboration_membership.collaboration.id}/${authorisationGroup.id}` : null}
                                history={this.props.history}/>

                    <InputField value={collaboration_membership.collaboration.name}
                                name={I18n.t("userServiceProfile.collaboration_membership__collaboration__name")}
                                disabled={true}
                                link={`/collaborations/${collaboration_membership.collaboration.id}`}
                                history={this.props.history}/>

                    <InputField value={name}
                                name={I18n.t("userServiceProfile.name")}
                                placeholder={I18n.t("userServiceProfile.namePlaceholder")}
                                onChange={e => this.setState({name: e.target.value})}/>

                    <InputField value={email}
                                name={I18n.t("userServiceProfile.email")}
                                placeholder={I18n.t("userServiceProfile.emailPlaceholder")}
                                onChange={e => this.setState({
                                    email: e.target.value,
                                    invalidInputs: !isEmpty(e.target.value) ? invalidInputs : {
                                        ...invalidInputs,
                                        email: false
                                    }
                                })}
                                onBlur={this.validateEmail}/>
                    {invalidInputs["email"] && <span
                        className="error">{I18n.t("forms.invalidInput", {name: "email"})}</span>}
                    <InputField value={address}
                                name={I18n.t("userServiceProfile.address")}
                                placeholder={I18n.t("userServiceProfile.addressPlaceholder")}
                                onChange={e => this.setState({address: e.target.value})}/>

                    <InputField value={identifier}
                                name={I18n.t("userServiceProfile.identifier")}
                                placeholder={I18n.t("userServiceProfile.identifierPlaceholder")}
                                onChange={e => this.setState({identifier: e.target.value})}
                                toolTip={I18n.t("userServiceProfile.identifierTooltip")}
                                disabled={true}/>

                    <InputField value={ssh_key}
                                name={I18n.t("userServiceProfile.ssh_key")}
                                placeholder={I18n.t("userServiceProfile.ssh_keyPlaceholder")}
                                onChange={e => this.setState({ssh_key: e.target.value})}
                                toolTip={I18n.t("userServiceProfile.ssh_keyTooltip")}
                                onBlur={this.validateSSHKey}
                                fileUpload={true}
                                fileName={fileName}
                                fileInputKey={fileInputKey}
                                onFileRemoval={this.onFileRemoval}
                                onFileUpload={this.onFileUpload}
                                acceptFileFormat=".pub"/>
                    {fileTypeError &&
                    <span
                        className="error">{I18n.t("userServiceProfile.sshKeyError")}</span>}

                    <SelectField value={this.statusOptions.find(option => status === option.value)}
                                 options={this.statusOptions}
                                 name={I18n.t("userServiceProfile.status")}
                                 clearable={true}
                                 placeholder={I18n.t("userServiceProfile.statusPlaceholder")}
                                 onChange={selectedOption => this.setState({status: selectedOption ? selectedOption.value : null})}
                    />
                    <InputField value={role}
                                name={I18n.t("userServiceProfile.role")}
                                disabled={true}/>

                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("userServiceProfile.update")}
                                onClick={this.submit}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>

                </div>
            </div>);
    }
    ;
}

export default UserServiceProfileDetails;
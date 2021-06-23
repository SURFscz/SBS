import React from "react";
import {deleteUser, updateUser} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./Me.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty, stopEvent} from "../utils/Utils";
import {ReactComponent as CriticalIcon} from "../icons/critical.svg";
import {validateSSHKey,} from "../validations/regExps";
import ErrorIndicator from "../components/redesign/ErrorIndicator";

class Me extends React.Component {

    constructor(props, context) {
        super(props, context);
        const {user} = this.props;
        this.state = {
            confirmationDialogOpen: false,
            confirmationDialogAction: this.doDelete,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false, nameConfirmation: ""}),
            confirmationQuestion: I18n.t("user.deleteConfirmation"),
            nameConfirmation: "",
            isWarning: false,
            fileName: null,
            fileTypeError: false,
            invalidInputs: {},
            initial: true,
            fileInputKey: new Date().getMilliseconds(),
            convertSSHKey: true,
            ssh_key: user.ssh_key || "",
            id: user.id,
        };
    }


    gotoHome = e => {
        stopEvent(e);
        this.props.history.push(`/home`)
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogAction: () => this.doDelete()
        });
    };

    doDelete = () => {
        deleteUser().then(() => window.location.href = "/landing?delete=true")
    }

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    isValid = () => {
        const {invalidInputs, ssh_key} = this.state;
        const inValid = Object.keys(invalidInputs).some(key => invalidInputs[key]);
        const isValidSsh = validateSSHKey(ssh_key);
        return !inValid && isValidSsh;
    };

    configureMfa = () => {
        const {history} = this.props;
        history.push("/2fa-update");
    }

    doSubmit = () => {
        if (this.isValid()) {
            updateUser(this.state).then(() => {
                this.props.refreshUser();
                this.gotoHome();
                setFlash(I18n.t("user.flash.updated"));
            });
        } else {
            window.scrollTo(0, 0);
        }
    };

    validateSSHKey = e => {
        const sshKey = e.target.value;
        const isValid = validateSSHKey(sshKey);
        this.setState({fileTypeError: !isValid, fileInputKey: new Date().getMilliseconds()});
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
                if (validateSSHKey(sshKey)) {
                    this.setState({fileName: file.name, fileTypeError: false, ssh_key: sshKey});
                } else {
                    this.setState({fileName: file.name, fileTypeError: true, ssh_key: ""});
                }
            };
            reader.readAsText(file);
        }
    };

    renderForm = (user, ssh_key, fileName, fileInputKey, fileTypeError, showConvertSSHKey, convertSSHKey,
                  disabledSubmit, config) => {
        // const attributes = ["name", "email", "created_at", "username", , "uid", "eduperson_principal_name",
        //     "affiliation", "scoped_affiliation", "entitlement", "schac_home_organisation", "edu_members"];
        const createdAt = user.created_at;
        const d = new Date(0);
        d.setUTCSeconds(createdAt);
        const values = {"created_at": d.toUTCString()};
        const attributes = ["name", "email", "username", "schac_home_organisation", "created_at"];
        const mfaValue = user.second_factor_auth ? I18n.t("mfa.profile.handledBySRAM") :
            I18n.t("mfa.profile.handledByIdp", {name: user.schac_home_organisation || I18n.t("mfa.profile.institution")});
        return (
            <div className="user-profile-tab-container">
                <div className="user-profile-tab">
                    <h1>{I18n.t("home.tabs.me")}</h1>
                    {attributes.map(attribute =>
                        <div className={"attributes"} key={attribute}>
                            <span className="attribute-key">{I18n.t(`profile.${attribute}`)}</span>
                            <span className="attribute-value">{values[attribute] || user[attribute] || "-"}</span>
                        </div>)
                    }
                    {config.second_factor_authentication_required && <div className="second-factor">
                        <InputField value={mfaValue}
                                    name={I18n.t("mfa.profile.name")}
                                    tooltip={I18n.t("mfa.profile.tooltip")}
                                    noInput={true}/>
                        {user.second_factor_auth && <div className="button-container">
                            <Button txt={I18n.t("mfa.profile.edit")}
                                    onClick={this.configureMfa}/>
                        </div>}
                    </div>}
                    <InputField value={ssh_key}
                                name={I18n.t("user.ssh_key")}
                                placeholder={I18n.t("user.ssh_keyPlaceholder")}
                                onChange={e => this.setState({ssh_key: e.target.value})}
                                toolTip={I18n.t("user.ssh_keyTooltip")}
                                onBlur={this.validateSSHKey}
                                fileUpload={true}
                                multiline={true}
                                error={fileTypeError}
                                fileName={fileName}
                                fileInputKey={fileInputKey}
                                onFileRemoval={this.onFileRemoval}
                                onFileUpload={this.onFileUpload}
                                acceptFileFormat=".pub"/>
                    {fileTypeError && <ErrorIndicator msg={I18n.t("user.sshKeyError")}/>}
                    {showConvertSSHKey &&
                    <span className="ssh-convert"
                          dangerouslySetInnerHTML={{__html: I18n.t("user.sshConvertInfo")}}/>}

                    <section className="actions">
                        <Button warningButton={true} txt={I18n.t("user.delete")}
                                onClick={this.delete}/>
                        <Button disabled={disabledSubmit} txt={I18n.t("user.update")}
                                onClick={this.submit}/>
                    </section>

                </div>
            </div>);
    };

    render() {
        const {
            confirmationDialogAction, confirmationDialogOpen, cancelDialogAction, confirmationQuestion,
            fileName, fileTypeError, fileInputKey, initial, convertSSHKey, ssh_key, nameConfirmation
        } = this.state;
        const {user, config} = this.props;
        const disabledSubmit = !initial && !this.isValid();
        const showConvertSSHKey = !isEmpty(ssh_key) && (
            ssh_key.startsWith("---- BEGIN SSH2 PUBLIC KEY ----") ||
            ssh_key.startsWith("-----BEGIN PUBLIC KEY-----") ||
            ssh_key.startsWith("-----BEGIN RSA PUBLIC KEY-----"));
        const disabledConfirm = user.name !== nameConfirmation;
        return (
            <div className="user-profile-mod">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    question={confirmationQuestion}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    disabledConfirm={disabledConfirm}>
                    <div className="confirmation-warning-container">
                        <div className="confirmation-warning">
                            <CriticalIcon/>
                            <p>{I18n.t("user.deleteConfirmationWarning")}</p>
                        </div>
                        <p className="delete-confirmation-check">{I18n.t("user.deleteConfirmationCheck")}</p>
                        <InputField name={I18n.t("profile.name")} value={nameConfirmation}
                                    onChange={e => this.setState({nameConfirmation: e.target.value})}/>
                    </div>
                </ConfirmationDialog>

                {this.renderForm(user, ssh_key, fileName, fileInputKey, fileTypeError, showConvertSSHKey,
                    convertSSHKey, disabledSubmit, config)}
            </div>
        );
    };

}

export default Me;
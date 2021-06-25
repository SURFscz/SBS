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
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";

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
            ssh_keys: [],
            invalidInputs: {},
            initial: true,
            id: user.id,
        };
    }

    componentDidMount() {
        const {ssh_keys} = this.props.user;
        ssh_keys.forEach((sshKey, i) => {
            sshKey.fileInputKey = new Date().getMilliseconds() + i + 1
        });
        if (ssh_keys.length === 0) {
            ssh_keys.push({
                fileInputKey: new Date().getMilliseconds() - 5,
                ssh_value: ""
            });
        }
        this.setState({ssh_keys: ssh_keys});
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
        const {invalidInputs, ssh_keys} = this.state;
        const inValid = Object.keys(invalidInputs).some(key => invalidInputs[key]);
        const isValidSsh = ssh_keys.every(ssh_key => validateSSHKey(ssh_key.ssh_value));
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
        }
    };

    validateSSHKey = index => e => {
        const {ssh_keys} = this.state;
        const ssh_key = ssh_keys[index];
        const sshValue = e.target.value;
        ssh_key.fileTypeError = !validateSSHKey(sshValue);
        ssh_key.fileInputKey = new Date().getMilliseconds();
        this.setState({ssh_keys: [...ssh_keys]});
    };

    saveSshKeyValue = index => e => {
        const {ssh_keys} = this.state;
        const ssh_key = ssh_keys[index];
        ssh_key.ssh_value = e.target.value;
        ssh_keys.splice(index, 1, ssh_key)
        this.setState({ssh_keys: [...ssh_keys]});
    }

    addSshKey = () => {
        const {ssh_keys} = this.state;
        ssh_keys.push({
            fileInputKey: new Date().getMilliseconds(),
            fileTypeError: false,
            ssh_value: "",
            fileName: null
        });
        this.setState({ssh_keys: [...ssh_keys]});
    }

    onFileRemoval = index => e => {
        stopEvent(e);
        const {ssh_keys} = this.state;
        ssh_keys.splice(index, 1);
        this.setState({ssh_keys: [...ssh_keys]});
    };

    onFileUpload = index => e => {
        const files = e.target.files;
        if (!isEmpty(files)) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const sshValue = reader.result.toString();
                const validSsh = validateSSHKey(sshValue);
                const {ssh_keys} = this.state;
                const sshKey = ssh_keys[index];
                sshKey.fileName = file.name;
                sshKey.ssh_value = validSsh ? sshValue : "";
                sshKey.fileTypeError = !validSsh;
                this.setState({ssh_keys: [...ssh_keys]});
            };
            reader.readAsText(file);
        }
    };

    showConvertSSHKey = sshKey => !isEmpty(sshKey) && (
        sshKey.startsWith("---- BEGIN SSH2 PUBLIC KEY ----") ||
        sshKey.startsWith("-----BEGIN PUBLIC KEY-----") ||
        sshKey.startsWith("-----BEGIN RSA PUBLIC KEY-----"));

    renderForm = (user, ssh_keys, disabledSubmit, config) => {
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
                    <div className="ssh-keys-container">
                        <label className="title" htmlFor={I18n.t("user.ssh_key")}>{I18n.t("user.ssh_key")}
                            <span className="tool-tip-section">
                                    <span data-tip data-for={I18n.t("user.ssh_key")}>
                                        <FontAwesomeIcon icon="info-circle"/>
                                    </span>
                                    <ReactTooltip id={I18n.t("user.ssh_key")} type="light" effect="solid"
                                                  data-html={true}>
                                        <p dangerouslySetInnerHTML={{__html: I18n.t("user.ssh_keyTooltip")}}/>
                                    </ReactTooltip>
                                </span>

                            <span className="add-ssh-key" onClick={() => this.addSshKey()}><FontAwesomeIcon
                                icon="plus"/></span>
                        </label>
                        {ssh_keys.map((ssh_key, index) => <div key={index} className={`index-${index}`}>
                            <InputField value={ssh_key.ssh_value}
                                        name={`ssh_key_${index}`}
                                        placeholder={I18n.t("user.ssh_keyPlaceholder")}
                                        onChange={this.saveSshKeyValue(index)}
                                        onBlur={this.validateSSHKey(index)}
                                        fileUpload={true}
                                        multiline={true}
                                        displayLabel={false}
                                        error={ssh_key.fileTypeError}
                                        fileName={ssh_key.fileName}
                                        onFileInitialRemoval={this.onFileRemoval(index)}
                                        fileInputKey={ssh_key.fileInputKey}
                                        onFileRemoval={this.onFileRemoval(index)}
                                        onFileUpload={this.onFileUpload(index)}
                                        acceptFileFormat=".pub"/>
                            {ssh_key.fileTypeError && <ErrorIndicator msg={I18n.t("user.sshKeyError")}/>}
                            {this.showConvertSSHKey(ssh_key.ssh_value) &&
                            <span className="ssh-convert"
                                  dangerouslySetInnerHTML={{__html: I18n.t("user.sshConvertInfo")}}/>}
                        </div>)}
                    </div>
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
            initial, ssh_keys, nameConfirmation
        } = this.state;
        const {user, config} = this.props;
        const disabledSubmit = !initial && !this.isValid();
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

                {this.renderForm(user, ssh_keys, disabledSubmit, config)}
            </div>
        );
    };

}

export default Me;
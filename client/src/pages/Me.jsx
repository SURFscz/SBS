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
import {
    validPublicSSH2KeyRegExp,
    validPublicSSHEd25519KeyRegExp,
    validPublicSSHKeyRegExp
} from "../validations/regExps";
import CheckBox from "../components/CheckBox";

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
        const {invalidInputs} = this.state;
        const inValid = Object.keys(invalidInputs).some(key => invalidInputs[key]);
        return !inValid;
    };


    doSubmit = () => {
        if (this.isValid()) {
            updateUser(this.state).then(() => {
                this.props.refreshUser();
                this.gotoHome();
                setFlash(I18n.t("user.flash.updated"));
            });
        }
    };

    validateSSHKey = e => {
        const sshKey = e.target.value;
        const isValid = isEmpty(sshKey) || validPublicSSHKeyRegExp.test(sshKey) || validPublicSSH2KeyRegExp.test(sshKey)
            || validPublicSSHEd25519KeyRegExp.test(sshKey);
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
                if (validPublicSSHKeyRegExp.test(sshKey) || validPublicSSH2KeyRegExp.test(sshKey) || validPublicSSHEd25519KeyRegExp.test(sshKey)) {
                    this.setState({fileName: file.name, fileTypeError: false, ssh_key: sshKey});
                } else {
                    this.setState({fileName: file.name, fileTypeError: true, ssh_key: ""});
                }
            };
            reader.readAsText(file);
        }
    };

    renderForm = (user, ssh_key, fileName, fileInputKey, fileTypeError, showConvertSSHKey, convertSSHKey, disabledSubmit) => {
        // const attributes = ["name", "email", "created_at", "username", , "uid", "eduperson_principal_name",
        //     "affiliation", "scoped_affiliation", "entitlement", "schac_home_organisation", "edu_members"];
        const attributes = ["name", "email", "created_at"];
        const createdAt = user.created_at;
        const d = new Date(0);
        d.setUTCSeconds(createdAt);
        const values = {"created_at": d.toUTCString()}
        return (
            <div className="user-profile-tab-container">
                <div className="user-profile-tab">
                    <h1>{I18n.t("home.tabs.me")}</h1>
                    {attributes.map(attribute =>
                        <div className={"attributes"} key={attribute}>
                            <span className="attribute-key">{I18n.t(`profile.${attribute}`)}</span>
                            <span className="attribute-value">{values[attribute] || user[attribute]}</span>
                        </div>)
                    }

                    <InputField value={ssh_key}
                                name={I18n.t("user.ssh_key")}
                                placeholder={I18n.t("user.ssh_keyPlaceholder")}
                                onChange={e => this.setState({ssh_key: e.target.value})}
                                toolTip={I18n.t("user.ssh_keyTooltip")}
                                onBlur={this.validateSSHKey}
                                fileUpload={true}
                                fileName={fileName}
                                fileInputKey={fileInputKey}
                                onFileRemoval={this.onFileRemoval}
                                onFileUpload={this.onFileUpload}
                                acceptFileFormat=".pub"/>
                    {fileTypeError &&
                    <span
                        className="error">{I18n.t("user.sshKeyError")}</span>}
                    {showConvertSSHKey &&
                    <CheckBox name="convertSSHKey" value={convertSSHKey}
                              info={I18n.t("user.sshConvertInfo")}
                              onChange={e => this.setState({convertSSHKey: e.target.checked})}/>}

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
        const {user} = this.props;
        const disabledSubmit = !initial && !this.isValid();
        const showConvertSSHKey = !isEmpty(ssh_key) && validPublicSSH2KeyRegExp.test(ssh_key);
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

                {this.renderForm(user, ssh_key, fileName, fileInputKey, fileTypeError, showConvertSSHKey, convertSSHKey, disabledSubmit)}
            </div>
        );
    };

}

export default Me;
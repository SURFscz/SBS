import React from "react";
import {auditLogsMe, updateUser} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./Profile.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty, stopEvent} from "../utils/Utils";
import {
    validPublicSSH2KeyRegExp,
    validPublicSSHEd25519KeyRegExp,
    validPublicSSHKeyRegExp
} from "../validations/regExps";
import CheckBox from "../components/CheckBox";
import History from "../components/History";
import Tabs from "../components/Tabs";
import BackLink from "../components/BackLink";

class Profile extends React.Component {

    constructor(props, context) {
        super(props, context);
        const {user} = this.props;
        this.state = {
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            fileName: null,
            fileTypeError: false,
            invalidInputs: {},
            initial: true,
            fileInputKey: new Date().getMilliseconds(),
            convertSSHKey: true,
            ssh_key: user.ssh_key || "",
            totp_key: user.totp_key || "",
            tiqr_key: user.tiqr_key || "",
            ubi_key: user.ubi_key || "",
            id: user.id,
            auditLogs: {"audit_logs": []}
        };
    }

    componentDidMount = () => {
        auditLogsMe().then(json => this.setState({auditLogs: json}));
    };


    gotoHome = e => {
        stopEvent(e);
        this.props.history.push(`/home`)
    };

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoHome,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false})
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
        const attributes = ["name", "username", "email", "uid", "affiliation", "scoped_affiliation", "entitlement",
            "nick_name", "schac_home_organisation", "edu_members"];

        return (<div className="user-profile">
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

            {attributes.map(attribute =>
                <InputField value={user[attribute]}
                            name={`${I18n.t(`profile.${attribute}`)}`}
                            disabled={true}
                />)
            }
            <section className="actions">
                <Button disabled={disabledSubmit} txt={I18n.t("user.update")}
                        onClick={this.submit}/>
                <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
            </section>

        </div>);
    };

    render() {
        const {
            confirmationDialogAction, confirmationDialogOpen, cancelDialogAction, fileName, fileTypeError, fileInputKey,
            initial, convertSSHKey, ssh_key, auditLogs
        } = this.state;
        const {user} = this.props;

        const disabledSubmit = !initial && !this.isValid();
        const title = I18n.t("user.titleUpdate");
        const showConvertSSHKey = !isEmpty(ssh_key) && validPublicSSH2KeyRegExp.test(ssh_key);
        return (
            <div className="mod-user-profile">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={true}/>
                <BackLink history={this.props.history}/>
                <p className="title">{title}</p>
                <Tabs>
                    <div label="form">
                        {this.renderForm(user, ssh_key, fileName, fileInputKey, fileTypeError, showConvertSSHKey, convertSSHKey, disabledSubmit)}
                    </div>
                    <div label="history">
                        <History auditLogs={auditLogs}/>
                    </div>
                </Tabs>
            </div>);
    };

}

export default Profile;
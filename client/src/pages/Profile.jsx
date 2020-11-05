import React from "react";
import {deleteUser, health, updateUser} from "../api";
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
import Tabs from "../components/Tabs";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as HomeIcon} from "../icons/home.svg";
import UnitHeader from "../components/redesign/UnitHeader";

class Profile extends React.Component {

    constructor(props, context) {
        super(props, context);
        const {user} = this.props;
        this.state = {
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            leavePage: true,
            confirmationQuestion: "",
            isWarning: false,
            fileName: null,
            fileTypeError: false,
            invalidInputs: {},
            initial: true,
            fileInputKey: new Date().getMilliseconds(),
            convertSSHKey: true,
            ssh_key: user.ssh_key || "",
            id: user.id,
            tabs: [],
            tab: "me"
        };
    }

    componentDidMount = () => {
        health().then(() => {
            const {user} = this.props;
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {path: "", value: user.name}
                ];
            });
            this.setState({tabs: [this.getMeTab(user)]})
        })
    };

    getMeTab = user => {
        const {
            fileName, fileTypeError, fileInputKey,
            initial, convertSSHKey, ssh_key,
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const showConvertSSHKey = !isEmpty(ssh_key) && validPublicSSH2KeyRegExp.test(ssh_key);

        return (<div key="me" name="me" label={I18n.t("home.tabs.me")}
                     icon={<HomeIcon/>}>
            {this.renderForm(user, ssh_key, fileName, fileInputKey, fileTypeError, showConvertSSHKey, convertSSHKey, disabledSubmit)}
        </div>)
    }


    gotoHome = e => {
        stopEvent(e);
        this.props.history.push(`/home`)
    };

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoHome,
            isWarning: false,
            confirmationQuestion: "",
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false})
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            isWarning: true,
            confirmationQuestion: I18n.t("user.deleteConfirmation"),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
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
        const attributes = ["name", "created_at", "username", "email", "uid", "eduperson_principal_name",
            "affiliation", "scoped_affiliation", "entitlement", "schac_home_organisation", "edu_members"];
        const createdAt = user.created_at;
        const d = new Date(0);
        d.setUTCSeconds(createdAt);
        const values = {"created_at": d.toUTCString()}
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
                <div key={attribute}>
                    <InputField value={values[attribute] || user[attribute]}
                                name={`${I18n.t(`profile.${attribute}`)}`}
                                disabled={true}
                    /></div>)
            }
            <section className="actions">
                <Button warningButton={true} txt={I18n.t("user.delete")}
                        onClick={this.delete}/>
                <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                <Button disabled={disabledSubmit} txt={I18n.t("user.update")}
                        onClick={this.submit}/>
            </section>

        </div>);
    };

    render() {
        const {
            confirmationDialogAction, confirmationDialogOpen, cancelDialogAction, leavePage, confirmationQuestion, isWarning, tabs, tab
        } = this.state;
        const {user} = this.props;

        return (
            <div className="mod-user-profile">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    question={confirmationQuestion}
                                    confirm={confirmationDialogAction}
                                    isWarning={isWarning}
                                    leavePage={leavePage}/>
                <UnitHeader obj={user} mayEdit={false} history={this.props.history}
                            auditLogPath={"me/me"}
                            name={user.name}>
                </UnitHeader>
                <Tabs initialActiveTab={tab}>
                    {tabs}
                </Tabs>
            </div>);
    };

}

export default Profile;
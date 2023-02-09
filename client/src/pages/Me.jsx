import React from "react";
import {deleteUser, updateUser,} from "../api";
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
import {Tooltip} from "@surfnet/sds";
import InstituteColumn from "../components/redesign/InstituteColumn";
import moment from "moment";
import DOMPurify from "dompurify";
import {ReactComponent as EditIcon} from "@surfnet/sds/icons/functional-icons/edit.svg";
import {ReactComponent as TrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import UploadButton from "../components/UploadButton";

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
            user_ip_networks: [],
            invalidInputs: {},
            initial: true,
            id: user.id,
            loading: true
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
        const urlSearchParams = new URLSearchParams(window.location.search);
        const deleteLink = urlSearchParams.get("delete");
        if (deleteLink) {
            this.delete();
        }

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
        deleteUser().then(() => window.location.href = "/landing")
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
            this.setState({loading: true});
            updateUser(this.state).then(() => {
                this.props.refreshUser();
                this.gotoHome();
                setFlash(I18n.t("user.flash.updated"));
            });
        }
    };

    onFileRemoval = index => e => {
        stopEvent(e);
        const {ssh_keys} = this.state;
        ssh_keys.splice(index, 1);
        this.setState({ssh_keys: [...ssh_keys]});
    };

    onFileUpload = e => {
        const files = e.target.files;
        if (!isEmpty(files)) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const sshValue = reader.result.toString();
                const validSsh = validateSSHKey(sshValue);
                const {ssh_keys} = this.state;
                ssh_keys.push({
                    fileInputKey: new Date().getMilliseconds(),
                    fileTypeError: !validSsh,
                    ssh_value: validSsh ? sshValue : "",
                    fileName: file.name
                });
                this.setState({ssh_keys: [...ssh_keys]});
            };
            reader.readAsText(file);
        }
    };

    showConvertSSHKey = sshKey => !isEmpty(sshKey) && (
        sshKey.startsWith("---- BEGIN SSH2 PUBLIC KEY ----") ||
        sshKey.startsWith("-----BEGIN PUBLIC KEY-----") ||
        sshKey.startsWith("-----BEGIN RSA PUBLIC KEY-----"));

    renderForm = (user, ssh_keys, user_ip_networks, disabledSubmit, config) => {
        const createdAt = user.created_at;
        const d = new Date(0);
        d.setUTCSeconds(createdAt);
        const values = {"created_at": moment(d).format("LLLL")};
        const firstAttributes = ["email", "name"];
        const secondAttributes = [ "affiliation", "username"];
        const mfaValue = user.second_factor_auth ? I18n.t("mfa.profile.handledBySRAM") :
            I18n.t("mfa.profile.handledByIdp", {name: user.schac_home_organisation || I18n.t("mfa.profile.institution")});
        return (
            <div className="user-profile-tab-container">
                <div className="user-profile-tab">
                    <h3>{I18n.t("home.tabs.me")}</h3>
                    <div className={"sds--table"}>
                        <table className={"my-attributes"}>
                            <thead>
                            <th className={"attribute-key"}/>
                            <th className={"attribute-value"}/>
                            <th className={"actions"}/>
                            </thead>
                            <tbody>
                            {firstAttributes.map(attribute =>
                                <tr key={attribute}>
                                    <td className="attribute-key">{I18n.t(`profile.${attribute}`)}</td>
                                    <td className="attribute-value">{values[attribute] || user[attribute] || "-"}</td>
                                    <td className="actions"/>
                                </tr>)
                            }
                            <tr>
                                <td className="attribute-key">{I18n.t("profile.schac_home_organisation")}</td>
                                <td className="attribute-value"><InstituteColumn entity={{user: user}}
                                                                                 currentUser={user} greyed={false}/>
                                </td>
                                <td className="actions"/>
                            </tr>
                            {secondAttributes.map(attribute =>
                                <tr key={attribute}>
                                    <td className="attribute-key">{I18n.t(`profile.${attribute}`)}</td>
                                    <td className="attribute-value">{values[attribute] || user[attribute] || "-"}</td>
                                    <td className="actions"/>
                                </tr>)
                            }
                            {config.second_factor_authentication_required && <tr>
                                <td className="attribute-key">{I18n.t("mfa.profile.name")}</td>
                                <td className="attribute-value">{mfaValue}</td>
                                <td className="actions" onClick={() => user.second_factor_auth && this.configureMfa()}>
                                    {user.second_factor_auth && <div className={"icon-container"}><EditIcon/></div>}
                                </td>
                            </tr>}
                            {ssh_keys.map((ssh_key, index) =>
                                <tr key={index}>
                                    <td className="attribute-key">{index === 0 && <span>{I18n.t("user.ssh_key")}<Tooltip
                                        tip={I18n.t("user.ssh_keyTooltip")}/></span>}</td>
                                    <td className="attribute-value">
                                        {ssh_key.ssh_value}
                                        {ssh_key.fileTypeError &&
                                        <ErrorIndicator msg={I18n.t("user.sshKeyError")} decode={false}/>}
                                        {this.showConvertSSHKey(ssh_key.ssh_value) &&
                                        <span className="ssh-convert"
                                              dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("user.sshConvertInfo"))}}/>}

                                    </td>
                                    <td className="actions" onClick={this.onFileRemoval(index)}>
                                        <div className={"icon-container"}><TrashIcon/></div>
                                    </td>
                                </tr>)}
                            </tbody>
                        </table>
                    </div>

                    <UploadButton name={I18n.t("profile.addSSHKey")}
                                  acceptFileFormat={".pub"}
                                  onFileUpload={this.onFileUpload}/>

                    <section className="actions">
                        <Button warningButton={true}
                                onClick={this.delete}/>
                        <a className="sds--btn sds--btn--secondary"
                           href={`${window.location.protocol}//${window.location.host}/api/users/personal`.replaceAll("3000", "8080")}
                           download={`${I18n.t("home.tabs.me")}.json`}>
                            {I18n.t("user.download")}
                        </a>
                        <Button disabled={disabledSubmit} txt={I18n.t("user.update")}
                                onClick={this.submit}/>
                    </section>

                </div>
            </div>);
    };

    render() {
        const {
            confirmationDialogAction, confirmationDialogOpen, cancelDialogAction, confirmationQuestion,
            initial, ssh_keys, user_ip_networks, nameConfirmation
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

                {this.renderForm(user, ssh_keys, user_ip_networks, disabledSubmit, config)}
            </div>
        );
    }

}

export default Me;
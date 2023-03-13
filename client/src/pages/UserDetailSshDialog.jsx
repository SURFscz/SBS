import React from "react";
import I18n from "i18n-js";
import "./UserDetail.scss";
import "./UserDetailSshDialog.scss";
import Modal from "react-modal";
import InputField from "../components/InputField";
import Button from "../components/Button";

class UserDetailDialog extends React.Component {


    render() {
        const {user, toggle} = this.props;
        return (
            <Modal
                isOpen={true}
                onRequestClose={this.toggleSsh}
                contentLabel={I18n.t("models.allUsers.ssh.title", {name: user.name})}
                className="ssh-dialog-content"
                overlayClassName="ssh-dialog-overlay"
                closeTimeoutMS={250}
                ariaHideApp={false}>
                <section className="ssh-keys-container">
                    <h2>{I18n.t("models.allUsers.ssh.title", {name: user.name})}</h2>
                    <div className="shh-dialog-inner">
                        {user.ssh_keys.map((ssh_key, index) => <div key={index} className={`index-${index}`}>
                            <InputField value={ssh_key.ssh_value}
                                        name={`ssh_key_${index}`}
                                        multiline={true}
                                        copyClipBoard={true}
                                        large={true}
                                        cols={10}
                                        disabled={true}
                                        displayLabel={false}
                            />
                        </div>)}
                    </div>
                    <section className="actions">
                        <Button txt={I18n.t("forms.close")}
                                onClick={toggle}/>
                    </section>

                </section>
            </Modal>);
    }

}

export default UserDetailDialog;
import React from "react";
import I18n from "../../locale/I18n";
import "../user-detail/UserDetail.scss";
import "./UserDetailSshDialog.scss";
import InputField from "../../components/input-field/InputField";
import {Modal} from "@surfnet/sds";

class UserDetailDialog extends React.Component {

    content(user) {
        return (<div className="shh-dialog-inner">
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
        </div>)
    }

    render() {
        const {user, toggle} = this.props;
        return (
            <Modal
                confirm={toggle}
                full={true}
                children={this.content(user)}
                title={I18n.t("models.allUsers.ssh.title", {name: user.name})}
                confirmationButtonLabel={I18n.t("forms.close")}
                className={"ssh-modal"}
            />
        )
    }

}

export default UserDetailDialog;

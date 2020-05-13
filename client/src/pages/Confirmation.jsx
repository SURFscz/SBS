import React from "react";
import "./Confirmation.scss";
import I18n from "i18n-js";
import Button from "../components/Button";

class Confirmation extends React.Component {

    confirmAccount = () => {
        const {config} = this.props;
        window.location.href = config.admin_users_upgrade_url;
    };

    render() {
        return (
            <div className="mod-confirmation">

                    <h1>{I18n.t("confirmation.title")}</h1>

                    <p className="info">{I18n.t("confirmation.info")}</p>

                <section className="actions">
                    <Button
                        txt={I18n.t("confirmation.confirmAccount")}
                        onClick={this.confirmAccount}/>
                </section>

            </div>);
    };
}

export default Confirmation;
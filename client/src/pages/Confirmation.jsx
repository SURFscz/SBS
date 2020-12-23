import React from "react";
import "./Confirmation.scss";
import I18n from "i18n-js";
import Button from "../components/Button";
import {ReactComponent as Logo} from "../icons/ram.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import goat from "./goat.wav";

class Confirmation extends React.Component {

    confirmAccount = () => {
        const {config} = this.props;
        window.location.href = config.admin_users_upgrade_url;
    };

    render() {
        return (
            <div className="mod-confirmation-container">
                <UnitHeader obj={({name: I18n.t("home.sram"), svg: Logo})}
                            svgClick={() => new Audio(goat).play()}>

                    <h2>{I18n.t("confirmation.title")}</h2>

                </UnitHeader>
                <div className="mod-confirmation">
                    <p className="info">{I18n.t("confirmation.info")}</p>

                    <section className="actions">
                        <Button
                            txt={I18n.t("confirmation.confirmAccount")}
                            onClick={this.confirmAccount}/>
                    </section>

                </div>

            </div>);
    };
}

export default Confirmation;
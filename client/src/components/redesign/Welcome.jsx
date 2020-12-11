import React from "react";
import "./Welcome.scss";
import I18n from "i18n-js";


class Welcome extends React.Component {

    render() {
        return (
            <div className="mod-welcome-container">
                <div className="mod-welcome">
                    <h1>{I18n.t("welcome.title")}</h1>
                    <p dangerouslySetInnerHTML={{__html: I18n.t("welcome.info")}}/>
                </div>
            </div>
        );
    }
}

export default Welcome;
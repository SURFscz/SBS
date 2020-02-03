import React from "react";
import I18n from "i18n-js";
import "./Explain.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default class Explain extends React.Component {

    render() {
        const {close, isVisible, subject, children} = this.props;
        if (isVisible) {
            setTimeout(() => this.main && this.main.focus(), 150);
        }
        return (
            <div className={`mod-explain ${isVisible ? "" : "hide"}`}
                 tabIndex="1"
                 onBlur={close}
                 onKeyDown={e => e.keyCode === 27 && close()}
                 ref={ref => this.main = ref}>
                <section className="container">
                    <section className="header">
                        <p>{I18n.t("explain.title", {subject: subject})}</p>
                        <FontAwesomeIcon icon="times" onClick={close}/>
                    </section>
                    {children}
                </section>
            </div>
        );
    }
}

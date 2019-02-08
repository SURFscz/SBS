import React from "react";
import I18n from "i18n-js";
import "./Explain.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default class Explain extends React.PureComponent {

    componentWillReceiveProps(nextProps) {
        if (this.props.isVisible === false && nextProps.isVisible === true) {
            setTimeout(() => this.main.focus(), 50);
        }
    }

    render() {
        const {close, isVisible, subject, children} = this.props;
        return (
            <div className={`mod-explain ${isVisible ? "" : "hide"}`}
                 tabIndex="1" onBlur={close}
                 ref={ref => this.main = ref}>
                <section className="container">
                    <section className="header">
                        <p>{I18n.t("explain.title", {subject: subject})}</p>
                        <FontAwesomeIcon icon="window-close" onClick={close}/>
                    </section>
                    {children}
                </section>
            </div>
        );
    }
}

import React from "react";
import I18n from "../../locale/I18n";
import PropTypes from "prop-types";
import ReactMde from "react-mde";
import "./OrganisationOnBoarding.scss";
import "react-mde/lib/styles/css/react-mde-all.css";
import {convertToHtml} from "../../utils/Markdown";
import {Tooltip} from "@surfnet/sds";
import {isEmpty} from "../../utils/Utils";

export default class OrganisationOnBoarding extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            selectedTab: isEmpty(props.on_boarding_msg) ? "write" : "preview"
        };
        this.tabOptions = {
            "write": I18n.t("organisation.onBoarding.tabs.write"),
            "preview": I18n.t("organisation.onBoarding.tabs.preview")
        };
    }

    saveValue = value => {
        const {saveOnBoarding} = this.props;
        saveOnBoarding(value);
    };

    render() {
        const {selectedTab} = this.state;
        const {on_boarding_msg, tooltip, title, hideTooltip} = this.props;
        return (
            <div className="organisation-onboarding">
                <label className="label">{title || I18n.t("organisation.onBoarding.label")}</label>
                {!hideTooltip && <span className="tool-tip-section">
                    <Tooltip tip={I18n.t(tooltip || "organisation.onBoarding.tooltip")}/>
                    </span>}
                <div className="container">
                    <ReactMde
                        toolbarCommands={[
                            ["header", "bold", "italic", "strikethrough"],
                            ["link", "quote", "code"],
                            ["unordered-list", "ordered-list"]
                        ]}
                        maxEditorHeight={240}
                        value={on_boarding_msg || ""}
                        l18n={this.tabOptions}
                        onChange={this.saveValue}
                        selectedTab={selectedTab}
                        onTabChange={selectedTab => {
                            this.setState({selectedTab});
                        }}
                        generateMarkdownPreview={markdown =>
                            Promise.resolve(convertToHtml(markdown, true))
                        }
                    />
                </div>
            </div>
        );
    }
}

OrganisationOnBoarding.propTypes = {
    on_boarding_msg: PropTypes.string,
    saveOnBoarding: PropTypes.func,
    tooltip: PropTypes.string,
    title: PropTypes.string,
};

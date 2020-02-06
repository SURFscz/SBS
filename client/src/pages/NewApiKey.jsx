import React from "react";

import "react-datepicker/dist/react-datepicker.css";

import {apiKeyValue, createApiKey, organisationById} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";

import "./NewApiKey.scss"
import BackLink from "../components/BackLink";

class NewApiKey extends React.Component {

    constructor(props, context) {
        super(props, context);

        this.state = {
            hashedSecret: "",
            description: "",
            organisation: undefined,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/organisations/${this.props.match.params.organisation_id}`)),
            leavePage: true,
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.organisation_id) {
            Promise.all([organisationById(params.organisation_id), apiKeyValue()])
                .then(res => this.setState({organisation: res[0], hashedSecret: res[1].value}));
        } else {
            this.props.history.push("/404");
        }
    };

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    submit = () => {
        const {hashedSecret, description, organisation} = this.state;
        createApiKey({
            organisation_id: organisation.id,
            "hashed_secret": hashedSecret,
            description: description
        }).then(() => {
            this.props.history.goBack();
            setFlash(I18n.t("apiKeys.flash.created", {name: organisation.name}))
        });
    };

    render() {
        const {
            hashedSecret, description, organisation,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage,
        } = this.state;
        if (organisation === undefined) {
            return null;
        }
        return (
            <div className="mod-new-api-key">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}/>
                <BackLink history={this.props.history}/>
                <p className="title">{I18n.t("apiKeys.title", {organisation: organisation.name})}</p>
                <div className="new-api-key">
                    <p>{I18n.t("apiKeys.secretDisclaimer")}</p>
                    <InputField value={hashedSecret}
                                placeholder={I18n.t("organisation.messagePlaceholder")}
                                name={I18n.t("apiKeys.secret")}
                                toolTip={I18n.t("apiKeys.secretTooltip")}
                                disabled={true}
                                copyClipBoard={true}/>

                    <InputField value={description}
                                onChange={e => this.setState({description: e.target.value})}
                                placeholder={I18n.t("apiKeys.descriptionPlaceHolder")}
                                name={I18n.t("apiKeys.description")}
                                toolTip={I18n.t("apiKeys.descriptionTooltip")}
                    />
                    <section className="actions">
                        <Button txt={I18n.t("forms.submit")}
                                onClick={this.submit}/>
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default NewApiKey;
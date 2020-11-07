import React from "react";
import {apiKeyValue, createApiKey, deleteApiKey} from "../../api";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";

import "./ApiKeys.scss";
import I18n from "i18n-js";
import Button from "../Button";
import {setFlash} from "../../utils/Flash";
import Entities from "./Entities";
import InputField from "../InputField";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ConfirmationDialog from "../ConfirmationDialog";
import ApiKeysExplanation from "../explanations/ApiKeys";

class ApiKeys extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            createNewApiKey: false,
            hashedSecret: "",
            description: "",
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false})
        }
    }

    fetchNewApiValue = () => {
        apiKeyValue()
            .then(res => this.setState({
                createNewApiKey: true,
                description: "",
                hashedSecret: res.value
            }));
    };


    refreshAndFlash = (promise, flashMsg, callback) => {
        promise.then(res => {
            this.props.refresh(() => {
                setFlash(flashMsg);
                callback && callback(res);
            });
        });
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    cancelSideScreen = () => {
        this.setState({createNewApiKey: false});
    }

    submit = () => {
        const {hashedSecret, description} = this.state;
        const {organisation} = this.props;
        this.refreshAndFlash(createApiKey({
                organisation_id: organisation.id,
                hashed_secret: hashedSecret,
                description: description
            }), I18n.t("apiKeys.flash.created", {name: organisation.name}),
            () => this.setState({createNewApiKey: false}));
    };

    renderNewApiKeyForm = () => {
        const {description, hashedSecret} = this.state;
        return (
            <div className="api-key-container">
                <a className={"back-to-api-keys"} onClick={this.cancelSideScreen}>
                    <ChevronLeft/>{I18n.t("models.apiKeys.backToApiKeys")}
                </a>
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
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancelSideScreen}/>
                    </section>
                </div>

            </div>
        );
    }

    removeApiKey = apiKey => {
        const action = () => this.refreshAndFlash(deleteApiKey(apiKey.id),
            I18n.t("organisationDetail.flash.apiKeyDeleted"),
            this.closeConfirmationDialog);
        this.confirm(action, I18n.t("organisationDetail.deleteApiKeyConfirmation"));
    };

    render() {
        const {
            createNewApiKey, cancelDialogAction, confirmationDialogAction, confirmationDialogQuestion,
            confirmationDialogOpen
        } = this.state;
        const {organisation} = this.props;
        if (createNewApiKey) {
            return this.renderNewApiKeyForm();
        }
        const columns = [
            {
                key: "secret",
                header: I18n.t("apiKeys.secret"),
                mapper: () => I18n.t("apiKeys.secretValue"),
            },
            {
                key: "description",
                header: I18n.t("apiKeys.description"),
            },
            {
                nonSortable: true,
                key: "trash",
                header: "",
                mapper: apiKey => <span onClick={() => this.removeApiKey(apiKey)}>
                    <FontAwesomeIcon icon="trash"/></span>
            },
        ]
        return (
            <div>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <Entities entities={organisation.api_keys} modelName="apiKeys" searchAttributes={["description"]}
                          defaultSort="description" columns={columns} loading={false}
                          showNew={true} newEntityFunc={this.fetchNewApiValue}
                          explain={<ApiKeysExplanation/>}
                          {...this.props}/>
            </div>
        )
    }
}

export default ApiKeys;
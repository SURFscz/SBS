import React from "react";
import {apiKeyValue, createApiKey, deleteApiKey} from "../../api";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import {ReactComponent as TrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";

import "./ApiKeys.scss";
import I18n from "../../locale/I18n";
import Button from "../Button";
import {setFlash} from "../../utils/Flash";
import Entities from "./Entities";
import InputField from "../InputField";
import ConfirmationDialog from "../ConfirmationDialog";
import {isEmpty, stopEvent} from "../../utils/Utils";
import SpinnerField from "./SpinnerField";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import DOMPurify from "dompurify";
import {dateFromEpoch} from "../../utils/Date";
import ErrorIndicator from "./ErrorIndicator";

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
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            loading: true,
            initial: true
        }
    }

    componentDidMount = () => {
        this.setState({loading: false});
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
        this.setState({loading: true});
        promise.then(res => {
            this.props.refresh(() => {
                this.componentDidMount();
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

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({createNewApiKey: false, initial: true});
    }

    submit = () => {
        const {hashedSecret, description} = this.state;
        const {organisation} = this.props;
        if (isEmpty(description)) {
            this.setState({initial: false});
        } else {
            this.refreshAndFlash(createApiKey({
                    organisation_id: organisation.id,
                    hashed_secret: hashedSecret,
                    description: description
                }), I18n.t("apiKeys.flash.created", {name: organisation.name}),
                () => this.setState({createNewApiKey: false, initial: true}));
        }
    };

    renderNewApiKeyForm = () => {
        const {description, hashedSecret, initial} = this.state;
        return (
            <div className="api-key-container">
                <div>
                    <a href={"/cancel"} className={"back-to-api-keys"} onClick={this.cancelSideScreen}>
                        <ChevronLeft/>{I18n.t("models.apiKeys.backToApiKeys")}
                    </a>
                </div>
                <div className="new-api-key">
                    <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("apiKeys.secretDisclaimer"))}}/>
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
                                error={(!initial && isEmpty(description))}
                                toolTip={I18n.t("apiKeys.descriptionTooltip")}
                    />
                    {(!initial && isEmpty(description)) && <ErrorIndicator
                        msg={I18n.t("apiKeys.required", {
                            attribute: I18n.t("apiKeys.description").toLowerCase()
                        })}/>}

                    <section className="actions">
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancelSideScreen}/>
                        <Button txt={I18n.t("forms.submit")}
                                onClick={this.submit}/>
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
            confirmationDialogOpen, loading
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const {organisation, user} = this.props;
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
                mapper: apiKey => <span className={"cut-of-lines"}>{apiKey.description}</span>
            },
            {
                key: "created_at",
                header: I18n.t("models.userTokens.createdAt"),
                mapper: apiKey => dateFromEpoch(apiKey.created_at)
            },
            {
                key: "created_at",
                header: I18n.t("models.userTokens.createdAt"),
                mapper: apiKey => dateFromEpoch(apiKey.created_at)
            },
            {
                nonSortable: true,
                key: "trash",
                header: "",
                mapper: apiKey => isUserAllowed(ROLES.ORG_ADMIN, user, organisation.id) ?
                    <span onClick={() => this.removeApiKey(apiKey)}>
                    <TrashIcon/>
                </span> : null
            },
        ]
        return (
            <div>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>
                <Entities entities={organisation.api_keys}
                          modelName="apiKeys"
                          searchAttributes={["description"]}
                          defaultSort="description"
                          columns={columns}
                          inputFocus={true}
                          loading={false}
                          showNew={isUserAllowed(ROLES.ORG_ADMIN, user, organisation.id)}
                          newEntityFunc={this.fetchNewApiValue}
                          {...this.props}/>
            </div>
        )
    }
}

export default ApiKeys;
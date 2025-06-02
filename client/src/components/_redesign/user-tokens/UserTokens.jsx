import React from "react";
import {
    createUserToken,
    deleteUserToken,
    reactivateUserToken,
    updateUserToken,
    userTokenGenerateValue
} from "../../../api";
import {ReactComponent as ChevronLeft} from "../../../icons/chevron-left.svg";
import "./UserTokens.scss";
import {isEmpty, stopEvent} from "../../../utils/Utils";
import I18n from "../../../locale/I18n";
import Button from "../../button/Button";
import {setFlash} from "../../../utils/Flash";
import ConfirmationDialog from "../../confirmation-dialog/ConfirmationDialog";
import Entities from "../entities/Entities";
import SpinnerField from "../spinner-field/SpinnerField";
import InputField from "../../input-field/InputField";
import {AppStore} from "../../../stores/AppStore";
import ErrorIndicator from "../error-indicator/ErrorIndicator";
import {dateFromEpoch, isUserTokenExpired, userTokenExpiryDate} from "../../../utils/Date";
import SelectField from "../../select-field/SelectField";
import DOMPurify from "dompurify";

class UserTokens extends React.Component {

    constructor(props, context) {
        super(props, context);
        const {services} = this.props;
        const serviceOptions = this.mapServicesToOptions(services)
        this.state = {
            required: ["name"],
            alreadyExists: {},
            initial: true,
            createNewUserToken: false,
            selectedUserTokenId: null,
            name: "",
            description: "",
            hashed_token: "",
            expiryDate: "",
            expired: false,
            user_id: props.user.id,
            service: serviceOptions[0],
            serviceOptions: serviceOptions,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            loading: true,
        }
    }

    mapServicesToOptions = services => services.map(service => ({
        label: service.name,
        value: service.id,
        id: service.id,
        logo: service.logo,
        token_validity_days: service.token_validity_days
    }));


    componentDidMount = callback => {
        this.setState({
            loading: false,
            initial: true,
            createNewUserToken: false,
            selectedUserTokenId: null,
        }, callback);
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({loading: true, confirmationDialogOpen: false});
        promise.then(res => {
            this.props.refresh(() => {
                this.componentDidMount(() => callback && callback(res));
                setFlash(flashMsg);
            });
        });
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    getSelectedUserToken = () => {
        const {selectedUserTokenId} = this.state;
        const {userTokens} = this.props;
        return userTokens.find(token => token.id === selectedUserTokenId);
    }

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({selectedUserTokenId: null, createNewUserToken: false});
        AppStore.update(s => {
            const paths = s.breadcrumb.paths.slice(0, s.breadcrumb.paths.length - 1);
            const lastPath = paths[paths.length - 1];
            if (lastPath) {
                lastPath.path = null;
            }
            s.breadcrumb.paths = paths;
        });
    }

    renderUserTokenContainer = children => {
        const {
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationDialogQuestion
        } = this.state;
        return (
            <div className="user-token-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>
                <div>
                    <a className={"back-to-user-tokens"} onClick={this.cancelSideScreen} href={"/cancel"}>
                        <ChevronLeft/>{I18n.t("models.userTokens.backToUserTokens")}
                    </a>
                </div>
                {children}
            </div>
        );
    }

    newUserTokenState = (userToken, value, service) => {
        service = userToken ? this.getService(userToken) : service;
        return {
            createNewUserToken: userToken ? false : true,
            selectedUserTokenId: userToken ? userToken.id : null,
            initial: true,
            service: service,
            name: userToken ? userToken.name : "",
            description: userToken ? userToken.description : "",
            hashed_token: userToken ? userToken.hashed_token : value,
            expired: userToken ? isUserTokenExpired(userToken, service) : false,
            expiryDate: userTokenExpiryDate(userToken ? userToken.created_at : new Date().getTime() / 1000, service)
        }
    }


    renderUserTokenForm = createNewUserToken => {
        const {
            name, hashed_token, initial, description, service, serviceOptions, expiryDate, expired
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const children = (
            <div className="user-token-form">
                <h2>{createNewUserToken ? I18n.t("models.userTokens.new") : name}</h2>
                {createNewUserToken && <div>
                    <p className="disclaimer"
                       dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("models.userTokens.tokenDisclaimer"))}}/>
                    <InputField value={hashed_token}
                                name={I18n.t("models.userTokens.hashedToken")}
                                toolTip={I18n.t("models.userTokens.hashedTokenTooltip")}
                                disabled={true}
                                copyClipBoard={true}/>
                </div>}
                <InputField value={name || ""}
                            onChange={e => this.setState({
                                name: e.target.value
                            })}
                            error={(!initial && isEmpty(name))}
                            placeholder={I18n.t("models.userTokens.namePlaceholder")}
                            required={true}
                            name={I18n.t("models.userTokens.name")}
                />
                {(!initial && isEmpty(name)) && <ErrorIndicator
                    msg={I18n.t("models.userTokens.required", {
                        attribute: I18n.t("models.userTokens.name").toLowerCase()
                    })}/>}

                <InputField value={description}
                            name={I18n.t("models.userTokens.description")}
                            placeholder={I18n.t("models.userTokens.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            multiline={true}/>

                <InputField value={expiryDate}
                            disabled={true}
                            name={I18n.t("models.userTokens.expiryDate")}
                            toolTip={I18n.t("models.userTokens.expiryDateTooltip")}/>
                {expired && <ErrorIndicator
                    msg={I18n.t("models.userTokens.expiredInfo",)}/>}

                <SelectField value={service}
                             options={serviceOptions}
                             name={I18n.t("models.userTokens.service")}
                             toolTip={I18n.t("models.userTokens.serviceTooltip")}
                             onChange={this.serviceChanged}
                             searchable={false}
                />

                <section className="actions">
                    {!createNewUserToken &&
                        <Button warningButton={true}
                                onClick={this.delete}/>}
                    <Button cancelButton={true} txt={I18n.t("forms.cancel")}
                            onClick={this.cancelSideScreen}/>
                    {expired && <Button txt={I18n.t(`models.userTokens.reactivate`)}
                                        onClick={this.reactivate}/>}
                    <Button disabled={disabledSubmit} txt={I18n.t(`forms.save`)}
                            onClick={this.submit}/>
                </section>

            </div>
        );
        return this.renderUserTokenContainer(children);
    }

    serviceChanged = selectedOption => {
        const userToken = this.getSelectedUserToken();
        const newExpiryDate = userTokenExpiryDate(userToken ? userToken.created_at : new Date().getTime() / 1000, selectedOption);
        this.setState({service: selectedOption, expiryDate: newExpiryDate});
    }

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoUserTokens,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        const selectedUserToken = this.getSelectedUserToken();
        const action = () => this.refreshAndFlash(deleteUserToken(selectedUserToken),
            I18n.t("userTokens.flash.deleted", {name: selectedUserToken.name}),
            () => this.setState({
                confirmationDialogOpen: false, selectedUserToken: null, editUserToken: false,
                createNewUserToken: false
            }));
        this.confirm(action, I18n.t("userTokens.deleteConfirmation", {name: selectedUserToken.name}));
    };

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    reactivate = () => {
        const {name} = this.state;
        this.refreshAndFlash(reactivateUserToken(this.stateForUserToken(false)),
            I18n.t("models.userTokens.flash.reactivated", {name: name}));

    }

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    stateForUserToken = isNew => {
        const {name, description, hashed_token, user_id, service, selectedUserTokenId} = this.state;
        const res = {name, description, hashed_token, user_id, service_id: service.id}
        if (!isNew) {
            res.id = selectedUserTokenId
        }
        return res;
    }

    doSubmit = () => {
        if (this.isValid()) {
            const {name, createNewUserToken} = this.state;
            if (createNewUserToken) {
                this.refreshAndFlash(createUserToken(this.stateForUserToken(true)),
                    I18n.t("models.userTokens.flash.created", {name: name}));
            } else {
                this.refreshAndFlash(updateUserToken(this.stateForUserToken(false)),
                    I18n.t("models.userTokens.flash.updated", {name: name}));
            }
        } else {
            window.scrollTo(0, 0);
        }
    }

    gotoUserToken = userToken => e => {
        stopEvent(e);
        this.setState(this.newUserTokenState(userToken, userToken.hashed_token, this.getService(userToken)))
        const {collaboration, service} = this.props;
        const lastPathValue = collaboration ? `/collaborations/${collaboration.id}` : `/services/${service.id}`;
        AppStore.update(s => {
            const paths = s.breadcrumb.paths;
            const lastPath = paths[paths.length - 1];
            lastPath.path = lastPathValue;
            paths.push({
                value: I18n.t("breadcrumb.userToken", {name: userToken.name})
            })
            s.breadcrumb.paths = paths;
        });
    }

    getService = userToken => {
        const {serviceOptions} = this.state;
        return serviceOptions.find(service => service.id === userToken.service_id);
    }

    fetchNewTokenValue = () => {
        const {service} = this.state;
        userTokenGenerateValue()
            .then(res => this.setState(this.newUserTokenState(null, res.value, service)))
    }

    render() {
        const {
            loading, createNewUserToken, service
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {userTokens} = this.props;
        const selectedUserToken = this.getSelectedUserToken();
        if (createNewUserToken || selectedUserToken) {
            return this.renderUserTokenForm(createNewUserToken);
        }

        const columns = [
            {
                key: "name",
                header: I18n.t("models.userTokens.name"),
                mapper: userToken => <a href={`${userToken.name}`}
                                        className={"neutral-appearance"}
                                        onClick={this.gotoUserToken(userToken)}>{userToken.name}</a>,
            },
            {
                key: "description",
                header: I18n.t("models.userTokens.description"),
                mapper: group => <span className={"cut-of-lines"}>{group.description}</span>
            },
            {
                key: "service__name",
                header: I18n.t("models.userTokens.service"),
                mapper: userToken => this.getService(userToken).label
            },
            {
                nonSortable: true,
                key: "expiry_date",
                header: I18n.t("models.userTokens.expiryDate"),
                mapper: userToken => {
                    const expired = isUserTokenExpired(userToken, service);
                    return <span className={`expiry_date ${expired ? "expired" : ""}`}>
                        {userTokenExpiryDate(userToken.created_at, this.getService(userToken))}
                    </span>
                }
            },
            {
                nonSortable: true,
                key: "last_used_date",
                header: I18n.t("models.userTokens.lastUsedDate"),
                mapper: userToken => {
                    return <span>
                        {userToken.last_used_date ? dateFromEpoch(userToken.last_used_date) : "-"}
                    </span>
                }
            },
        ]
        return (
            <div>
                <Entities entities={userTokens}
                          modelName="userTokens"
                          tableClassName="user-tokens"
                          searchAttributes={["name", "description"]}
                          defaultSort="name"
                          rowLinkMapper={() => this.gotoUserToken}
                          columns={columns}
                          loading={loading}
                          showNew={true}
                          newEntityFunc={this.fetchNewTokenValue}
                          {...this.props}/>
            </div>
        )
    }
}

export default UserTokens;

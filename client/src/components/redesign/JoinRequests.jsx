import React from "react";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";

import "./JoinRequests.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Button from "../Button";
import {setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../ConfirmationDialog";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";
import InputField from "../InputField";
import {joinRequestAccept, joinRequestDecline} from "../../api";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import UserColumn from "./UserColumn";
import moment from "moment";

class JoinRequests extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedJoinRequestId: null,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            loading: true,
        }
    }

    componentDidMount = callback => {
        this.setState({loading: false, selectedJoinRequestId: null}, callback);
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.closeConfirmationDialog();
        this.setState({loading: true});
        promise.then(res => {
            this.props.refresh(() => {
                this.componentDidMount(() => callback && callback(res));
                setFlash(flashMsg);
            });
        });
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    getSelectedJoinRequest = () => {
        const {selectedJoinRequestId} = this.state;
        const {collaboration} = this.props;
        return collaboration.join_requests.find(jr => jr.id === selectedJoinRequestId);
    }

    acceptJoinRequest = () => {
        const {collaboration} = this.props;
        const joinRequest = this.getSelectedJoinRequest();
        this.refreshAndFlash(joinRequestAccept(joinRequest),
            I18n.t("joinRequest.flash.accepted", {
                name: collaboration.name
            }), () => this.componentDidMount());
    };

    declineJoinRequest = () => {
        const {collaboration} = this.props;
        const joinRequest = this.getSelectedJoinRequest();
        this.refreshAndFlash(joinRequestDecline(joinRequest),
            I18n.t("joinRequest.flash.declined", {
                name: collaboration.name
            }), () => this.componentDidMount());
    };

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({selectedJoinRequestId: null});
    }

    openJoinRequest = joinRequest => e => {
        stopEvent(e);
        this.setState({selectedJoinRequestId: joinRequest.id});
    };

    renderJoinRequestForm = (collaboration, joinRequest) => {
        const {confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationDialogQuestion} = this.state;
        return (
            <div className="join-request-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={true}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <a className={"back-to-join-requests"} onClick={this.cancelSideScreen} href={"/cancel"}>
                    <ChevronLeft/>{I18n.t("models.joinRequests.backToJoinRequests")}
                </a>
                <div className="join-request-form">
                    <h2>{I18n.t("models.joinRequests.details",
                        {
                            date: moment(joinRequest.created_at * 1000).format("LL"),
                            name: joinRequest.user.name
                        })}</h2>

                    {joinRequest.reference && <InputField name={I18n.t("joinRequest.reference")}
                                                          value={joinRequest.reference}
                                                          disabled={true}
                                                          noInput={true}
                                                          toolTip={I18n.t("joinRequest.referenceTooltip",
                                                              {
                                                                  collaboration: collaboration.name,
                                                                  name: joinRequest.user.name
                                                              })}/>}

                    <InputField name={I18n.t("joinRequest.message")} value={joinRequest.message}
                                disabled={true}
                                multiline={true}
                                toolTip={I18n.t("joinRequest.messageTooltip", {name: joinRequest.user.name})}/>

                    <section className="actions">
                        <Button warningButton={true} txt={I18n.t("joinRequest.decline")}
                                onClick={() => this.confirm(this.declineJoinRequest, I18n.t("joinRequest.declineConfirmation"))}/>
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancelSideScreen}/>
                        <Button txt={I18n.t("joinRequest.accept")}
                                onClick={this.acceptJoinRequest}/>
                    </section>
                </div>
            </div>)

    }

    render() {
        const {loading} = this.state;
        const {collaboration, user: currentUser} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const selectedJoinRequest = this.getSelectedJoinRequest();
        if (selectedJoinRequest) {
            return this.renderJoinRequestForm(collaboration, selectedJoinRequest);
        }
        const columns = [
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: () => <div className="member-icon">
                    <UserIcon/>
                </div>
            },
            {
                key: "user__name",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={currentUser}/>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: entity => entity.user.schac_home_organisation
            },
            {
                nonSortable: true,
                key: "open",
                header: "",
                mapper: entity => <Button onClick={this.openJoinRequest(entity)} txt={I18n.t("forms.open")}
                                          small={true}/>
            },

        ]
        return (
            <div>
                <Entities entities={collaboration.join_requests}
                          modelName="joinRequests"
                          searchAttributes={["user__name", "user__email", "message", "reference"]}
                          defaultSort="name"
                          rowLinkMapper={() => this.openJoinRequest}
                          columns={columns}
                          loading={loading}
                          {...this.props}/>
            </div>
        )
    }
}

export default JoinRequests;
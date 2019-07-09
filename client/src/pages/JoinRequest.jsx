import React from "react";
import I18n from "i18n-js";
import "./JoinRequest.scss";
import {joinRequestAccept, joinRequestByHash, joinRequestDecline} from "../api";
import InputField from "../components/InputField";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import Button from "../components/Button";
import {stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class JoinRequest extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            joinRequest: {collaboration: {}, user: {}},
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push("/collaborations")),
            leavePage: true,
            alreadyMember: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.hash) {
            joinRequestByHash(params.hash)
                .then(json => this.setState({joinRequest: json}))
                .catch(() => setFlash(I18n.t("joinRequest.flash.notFound"), "error"));
        } else {
            this.props.history.push("/404");
        }
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoCollaborations = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push(`/collaborations/${this.state.joinRequest.collaboration.id}`));

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: true,
            cancelDialogAction: this.gotoCollaborations, confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    decline = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog, confirmationDialogAction: this.doDecline
        });
    };

    doDecline = () => {
        const {joinRequest} = this.state;
        joinRequestDecline(joinRequest)
            .then(() => {
                this.props.history.push("/collaborations");
                setFlash(I18n.t("joinRequest.flash.declined", {name: joinRequest.collaboration.name}));
            })
            .catch(() => {
                this.setState({joinRequest: {collaboration: {}, user: {}}});
                setFlash(I18n.t("joinRequest.flash.notFound"), "error");
            });

    };

    doSubmit = () => {
        const {joinRequest} = this.state;
        joinRequestAccept(joinRequest)
            .then(() => {
                this.gotoCollaborations();
                setFlash(I18n.t("joinRequest.flash.accepted", {name: joinRequest.collaboration.name}));
            })
            .catch(e => {
                if (e.response.status === 409) {
                    this.setState({alreadyMember: true});
                    setFlash(I18n.t("joinRequest.flash.alreadyMember", {name: joinRequest.collaboration.name}), "error");
                } else {
                    this.setState({joinRequest: {collaboration: {}, user: {}}});
                    setFlash(I18n.t("joinRequest.flash.notFound"), "error");
                }
            });
    };

    accept = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    render() {
        const {joinRequest, confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, alreadyMember} =
            this.state;
        const joinRequestFound = joinRequest.id;
        return (
            <div className="mod-join-request">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={leavePage ? undefined : I18n.t("joinRequest.declineConfirmation")}
                                    leavePage={leavePage}/>
                {joinRequestFound && <div className="title">
                    <a href={`/collaborations/${joinRequest.collaboration.id}`} onClick={e => {
                        stopEvent(e);
                        this.props.history.push(`/collaborations/${joinRequest.collaboration.id}`)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("collaborationDetail.backToCollaborationDetail", {name: joinRequest.collaboration.name})}
                    </a>
                    <p className="title">{I18n.t("joinRequest.title", {
                        collaboration: joinRequest.collaboration.name,
                        requester: joinRequest.user.name
                    })}</p>
                </div>}
                <div className="join-request-container">
                    <InputField name={I18n.t("joinRequest.message")} value={joinRequest.message} disabled={true}
                                toolTip={I18n.t("joinRequest.messageTooltip", {name: joinRequest.user.name})}/>

                    <InputField name={I18n.t("joinRequest.reference")} value={joinRequest.reference} disabled={true}
                                toolTip={I18n.t("joinRequest.referenceTooltip",
                                    {collaboration: joinRequest.collaboration.name, name: joinRequest.user.name})}/>

                    <InputField name={I18n.t("joinRequest.collaborationName")} value={joinRequest.collaboration.name}
                                disabled={true}/>

                    <InputField name={I18n.t("joinRequest.userName")} value={joinRequest.user.name} disabled={true}/>
                    {joinRequestFound &&
                    <section className="actions">
                        <Button txt={I18n.t("joinRequest.accept")}
                                onClick={this.accept}
                                disabled={alreadyMember}/>
                        <Button cancelButton={true} txt={I18n.t("joinRequest.decline")}
                                onClick={this.decline}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>}

                </div>
            </div>)
            ;
    };
}

export default JoinRequest;
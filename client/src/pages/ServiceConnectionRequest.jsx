import React from "react";
import I18n from "../locale/I18n";
import "./ServiceConnectionRequest.scss";
import {
    approveServiceConnectionRequestByHash,
    denyServiceConnectionRequestByHash,
    serviceConnectionRequestByHash
} from "../api";
import InputField from "../components/InputField";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import Button from "../components/Button";
import UnitHeader from "../components/redesign/UnitHeader";

class ServiceConnectionRequest extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            serviceConnectionRequest: {collaboration: {}, service: {}, requester: {}},
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push("/")),
            leavePage: true
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.hash) {
            serviceConnectionRequestByHash(params.hash)
                .then(json => this.setState({serviceConnectionRequest: json}))
                .catch(() => setFlash(I18n.t("serviceConnectionRequest.flash.notFound"), "error"));
        } else {
            this.props.history.push("/404");
        }
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoHome = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push("/"));

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoHome,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    decline = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDecline
        });
    };

    doDecline = () => {
        const {serviceConnectionRequest} = this.state;
        denyServiceConnectionRequestByHash(serviceConnectionRequest.hash)
            .then(() => {
                this.gotoHome();
                setFlash(I18n.t("serviceConnectionRequest.flash.declined", {name: serviceConnectionRequest.service.name}));
            })
            .catch(() => {
                this.props.history.push("/404");
            });

    };

    doSubmit = () => {
        const {serviceConnectionRequest} = this.state;
        approveServiceConnectionRequestByHash(serviceConnectionRequest.hash)
            .then(() => {
                this.gotoHome();
                setFlash(I18n.t("serviceConnectionRequest.flash.accepted", {name: serviceConnectionRequest.service.name}));
            })
            .catch(() => {
                this.props.history.push("/404");
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
        const {
            serviceConnectionRequest,
            confirmationDialogOpen,
            confirmationDialogAction,
            cancelDialogAction,
            leavePage
        } =
            this.state;
        const serviceConnectionRequestFound = serviceConnectionRequest.id;
        const title = I18n.t("serviceConnectionRequest.title");
        return (
            <div className="service-connection-request-container">
                {serviceConnectionRequestFound &&
                <UnitHeader obj={({name: title, logo: serviceConnectionRequest.service.logo})}>
                    <span className="subTitle">
                        {I18n.t("serviceConnectionRequest.subTitle", {
                            collaboration: serviceConnectionRequest.collaboration.name,
                            requester: serviceConnectionRequest.requester.name,
                            service: serviceConnectionRequest.service.name
                        })}
                    </span>
                </UnitHeader>}

                <div className="mod-service-connection-request">
                    <ConfirmationDialog isOpen={confirmationDialogOpen}
                                        cancel={cancelDialogAction}
                                        confirm={confirmationDialogAction}
                                        question={leavePage ? undefined : I18n.t("serviceConnectionRequest.declineConfirmation")}
                                        leavePage={leavePage}/>

                    <div className="service-connection-request">
                        <InputField name={I18n.t("serviceConnectionRequest.message")}
                                    large={true}
                                    value={serviceConnectionRequest.message}
                                    disabled={true}
                                    multiline={true}
                                    toolTip={I18n.t("serviceConnectionRequest.messageTooltip", {name: serviceConnectionRequest.requester.name})}/>

                        <InputField name={I18n.t("serviceConnectionRequest.collaboration")}
                                    value={serviceConnectionRequest.collaboration.name}
                                    disabled={true}/>

                        <InputField name={I18n.t("serviceConnectionRequest.requester")}
                                    value={serviceConnectionRequest.requester.name} disabled={true}/>
                        {serviceConnectionRequestFound &&
                        <section className="actions">
                            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                            <Button cancelButton={true} txt={I18n.t("serviceConnectionRequest.decline")}
                                    onClick={this.decline}/>
                            <Button txt={I18n.t("serviceConnectionRequest.accept")}
                                    onClick={this.accept}/>
                        </section>}

                    </div>
                </div>
            </div>)
            ;
    }
}

export default ServiceConnectionRequest;
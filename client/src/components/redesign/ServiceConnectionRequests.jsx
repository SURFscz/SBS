import React from "react";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";

import "./ServiceConnectionRequests.scss";
import "./UserColumn.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Button from "../Button";
import {setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../ConfirmationDialog";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";
import InputField from "../InputField";
import {approveServiceConnectionRequestByHash, denyServiceConnectionRequestByHash} from "../../api";
import moment from "moment";
import Logo from "./Logo";
import InstituteColumn from "./InstituteColumn";
import UserColumn from "./UserColumn";

class ServiceConnectionRequests extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedServiceConnectionRequestId: null,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            isWarning: false,
            loading: true,
        }
    }

    componentDidMount = callback => {
        this.setState({loading: false, selectedServiceConnectionRequestId: null}, callback);
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

    getSelectedServiceConnectionRequest = () => {
        const {selectedServiceConnectionRequestId} = this.state;
        const {serviceConnectionRequests} = this.props;
        return serviceConnectionRequests.find(scr => scr.id === selectedServiceConnectionRequestId);
    }

    approveServiceConnectionRequest = () => {
        const {service} = this.props;
        const serviceConnectionRequest = this.getSelectedServiceConnectionRequest();
        this.confirm(() => {
            this.refreshAndFlash(approveServiceConnectionRequestByHash(serviceConnectionRequest.hash),
                I18n.t("serviceConnectionRequest.flash.accepted", {
                    name: service.name
                }), () => this.componentDidMount())
        }, I18n.t("serviceConnectionRequest.approveConfirmation"), false);

    };

    denyServiceConnectionRequest = () => {
        const {service} = this.props;
        const serviceConnectionRequest = this.getSelectedServiceConnectionRequest();
        this.confirm(() => {
            this.refreshAndFlash(denyServiceConnectionRequestByHash(serviceConnectionRequest.hash),
                I18n.t("serviceConnectionRequest.flash.denied", {
                    name: service.name
                }), () => this.componentDidMount())
        }, I18n.t("serviceConnectionRequest.declineConfirmation"), true);
    };

    confirm = (action, question, isWarning) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action,
            isWarning: isWarning
        });
    };

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({selectedServiceConnectionRequestId: null});
    }

    openServiceConnectionRequest = serviceConnectionRequest => e => {
        stopEvent(e);
        this.setState({selectedServiceConnectionRequestId: serviceConnectionRequest.id});
    };

    renderServiceConnectionRequest = (service, serviceConnectionRequest) => {
        const {
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationDialogQuestion,
            isWarning
        } = this.state;
        return (
            <div className="service-connection-requests-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={isWarning}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <div>
                    <a className={"back-to-service-connection-requests"} onClick={this.cancelSideScreen}
                       href={"/cancel"}>
                        <ChevronLeft/>{I18n.t("models.serviceConnectionRequests.backToServiceConnectionRequests")}
                    </a>
                </div>
                <div className="service-connection-request-form">
                    <h2>{I18n.t("models.serviceConnectionRequests.details",
                        {
                            date: moment(serviceConnectionRequest.created_at * 1000).format("LL"),
                            name: serviceConnectionRequest.requester.name || serviceConnectionRequest.requester.uid,
                            collaborationName: serviceConnectionRequest.collaboration.name
                        })}</h2>

                    <InputField name={I18n.t("serviceConnectionRequest.message")}
                                value={serviceConnectionRequest.message}
                                disabled={true}
                                multiline={true}
                                toolTip={I18n.t("serviceConnectionRequest.messageTooltip", {name: serviceConnectionRequest.requester.name})}/>

                    <section className="actions">
                        <Button cancelButton={true} txt={I18n.t("serviceConnectionRequest.decline")}
                                onClick={this.denyServiceConnectionRequest}/>
                        <Button txt={I18n.t("serviceConnectionRequest.accept")}
                                onClick={this.approveServiceConnectionRequest}/>
                    </section>
                </div>
            </div>)

    }

    render() {
        const {loading} = this.state;
        const {service, serviceConnectionRequests, user: currentUser} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const selectedServiceConnectionRequest = this.getSelectedServiceConnectionRequest();
        if (selectedServiceConnectionRequest) {
            return this.renderServiceConnectionRequest(service, selectedServiceConnectionRequest);
        }
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: serviceConnectionRequest => <Logo src={serviceConnectionRequest.collaboration.logo}/>
            },
            {
                key: "collaboration__name",
                header: I18n.t("models.serviceConnectionRequests.name"),
                mapper: serviceConnectionRequest => serviceConnectionRequest.collaboration.name
            },
            {
                key: "requester__name",
                header: I18n.t("models.serviceConnectionRequests.requester"),
                mapper: serviceConnectionRequest => <UserColumn entity={{user:serviceConnectionRequest.requester}} currentUser={currentUser}/>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: serviceConnectionRequest => <InstituteColumn entity={{user:serviceConnectionRequest.requester}} currentUser={currentUser}/>
            },

        ]
        return (
            <div>
                <Entities entities={serviceConnectionRequests}
                          modelName="serviceConnectionRequests"
                          searchAttributes={["requester__name", "requester__email", "message", "collaboration__name"]}
                          defaultSort="collaboration__name"
                          rowLinkMapper={() => this.openServiceConnectionRequest}
                          columns={columns}
                          loading={loading}
                          hideTitle={true}
                          {...this.props}/>
            </div>
        )
    }
}

export default ServiceConnectionRequests;
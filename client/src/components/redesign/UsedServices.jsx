import React from "react";
import {
    addCollaborationServices,
    allServices,
    approveServiceConnectionRequestByHash,
    deleteCollaborationServices,
    deleteServiceConnectionRequest,
    denyServiceConnectionRequestByHash,
    requestServiceConnection,
    resendServiceConnectionRequests
} from "../../api";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";

import "./UsedServices.scss";
import {isEmpty, removeDuplicates, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Button from "../Button";
import {clearFlash, setFlash} from "../../utils/Flash";
import InputField from "../InputField";
import SpinnerField from "./SpinnerField";
import ConfirmationDialog from "../ConfirmationDialog";
import Logo from "./Logo";
import CheckBox from "../CheckBox";
import MissingServices from "../MissingServices";
import moment from "moment";
import {socket, subscriptionIdCookieName} from "../../utils/SocketIO";

class UsedServices extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: [],
            requestConnectionService: null,
            selectedServiceConnectionRequestId: null,
            message: "",
            confirmedAupConnectionRequest: false,
            loading: true,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            disabledConfirm: false,
            confirmationChildren: false,
            selectedService: null,
            warning: false,
            socketSubscribed: false
        }
    }

    componentWillUnmount = () => {
        const {collaboration} = this.props;
        [`collaboration_${collaboration.id}`, "service", `organisation_${collaboration.organisation_id}`].forEach(topic => {
            socket.then(s => s.off(topic));
        });
    }

    componentDidMount = () => {
        const {collaboration} = this.props;
        allServices()
            .then(json => {
                const services = json;
                const requestedServices = collaboration.service_connection_requests
                    .filter(r => !r.is_member_request)
                    .map(r => r.service);
                const memberRequestedServices = collaboration.service_connection_requests
                    .filter(r => r.is_member_request)
                    .map(r => r.service);
                const servicesInUse = collaboration.services
                    .concat(collaboration.organisation.services)
                    .concat(requestedServices)
                    .concat(memberRequestedServices)
                    .map(e => e.id);
                const filteredServices = services
                    .filter(service => {
                        return (service.allowed_organisations.some(org => org.id === collaboration.organisation_id)
                                || service.access_allowed_for_all
                                || service.automatic_connection_allowed
                                || service.non_member_users_access_allowed
                                || service.automatic_connection_allowed_organisations.some(org => org.id === collaboration.organisation_id))
                            && servicesInUse.indexOf(service.id) === -1
                            && (service.allow_restricted_orgs || !collaboration.organisation.services_restricted);
                    });
                this.setState({services: filteredServices, loading: false});
                const {socketSubscribed} = this.state;
                if (!socketSubscribed) {
                    [`collaboration_${collaboration.id}`, "service", `organisation_${collaboration.organisation_id}`].forEach(topic => {
                        socket.then(s => s.on(topic, data => {
                            const subscriptionIdSessionStorage = sessionStorage.getItem(subscriptionIdCookieName);
                            if (subscriptionIdSessionStorage !== data.subscription_id) {
                                //Ensure we don't get race conditions with the refresh in CollaborationDetail
                                setTimeout(this.componentDidMount, 1500);
                            }
                        }));
                    })
                    this.setState({socketSubscribed: true})
                }
            }).catch(() => this.props.history.push("/"));
    }

    openService = service => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/services/${service.id}`);
    };

    getServiceLink = entity => {
        const ref = entity.connectionRequest ? entity.service : entity;
        return <a href={`/services/${ref.id}`}
                  className={"neutral-appearance"}
                  onClick={this.openService(ref)}>{ref.name}</a>
    }

    getServiceStatus = service => {
        const {collaboration} = this.props;
        if (service.usedService && !service.connectionRequest &&
            collaboration.organisation.services.some(s => s.id === service.id)) {
            service.status = I18n.t("models.services.requiredByOrganisation");
        } else if (service.connectionRequest && service.isMemberRequest) {
            service.status = I18n.t("models.services.memberServiceRequest");
        } else if (service.usedService) {
            service.status = service.connectionRequest ? I18n.t("models.services.awaitingApproval") : ""
        } else {
            const allowedToConnect = this.serviceAllowedToConnect(service, collaboration);
            service.status = allowedToConnect ? I18n.t("models.services.automaticConnectionAllowed") : "";
        }
        return service.status;

    }

    unlinkService = (service, collaboration) => {
        const action = () => this.refreshAndFlash(deleteCollaborationServices(collaboration.id, service.id),
            I18n.t("collaborationServices.flash.deleted", {
                service: service.name,
                name: collaboration.name
            }));
        this.confirm(action, I18n.t("models.services.confirmations.remove", {
            service: service.name,
            name: collaboration.name
        }), true);
    };

    linkService = (service, collaboration) => {
        const action = () => this.refreshAndFlash(addCollaborationServices(collaboration.id, service.id),
            I18n.t("collaborationServices.flash.added", {
                service: service.name,
                name: collaboration.name
            }));
        this.setState({selectedService: service});
        this.confirm(action, I18n.t("models.services.confirmations.add", {
                service: service.name,
                name: collaboration.name
            }), false, !isEmpty(service.accepted_user_policy),
            !isEmpty(service.accepted_user_policy));
    };

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({
            loading: true,
            confirmationDialogOpen: false,
            confirmationChildren: false,
            confirmedAupConnectionRequest: false,
            disabledConfirm: false
        })
        promise.then(() => {
            this.props.refresh(() => {
                this.componentDidMount();
                setFlash(flashMsg);
                callback && callback();
            });
        });
    }

    serviceConnectionRequest = () => {
        const {requestConnectionService, message} = this.state;
        const {collaboration} = this.props;
        this.refreshAndFlash(requestServiceConnection({
            message: message,
            service_id: requestConnectionService.id,
            collaboration_id: collaboration.id
        }), I18n.t("collaborationServices.flash.send", {
            service: requestConnectionService.name
        }), this.cancelRequestConnectionService);
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    getSelectedServiceConnectionRequest = () => {
        const {selectedServiceConnectionRequestId} = this.state;
        const {collaboration} = this.props;
        return collaboration.service_connection_requests.find(r => r.id === selectedServiceConnectionRequestId);
    }

    approveServiceConnectionRequest = () => {
        const serviceConnectionRequest = this.getSelectedServiceConnectionRequest();
        this.confirm(() => {
            this.refreshAndFlash(approveServiceConnectionRequestByHash(serviceConnectionRequest.hash),
                I18n.t("serviceConnectionRequest.flash.accepted", {
                    name: serviceConnectionRequest.service.name
                }), () => this.componentDidMount())
        }, I18n.t("serviceConnectionRequest.approveConfirmation"), false);

    };

    denyServiceConnectionRequest = () => {
        const serviceConnectionRequest = this.getSelectedServiceConnectionRequest();
        this.confirm(() => {
            this.refreshAndFlash(denyServiceConnectionRequestByHash(serviceConnectionRequest.hash),
                I18n.t("serviceConnectionRequest.flash.declined", {
                    name: serviceConnectionRequest.service.name
                }), () => this.componentDidMount())
        }, I18n.t("serviceConnectionRequest.declineConfirmation"), true);
    };

    removeServiceConnectionRequest = (service, collaboration) => {
        const action = () => this.refreshAndFlash(deleteServiceConnectionRequest(service.id),
            I18n.t("collaborationServices.serviceConnectionRequestDeleted", {
                service: service.name,
                collaboration: collaboration.name
            }), this.closeConfirmationDialog);
        this.confirm(action, I18n.t("collaborationServices.serviceConnectionRequestDeleteConfirmation"), true);
    };

    resendServiceConnectionRequest = (service, collaboration) => {
        const action = () => this.refreshAndFlash(resendServiceConnectionRequests(service.id),
            I18n.t("collaborationServices.serviceConnectionRequestResend", {
                service: service.name,
                collaboration: collaboration.name
            }), this.closeConfirmationDialog);
        this.confirm(action, I18n.t("collaborationServices.serviceConnectionRequestResendConfirmation"), false);
    };

    openServiceConnectionRequest = serviceConnectionRequest => e => {
        stopEvent(e);
        this.setState({selectedServiceConnectionRequestId: serviceConnectionRequest.id});
    };

    confirm = (action, question, warning = false, confirmationChildren = false, disabledConfirm = false) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action,
            confirmationChildren: confirmationChildren,
            warning: warning,
            disabledConfirm: disabledConfirm
        });
    };

    renderServiceConnectionRequest = serviceConnectionRequest => {
        const {
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationDialogQuestion,
            warning
        } = this.state;
        const {collaboration} = this.props;
        return (
            <div className="request-connection-service">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={warning}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <div>
                    <a href="/services" className={"back-to-services"} onClick={this.cancelRequestConnectionService}>
                        <ChevronLeft/>{I18n.t("models.services.backToServices")}
                    </a>
                </div>
                <div className={"request-connection-service-form"}>
                    <h3>{I18n.t("models.serviceConnectionRequests.details",
                        {
                            date: moment(serviceConnectionRequest.created_at * 1000).format("LL"),
                            name: serviceConnectionRequest.requester.name || serviceConnectionRequest.requester.uid,
                            collaborationName: collaboration.name
                        })}</h3>
                    <Logo src={serviceConnectionRequest.service.logo}/>
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

    serviceAllowedToConnect = (service, collaboration) => {
        return service.automatic_connection_allowed ||
            (service.automatic_connection_allowed_organisations.filter(org => org.id === collaboration.organisation.id).length > 0 &&
            !service.access_allowed_for_all);
    }

    getServiceAction = service => {
        const {collaboration} = this.props;
        if (service.usedService && !service.connectionRequest &&
            collaboration.organisation.services.some(s => s.id === service.id)) {
            return null;
        }
        if (service.connectionRequest && service.isMemberRequest) {
            return <Button cancelButton={true}
                           onClick={this.openServiceConnectionRequest(service)}
                           txt={I18n.t("forms.open")}/>
        }
        if (service.usedService && service.connectionRequest) {
            return <div className="actions">
                <Button cancelButton={true}
                        centralize={true}
                        onClick={() => this.resendServiceConnectionRequest(service, collaboration)}
                        txt={I18n.t("models.services.resendConnectionRequest")}/>
                <Button cancelButton={true}
                        centralize={true}
                        onClick={() => this.removeServiceConnectionRequest(service, collaboration)}
                        txt={I18n.t("models.services.deleteConnectionRequest")}/>
            </div>
        }
        if (service.usedService && !service.connectionRequest) {
            return <Button cancelButton={true}
                           centralize={true}
                           onClick={() => this.unlinkService(service, collaboration)}
                           txt={I18n.t("models.services.removeFromCO")}/>
        }
        const allowedToConnect = this.serviceAllowedToConnect(service, collaboration);

        if (!service.usedService && allowedToConnect) {
            return <Button cancelButton={true}
                           centralize={true}
                           onClick={() => this.linkService(service, collaboration)}
                           txt={I18n.t("models.services.addToCO")}/>;
        }
        if (!service.usedService && !allowedToConnect) {
            return <Button cancelButton={true}
                           centralize={true}
                           onClick={() => this.setState({requestConnectionService: service})}
                           txt={I18n.t("models.services.requestConnection")}/>;
        }
        throw new Error("Invalid code - should not be reached");
    }

    cancelRequestConnectionService = e => {
        stopEvent(e);
        this.setState({
            requestConnectionService: null,
            selectedServiceConnectionRequestId: null,
            message: "",
            confirmedAupConnectionRequest: false,
        });
    }

    renderRequestConnectionService = (requestConnectionService, message, confirmedAupConnectionRequest) => {
        const needToAcceptUserPolicy = !isEmpty(requestConnectionService.accepted_user_policy);
        return (
            <div className="request-connection-service">
                <div>
                    <a href="/services" className={"back-to-services"} onClick={this.cancelRequestConnectionService}>
                        <ChevronLeft/>{I18n.t("models.services.backToServices")}
                    </a>
                </div>
                <div className={"request-connection-service-form"}>
                    <h2>{I18n.t("models.services.connectionRequest", {name: requestConnectionService.name})}</h2>
                    <Logo src={requestConnectionService.logo}/>
                    <InputField value={message}
                                name={I18n.t("collaborationServices.motivation")}
                                placeholder={I18n.t("collaborationServices.motivationPlaceholder")}
                                multiline={true}
                                large={true}
                                onChange={e => this.setState({message: e.target.value})}/>
                    {needToAcceptUserPolicy && <CheckBox name="disabledConfirm"
                                                         value={confirmedAupConnectionRequest}
                                                         onChange={() => this.setState({confirmedAupConnectionRequest: !this.state.confirmedAupConnectionRequest})}
                                                         info={I18n.t("models.services.confirmations.check", {
                                                             aup: requestConnectionService.accepted_user_policy,
                                                             name: requestConnectionService.name
                                                         })}/>}
                    <section className="actions">
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")}
                                onClick={this.cancelRequestConnectionService}/>
                        <Button
                            disabled={isEmpty(message) || (!confirmedAupConnectionRequest && needToAcceptUserPolicy)}
                            txt={I18n.t("collaborationServices.send")}
                            onClick={this.serviceConnectionRequest}/>
                    </section>
                </div>
            </div>);
    }

    renderConfirmationChildren = (service, disabledConfirm) => {
        return <div className="service-confirmation">
            <CheckBox name="disabledConfirm"
                      value={!disabledConfirm}
                      onChange={() => this.setState({disabledConfirm: !this.state.disabledConfirm})}
                      info={I18n.t("models.services.confirmations.check", {
                          aup: service.accepted_user_policy,
                          name: service.name
                      })}/>
        </div>
    }

    render() {
        const {
            services, loading, requestConnectionService, message, confirmationChildren, disabledConfirm, warning,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationDialogQuestion,
            selectedService, confirmedAupConnectionRequest
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        if (requestConnectionService) {
            return this.renderRequestConnectionService(requestConnectionService, message, confirmedAupConnectionRequest);
        }
        const selectedServiceConnectionRequest = this.getSelectedServiceConnectionRequest();
        if (selectedServiceConnectionRequest) {
            return this.renderServiceConnectionRequest(selectedServiceConnectionRequest);
        }

        const {collaboration} = this.props;
        let usedServices = collaboration.services.concat(collaboration.organisation.services);
        usedServices = removeDuplicates(usedServices, "id");
        const serviceConnectionRequests = collaboration.service_connection_requests.filter(r => !r.is_member_request);
        serviceConnectionRequests.forEach(req => {
            req.connectionRequest = true;
            req.isMemberRequest = false;
            req.name = req.service.name;
        });
        usedServices = usedServices.concat(serviceConnectionRequests);
        usedServices.forEach(s => s.usedService = true);

        const requestedServices = collaboration.service_connection_requests
            .filter(r => r.is_member_request)
            .map(req => {
                req.connectionRequest = true;
                req.isMemberRequest = true;
                req.name = req.service.name;
                req.logo = req.service.logo;
                return req;
            });

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: entity => <Logo
                    src={entity.logo ? entity.logo : entity.connectionRequest ? entity.service.logo : null}/>
            },
            {
                key: "name",
                header: I18n.t("models.services.name"),
                mapper: this.getServiceLink,
            },
            {
                nonSortable: true,
                key: "status",
                header: "",//I18n.t("models.services.status"),
                mapper: this.getServiceStatus
            },
            {
                nonSortable: true,
                key: "action",
                header: "",
                mapper: this.getServiceAction
            }]
        const titleUsed = I18n.t("models.services.titleUsedColl", {count: usedServices.length});
        const titleRequested = I18n.t("models.services.titleRequestedColl", {count: requestedServices.length});
        const titleAvailable = I18n.t("models.services.titleAvailableColl", {count: services.length});
        return (
            <div>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={warning}
                                    disabledConfirm={disabledConfirm}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}
                                    children={confirmationChildren ?
                                        this.renderConfirmationChildren(selectedService, disabledConfirm) : null}/>
                <Entities entities={usedServices}
                          className="first"
                          modelName="servicesUsed"
                          searchAttributes={["name"]}
                          defaultSort="name"
                          columns={columns}
                          loading={loading}
                          title={titleUsed}
                          {...this.props}/>
                {!isEmpty(requestedServices) && <Entities entities={requestedServices}
                                                          modelName="servicesRequested"
                                                          searchAttributes={["name"]}
                                                          defaultSort="name"
                                                          columns={columns}
                                                          loading={loading}
                                                          title={titleRequested}
                                                          {...this.props}/>}
                <Entities entities={services}
                          modelName="servicesAvailable"
                          searchAttributes={["name"]}
                          defaultSort="name"
                          columns={columns}
                          loading={loading}
                          title={titleAvailable}
                          {...this.props}/>
                <MissingServices nbrServices={usedServices.length + services.length}/>
            </div>
        )
    }
}

export default UsedServices;
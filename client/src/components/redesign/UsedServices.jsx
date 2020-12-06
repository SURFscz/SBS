import React from "react";
import {
    addCollaborationServices,
    allServices,
    deleteCollaborationServices,
    deleteServiceConnectionRequest,
    requestServiceConnection
} from "../../api";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";

import "./UsedServices.scss";
import {isEmpty, removeDuplicates, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Button from "../Button";
import {setFlash} from "../../utils/Flash";
import InputField from "../InputField";
import SpinnerField from "./SpinnerField";
import ConfirmationDialog from "../ConfirmationDialog";
import ServicesExplanation from "../explanations/Services";
import Logo from "./Logo";
import CheckBox from "../CheckBox";

class UsedServices extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: [],
            requestConnectionService: null,
            message: "",
            loading: true,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            disabledConfirm: false,
            confirmationChildren: false,
            selectedService: null,
            warning: false
        }
    }

    componentDidMount = () => {
        const {collaboration} = this.props;
        allServices().then(json => {
            const services = json;
            const servicesInUse = collaboration.services
                .concat(collaboration.organisation.services)
                .concat(collaboration.service_connection_requests.map(r => r.service))
                .map(e => e.id);

            const filteredServices = services
                .filter(service => {
                    return service.allowed_organisations.some(org => org.id === collaboration.organisation_id) &&
                        servicesInUse.indexOf(service.id) === -1;
                });
            this.setState({services: filteredServices, loading: false});
        });
    }

    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    getServiceLink = entity => {
        const ref = entity.connectionRequest ? entity.service : entity;
        return <a href="/" onClick={this.openService(ref)}>{ref.name}</a>
    }

    getServiceStatus = service => {
        const {collaboration} = this.props;
        if (service.usedService && !service.connectionRequest &&
            collaboration.organisation.services.some(s => s.id === service.id)) {
            service.status = I18n.t("models.services.requiredByOrganisation");
        } else if (service.usedService) {
            service.status = service.connectionRequest ? I18n.t("models.services.awaitingApproval") : ""
        } else {
            service.status = service.automatic_connection_allowed ? I18n.t("models.services.automaticConnectionAllowed") : "";
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

    removeServiceConnectionRequest = (service, collaboration) => {
        const action = () => this.refreshAndFlash(deleteServiceConnectionRequest(service.id),
            I18n.t("collaborationServices.serviceConnectionRequestDeleted", {
                service: service.name,
                collaboration: collaboration.name
            }), this.closeConfirmationDialog);
        this.confirm(action, I18n.t("collaborationServices.serviceConnectionRequestDeleteConfirmation"), true);
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


    getServiceAction = service => {
        const {collaboration} = this.props;
        if (service.usedService && !service.connectionRequest &&
            collaboration.organisation.services.some(s => s.id === service.id)) {
            return null;
        }
        if (service.usedService && service.connectionRequest) {
            return <Button className={"white"}
                           onClick={() => this.removeServiceConnectionRequest(service, collaboration)}
                           txt={I18n.t("models.services.deleteConnectionRequest")}/>
        }
        if (service.usedService && !service.connectionRequest) {
            return <Button className={"white"}
                           onClick={() => this.unlinkService(service, collaboration)}
                           txt={I18n.t("models.services.removeFromCO")}/>

        }
        if (!service.usedService && service.automatic_connection_allowed) {
            return <Button className={"white"}
                           onClick={() => this.linkService(service, collaboration)}
                           txt={I18n.t("models.services.addToCO")}/>;
        }
        if (!service.usedService && !service.automatic_connection_allowed) {
            return <Button className={"white"}
                           onClick={() => this.setState({requestConnectionService: service})}
                           txt={I18n.t("models.services.requestConnection")}/>;

        }
        throw new Error("Invalid code - should not be reached");
    }

    cancelRequestConnectionService = e => {
        stopEvent(e);
        this.setState({requestConnectionService: null, message: ""});
    }

    renderRequestConnectionService = (requestConnectionService, message) => {
        return (
            <div className="request-connection-service">
                <a href="/services" className={"back-to-services"} onClick={this.cancelRequestConnectionService}>
                    <ChevronLeft/>{I18n.t("models.services.backToServices")}
                </a>
                <div className={"request-connection-service-form"}>
                    <h1>{I18n.t("models.services.connectionRequest", {name: requestConnectionService.name})}</h1>
                    <Logo src={`data:image/jpeg;base64,${requestConnectionService.logo}`}/>
                    <InputField value={message}
                                name={I18n.t("collaborationServices.motivation")}
                                placeholder={I18n.t("collaborationServices.motivationPlaceholder")}
                                multiline={true}
                                large={true}
                                onChange={e => this.setState({message: e.target.value})}/>
                    <section className="actions">
                        <Button className="white" txt={I18n.t("forms.cancel")}
                                onClick={this.cancelRequestConnectionService}/>
                        <Button disabled={isEmpty(message)} txt={I18n.t("collaborationServices.send")}
                                onClick={this.serviceConnectionRequest}/>
                    </section>

                </div>
            </div>);
    }

    renderConfirmationChildren = (service, disabledConfirm) => {
        return <div className="service-confirmation">
            <CheckBox name="disabledConfirm" value={!disabledConfirm}
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
            selectedService
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        if (requestConnectionService) {
            return this.renderRequestConnectionService(requestConnectionService, message);
        }
        const {collaboration} = this.props;
        let usedServices = collaboration.services.concat(collaboration.organisation.services);
        usedServices = removeDuplicates(usedServices, "id");
        const serviceConnectionRequests = collaboration.service_connection_requests;
        serviceConnectionRequests.forEach(req => {
            req.connectionRequest = true;
            req.name = req.service.name;
        });
        usedServices = usedServices.concat(serviceConnectionRequests);

        usedServices.forEach(s => s.usedService = true);
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
                          modelName="servicesUsed"
                          searchAttributes={["name"]}
                          defaultSort="name"
                          columns={columns}
                          loading={loading}
                          title={titleUsed}
                          explain={<ServicesExplanation/>}
                          explainTitle={I18n.t("explain.services")}
                          {...this.props}/>
                <Entities entities={services}
                          modelName="servicesAvailable"
                          searchAttributes={["name"]}
                          defaultSort="name"
                          columns={columns}
                          loading={loading} t
                          itle={titleAvailable}
                          {...this.props}/>
            </div>
        )
    }
}

export default UsedServices;
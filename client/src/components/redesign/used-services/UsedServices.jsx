import React from "react";
import {
    addCollaborationServices,
    deleteCollaborationServices,
    deleteServiceConnectionRequest,
    requestServiceConnection, usedServices
} from "../../../api";
import {ReactComponent as ChevronLeft} from "../../../icons/chevron-left.svg";
import {ReactComponent as SearchIcon} from "@surfnet/sds/icons/functional-icons/search.svg";
import {ReactComponent as NoServicesIcon} from "../../../icons/no_services.svg";
import "./UsedServices.scss";
import {isEmpty, stopEvent} from "../../../utils/Utils";
import I18n from "../../../locale/I18n";
import Button from "../../button/Button";
import {clearFlash, setFlash} from "../../../utils/Flash";
import InputField from "../../input-field/InputField";
import SpinnerField from "../spinner-field/SpinnerField";
import ConfirmationDialog from "../../confirmation-dialog/ConfirmationDialog";
import Logo from "../logo/Logo";
import CheckBox from "../../checkbox/CheckBox";
import moment from "moment";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../../../utils/SocketIO";
import ServiceCard from "../../service-card/ServiceCard";

const CONNECTIONS = "connections";

const AVAILABLE = "available";

class UsedServices extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: [],
            currentTab: null,
            requestConnectionService: null,
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
            socketSubscribed: false,
            query: ""
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
        const urlSearchParams = new URLSearchParams(window.location.search);
        usedServices()
            .then(json => {
                const services = json;
                const requestedServices = collaboration.service_connection_requests
                    .filter(r => r.status === "open")
                    .map(r => r.service);
                const servicesInUse = collaboration.services
                    .concat(requestedServices)
                    .map(e => e.id);
                const filteredServices = services
                    .filter(service => {
                        return (service.allowed_organisations.some(org => org.id === collaboration.organisation_id)
                                || service.access_allowed_for_all
                                || service.automatic_connection_allowed_organisations.some(org => org.id === collaboration.organisation_id))
                            && servicesInUse.indexOf(service.id) === -1
                            && !service.override_access_allowed_all_connections
                            && (service.allow_restricted_orgs || !collaboration.organisation.services_restricted);
                    });
                const {currentTab} = this.state;
                const newTab = currentTab || (urlSearchParams.has("add") ? AVAILABLE : CONNECTIONS);
                this.setState({services: filteredServices, currentTab: newTab, loading: false});
                setTimeout(() => this.input && this.input.focus(), 150);
                const {socketSubscribed} = this.state;
                if (!socketSubscribed) {
                    [`collaboration_${collaboration.id}`, "service", `organisation_${collaboration.organisation_id}`].forEach(topic => {
                        socket.then(s => s.on(topic, data => {
                            const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
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

    openService = (service, e) => {
        const ref = service.connectionRequest ? service.service : service;
        if (e.metaKey || e.ctrlKey) {
            window.open(`/services/${ref.id}`, '_blank');
        } else {
            clearFlash();
            this.props.history.push(`/services/${ref.id}`);
        }
    };

    getServiceStatus = service => {
        const {collaboration} = this.props;
        let status = null;
        if (service.connectionRequest) {
            status = I18n.t("models.services.statuses.pending");
        } else if (service.usedService) {
            status = service.connectionRequest ? I18n.t("models.services.statuses.active") : ""
        }
        return status;

    }

    getServiceMessage = service => {
        const {collaboration} = this.props;
        if (service.usedService && !service.connectionRequest) {
            return "";
        }
        if (service.connectionRequest) {
            return I18n.t("models.serviceConnectionRequests.details",
                {
                    date: moment(service.created_at * 1000).format("LL"),
                    name: service.requester.name || service.requester.uid,
                    collaborationName: collaboration.name
                })
        }
        if (service.usedService) {
            return service.connectionRequest ? I18n.t("models.services.awaitingApproval") : " "
        }
        const allowedToConnect = this.serviceAllowedToConnect(service, collaboration);
        return allowedToConnect ? I18n.t("models.services.automaticConnectionAllowed") : " ";
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
            }), false, !isEmpty(service.accepted_user_policy || isEmpty(service.privacy_policy)),
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

    serviceAllowedToConnect = (service, collaboration) => {
        const requiresApproval = collaboration.organisation.service_connection_requires_approval;
        return !requiresApproval && (service.automatic_connection_allowed ||
            service.automatic_connection_allowed_organisations.some(org => org.id === collaboration.organisation.id));
    }

    getServiceAction = (service, collaboration) => {
        if (service.connectionRequest) {
            return <Button cancelButton={true}
                           onClick={() => this.removeServiceConnectionRequest(service, collaboration)}
                           txt={I18n.t("serviceConnectionRequest.retract")}/>
        }
        if (service.usedService && service.connectionRequest) {
            return <div className="actions">
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
        const warnAboutPrivacyPolicy = isEmpty(requestConnectionService.privacy_policy);
        return (
            <div className={"used-services-mod"}>
                <div>
                    <a href="/services/Services" className={"back-to-services"}
                       onClick={this.cancelRequestConnectionService}>
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
                    {warnAboutPrivacyPolicy && <p className="no-privacy-policy">
                        {I18n.t("models.services.confirmations.noPolicy")}
                    </p>}
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
            </div>)
    }

    renderConfirmationChildren = (service, disabledConfirm) => {
        const warnAboutPrivacyPolicy = isEmpty(service.privacy_policy);
        const includeAup = !isEmpty(service.accepted_user_policy)
        return <div className="service-confirmation">
            {warnAboutPrivacyPolicy && <p className="no-privacy-policy">
                {I18n.t("models.services.confirmations.noPolicy")}
            </p>}
            {includeAup && <CheckBox name="disabledConfirm"
                                     value={!disabledConfirm}
                                     onChange={() => this.setState({disabledConfirm: !this.state.disabledConfirm})}
                                     info={I18n.t("models.services.confirmations.check", {
                                         aup: service.accepted_user_policy,
                                         name: service.name
                                     })}/>}
        </div>
    }

    gotoConnectService = e => {
        stopEvent(e);
        this.setState({currentTab: AVAILABLE});
    }

    queryChanged = e => {
        const query = e.target.value;
        this.setState({query: query});
    }

    renderSearch = query => {
        return (
            <div className={`search`}>
                <div className={"sds--text-field sds--text-field--has-icon"}>
                    <div className="sds--text-field--shape">
                        <div className="sds--text-field--input-and-icon">
                            <input className={"sds--text-field--input"}
                                   type="search"
                                   onChange={this.queryChanged}
                                   ref={ref => this.input = ref}
                                   value={query}
                                   placeholder={I18n.t(`models.services.searchPlaceHolder`)}/>
                            <span className="sds--text-field--icon">
                                    <SearchIcon/>
                                </span>
                        </div>
                    </div>
                </div>
            </div>

        );
    }

    renderConnectedServices = (user, usedServices, collaboration, hasServices) => {
        return (
            <div>
                {!hasServices &&
                    <div className="no-services">
                        <p className={"margin"}>{I18n.t("models.collaboration.noServices")}
                            <a href={"/#"}
                               onClick={this.gotoConnectService}>{I18n.t("models.collaboration.connectFirstService")}</a>
                        </p>
                        <NoServicesIcon/>
                    </div>}
                {usedServices.map(service =>
                    <ServiceCard service={service}
                                 key={service.id}
                                 nameLinkAction={e => this.openService(service, e)}
                                 status={this.getServiceStatus(service)}
                                 message={this.getServiceMessage(service)}
                                 ActionButton={this.getServiceAction(service, collaboration)}
                                 limitWidth={true}
                                 launchLink={true}
                                 user={user}
                                 showAboutInformation={true}
                    />)}
            </div>
        );
    }

    renderAvailableServices = (user, usedServices, collaboration) => {
        return (
            <div>
                {usedServices.map(service =>
                    <ServiceCard service={service}
                                 key={service.id}
                                 nameLinkAction={e => this.openService(service, e)}
                                 status={this.getServiceStatus(service)}
                                 message={this.getServiceStatus(service)}
                                 ActionButton={this.getServiceAction(service, collaboration)}
                                 limitWidth={true}
                                 launchLink={true}
                                 user={user}
                                 showAboutInformation={true}
                    />)}
            </div>
        );
    }

    changeTab = tab => e => {
        stopEvent(e);
        this.setState({
            currentTab: tab,
            selectedService: null,
            requestConnectionService: null,
            selectedServiceConnectionRequestId: null,
        });
        setTimeout(() => this.input && this.input.focus(), 150);
    }

    sortAndFilter = (services, query) => {
        const queryToLower = query.toLowerCase();
        return services
            .sort((s1, s2) => s1.name.localeCompare(s2.name))
            .filter(service => isEmpty(query) || service.name.toLowerCase().indexOf(queryToLower) > -1)
    }

    renderCurrentTab = (currentTab, usedServices, availableServices, query, user, collaboration) => {
        switch (currentTab) {
            case CONNECTIONS:
                return this.renderConnectedServices(user, this.sortAndFilter(usedServices, query), collaboration, usedServices.length > 0);
            case AVAILABLE:
                return this.renderAvailableServices(user, this.sortAndFilter(availableServices, query), collaboration);
            default:
                throw new Error(`unknown-tab: ${currentTab}`);
        }
    }


    sidebar = currentTab => {
        return (
            <div className={"side-bar"}>
                <h3>{I18n.t("services.title")}</h3>
                <ul>
                    <li>
                        <a href={`/connections`}
                           className={CONNECTIONS === currentTab ? "active" : ""}
                           onClick={this.changeTab(CONNECTIONS)}>
                            {I18n.t("services.toc.connections")}
                        </a>
                    </li>
                    <li>
                        <a href={`/available`}
                           className={AVAILABLE === currentTab ? "active" : ""}
                           onClick={this.changeTab(AVAILABLE)}>
                            {I18n.t("services.toc.available")}
                        </a>
                    </li>
                </ul>
            </div>
        );
    }

    render() {
        const {
            services, loading, requestConnectionService, message, confirmationChildren, disabledConfirm, warning,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationDialogQuestion,
            selectedService, confirmedAupConnectionRequest, currentTab, query
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        if (requestConnectionService) {
            return this.renderRequestConnectionService(requestConnectionService, message, confirmedAupConnectionRequest);
        }
        const {collaboration, user} = this.props;
        let usedServices = collaboration.services;
        const serviceConnectionRequests = collaboration.service_connection_requests.filter(r => r.status === "open");
        serviceConnectionRequests.forEach(req => {
            req.connectionRequest = true;
            req.name = req.service.name;
        });
        usedServices = usedServices.concat(serviceConnectionRequests);
        usedServices.forEach(s => s.usedService = true);
        return (
            <>
                <div className={"used-services-mod"}>
                    <ConfirmationDialog isOpen={confirmationDialogOpen}
                                        cancel={cancelDialogAction}
                                        isWarning={warning}
                                        disabledConfirm={disabledConfirm}
                                        confirm={confirmationDialogAction}
                                        question={confirmationDialogQuestion}
                                        children={confirmationChildren ?
                                            this.renderConfirmationChildren(selectedService, disabledConfirm) : null}/>
                    {this.sidebar(currentTab)}
                    <div className={"used-service-main"}>
                        <div className={"service-header"}>
                            <h2 className="section-separator">{I18n.t(`services.toc.${currentTab}`)}</h2>
                            {this.renderSearch(query)}
                        </div>

                        {this.renderCurrentTab(currentTab, usedServices, services, query, user, collaboration)}
                    </div>

                </div>
            </>
        )
    }
}

export default UsedServices;

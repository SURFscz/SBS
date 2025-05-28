import React from "react";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";

import "./ServiceConnectionRequests.scss";
import "./UserColumn.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Button from "../button/Button";
import {setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../confirmation-dialog/ConfirmationDialog";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";
import InputField from "../input-field/InputField";
import {approveServiceConnectionRequest, deleteServiceConnectionRequest, denyServiceConnectionRequest} from "../../api";
import moment from "moment";
import Logo from "./Logo";
import InstituteColumn from "./InstituteColumn";
import UserColumn from "./UserColumn";
import Select from "react-select";
import {Chip} from "@surfnet/sds";
import {chipTypeForStatus} from "../../utils/UserRole";

const allValue = "all";

class ServiceConnectionRequests extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedServiceConnectionRequestId: null,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({declineDialog: false, confirmationDialogOpen: false}),
            isWarning: false,
            declineDialog: false,
            loading: true,
            filterOptions: [],
            filterValue: {},
            rejectionReason: null
        }
    }

    componentDidMount = callback => {
        const {serviceConnectionRequests} = this.props;
        const filterOptions = [{
            label: I18n.t("collaborationRequest.statuses.all", {nbr: serviceConnectionRequests.length}),
            value: allValue
        }];
        const statusOptions = serviceConnectionRequests.reduce((acc, jr) => {
            const option = acc.find(opt => opt.status === jr.status);
            if (option) {
                ++option.nbr;
            } else {
                acc.push({status: jr.status, nbr: 1})
            }
            return acc;
        }, []).map(option => ({
            label: `${I18n.t("collaborationRequest.statuses." + option.status)} (${option.nbr})`,
            value: option.status
        })).sort((o1, o2) => o1.label.localeCompare(o2.label));

        this.setState({
            filterOptions: filterOptions.concat(statusOptions),
            filterValue: filterOptions[0],
            loading: false,
            declineDialog: false,
            selectedServiceConnectionRequestId: null
        }, callback);
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

    removeServiceConnectionRequest = () => {
        const {service} = this.props;
        const serviceConnectionRequest = this.getSelectedServiceConnectionRequest();
        const name = isEmpty(service) ? serviceConnectionRequest.service.name : service.name;
        this.confirm(() => {
            this.refreshAndFlash(deleteServiceConnectionRequest(serviceConnectionRequest.id),
                I18n.t("serviceConnectionRequest.flash.deleted", {
                    name: name
                }), () => this.componentDidMount())
        }, I18n.t("serviceConnectionRequest.deleteConfirmation"), false, false);

    };

    approveServiceConnectionRequest = () => {
        const {service} = this.props;
        const serviceConnectionRequest = this.getSelectedServiceConnectionRequest();
        const name = isEmpty(service) ? serviceConnectionRequest.service.name : service.name;
        this.confirm(() => {
            this.refreshAndFlash(approveServiceConnectionRequest(serviceConnectionRequest),
                I18n.t("serviceConnectionRequest.flash.accepted", {
                    name: name
                }), () => this.componentDidMount())
        }, I18n.t("serviceConnectionRequest.approveConfirmation"), false, false);
    };

    denyServiceConnectionRequest = () => {
        const {service} = this.props;
        const serviceConnectionRequest = this.getSelectedServiceConnectionRequest();
        const name = isEmpty(service) ? serviceConnectionRequest.service.name : service.name;
        this.confirm(() => {
            const {rejectionReason} = this.state;
            this.refreshAndFlash(denyServiceConnectionRequest(serviceConnectionRequest, rejectionReason),
                I18n.t("serviceConnectionRequest.flash.declined", {
                    name: name
                }), () => this.componentDidMount())
        }, I18n.t("serviceConnectionRequest.declineConfirmation"), true, true);
    };

    filter = (filterOptions, filterValue) => {
        return (
            <div className="service-connection-request-filter">
                <Select
                    className={"service-connection-request-filter-select"}
                    value={filterValue}
                    classNamePrefix={"filter-select"}
                    onChange={option => this.setState({filterValue: option})}
                    options={filterOptions}
                    isSearchable={false}
                    isClearable={false}
                />
            </div>
        );
    }

    getDeclineRejectionOptions = rejectionReason => {
        return (
            <div className="rejection-reason-container">
                <label htmlFor="rejection-reason">{I18n.t("joinRequest.rejectionReason")}</label>
                <InputField value={rejectionReason}
                            multiline={true}
                            onChange={e => this.setState({rejectionReason: e.target.value})}/>
                <span className="rejection-reason-disclaimer">{I18n.t("joinRequest.rejectionReasonNote")}</span>
            </div>
        );
    }

    confirm = (action, question, isWarning, declineDialog) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action,
            declineDialog: declineDialog,
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
            isWarning,
            rejectionReason,
            declineDialog
        } = this.state;
        const isOpen = serviceConnectionRequest.status === "open"
        const isDeclined = serviceConnectionRequest.status === "denied";

        return (
            <div className="service-connection-requests-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={isWarning}
                                    disabledConfirm={declineDialog && isEmpty(rejectionReason)}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}>
                    {declineDialog && this.getDeclineRejectionOptions(rejectionReason)}
                </ConfirmationDialog>
                <div>
                    <a className={"back-to-service-connection-requests"}
                       onClick={this.cancelSideScreen}
                       href={"/#cancel"}>
                        <ChevronLeft/>{I18n.t("models.serviceConnectionRequests.backToServiceConnectionRequests")}
                    </a>
                </div>
                <div className="service-connection-request-form">
                    <div className="service-connection-request-header">
                        <h2>{I18n.t(`models.serviceConnectionRequests.${isEmpty(service) ? "detailsWithService" : "details"}`,
                            {
                                date: moment(serviceConnectionRequest.created_at * 1000).format("LL"),
                                name: serviceConnectionRequest.requester.name || serviceConnectionRequest.requester.uid,
                                collaborationName: serviceConnectionRequest.collaboration.name,
                                serviceName: isEmpty(service) ? serviceConnectionRequest.service.name : ""
                            })}</h2>
                        {<Chip label={I18n.t(`collaborationRequest.statuses.${serviceConnectionRequest.status}`)}
                               type={chipTypeForStatus(serviceConnectionRequest)}/>}
                    </div>

                    <InputField name={I18n.t("serviceConnectionRequest.message")}
                                value={serviceConnectionRequest.message}
                                disabled={true}
                                multiline={true}
                                toolTip={I18n.t("serviceConnectionRequest.messageTooltip", {name: serviceConnectionRequest.requester.name})}/>

                    {isDeclined && <InputField name={I18n.t("joinRequest.rejectionReasonLabel")}
                                               value={serviceConnectionRequest.rejection_reason}
                                               disabled={true}
                                               multiline={true}/>}

                    <section className="actions">
                        {isOpen && <Button cancelButton={true} txt={I18n.t("serviceConnectionRequest.decline")}
                                           onClick={this.denyServiceConnectionRequest}/>}
                        {isOpen && <Button txt={I18n.t("serviceConnectionRequest.accept")}
                                           onClick={this.approveServiceConnectionRequest}/>}
                        {!isOpen && <Button warningButton={true}
                                            onClick={this.removeServiceConnectionRequest}/>}
                    </section>
                </div>
            </div>)

    }

    render() {
        const {loading, filterOptions, filterValue} = this.state;
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
                class: isEmpty(service) ? "" : "has-service",
                header: I18n.t("models.serviceConnectionRequests.name"),
                mapper: serviceConnectionRequest => serviceConnectionRequest.collaboration.name
            },
            isEmpty(service) ? {
                key: "service__name",
                header: I18n.t("models.serviceConnectionRequests.serviceName"),
                mapper: serviceConnectionRequest => serviceConnectionRequest.service.name
            } : null,
            {
                key: "requester__name",
                class: isEmpty(service) ? "" : "has-service",
                header: I18n.t("models.serviceConnectionRequests.requester"),
                mapper: serviceConnectionRequest => <UserColumn entity={{user: serviceConnectionRequest.requester}}
                                                                currentUser={currentUser}/>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: serviceConnectionRequest => <InstituteColumn entity={{user: serviceConnectionRequest.requester}}
                                                                     currentUser={currentUser}/>
            },
            {
                key: "status",
                header: I18n.t("collaborationRequest.status"),
                mapper: entity => <Chip type={chipTypeForStatus(entity)}
                                        label={I18n.t(`collaborationRequest.statuses.${entity.status}`)}/>
            }
        ].filter(tab => tab !== null);

        const filteredServiceConnectionRequests = filterValue.value === allValue ? serviceConnectionRequests :
            serviceConnectionRequests.filter(jr => jr.status === filterValue.value);
        return (
            <div>
                <Entities entities={filteredServiceConnectionRequests}
                          modelName="serviceConnectionRequests"
                          searchAttributes={["requester__name", "requester__email", "message", "status", "collaboration__name"]}
                          defaultSort="collaboration__name"
                          rowLinkMapper={() => this.openServiceConnectionRequest}
                          columns={columns}
                          filters={this.filter(filterOptions, filterValue)}
                          loading={loading}
                          {...this.props}/>
            </div>
        )
    }
}

export default ServiceConnectionRequests;

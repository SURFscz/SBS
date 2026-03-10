import React, {useCallback, useEffect, useState} from "react";
import {ReactComponent as ChevronLeft} from "../../../icons/chevron-left.svg";

import "./ServiceConnectionRequests.scss";
import "../user-column/UserColumn.scss";
import {isEmpty, stopEvent} from "../../../utils/Utils";
import I18n from "../../../locale/I18n";
import Button from "../../button/Button";
import {setFlash} from "../../../utils/Flash";
import ConfirmationDialog from "../../confirmation-dialog/ConfirmationDialog";
import Entities from "../entities/Entities";
import SpinnerField from "../spinner-field/SpinnerField";
import InputField from "../../input-field/InputField";
import {approveServiceConnectionRequest, deleteServiceConnectionRequest, denyServiceConnectionRequest} from "../../../api";
import moment from "moment";
import Logo from "../logo/Logo";
import InstituteColumn from "../institute-column/InstituteColumn";
import UserColumn from "../user-column/UserColumn";
import Select from "react-select";
import {Chip} from "@surfnet/sds";
import {chipTypeForStatus} from "../../../utils/UserRole";

const allValue = "all";

const ServiceConnectionRequests = ({service, serviceConnectionRequests, refresh, user: currentUser, ...rest}) => {

    const [selectedServiceConnectionRequestId, setSelectedServiceConnectionRequestId] = useState(null);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [confirmationDialogQuestion, setConfirmationDialogQuestion] = useState(undefined);
    const [confirmationDialogAction, setConfirmationDialogAction] = useState(() => () => true);
    const [isWarning, setIsWarning] = useState(false);
    const [declineDialog, setDeclineDialog] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filterOptions, setFilterOptions] = useState([]);
    const [filterValue, setFilterValue] = useState({});
    const [rejectionReason, setRejectionReason] = useState(null);

    const cancelDialogAction = () => {
        setDeclineDialog(false);
        setConfirmationDialogOpen(false);
    };

    const initializeFilters = useCallback((callback) => {
        const options = [{
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

        setFilterOptions(options.concat(statusOptions));
        setFilterValue(options[0]);
        setLoading(false);
        setDeclineDialog(false);
        setSelectedServiceConnectionRequestId(null);
        if (callback) {
            callback();
        }
    }, [serviceConnectionRequests]);

    useEffect(() => {
        initializeFilters();
    }, [initializeFilters]);

    const closeConfirmationDialog = () => setConfirmationDialogOpen(false);

    const confirm = (action, question, warning, decline) => {
        setConfirmationDialogOpen(true);
        setConfirmationDialogQuestion(question);
        setConfirmationDialogAction(() => action);
        setDeclineDialog(decline);
        setIsWarning(warning);
    };

    const refreshAndFlash = (promise, flashMsg, callback) => {
        closeConfirmationDialog();
        setLoading(true);
        promise.then(res => {
            refresh(() => {
                initializeFilters(() => callback && callback(res));
                setFlash(flashMsg);
            });
        });
    };

    const getSelectedServiceConnectionRequest = () =>
        serviceConnectionRequests.find(scr => scr.id === selectedServiceConnectionRequestId);

    const handleRemove = () => {
        const scr = serviceConnectionRequests.find(r => r.id === selectedServiceConnectionRequestId);
        const name = isEmpty(service) ? scr.service.name : service.name;
        confirm(() => {
            refreshAndFlash(deleteServiceConnectionRequest(scr.id),
                I18n.t("serviceConnectionRequest.flash.deleted", {name}),
                () => initializeFilters());
        }, I18n.t("serviceConnectionRequest.deleteConfirmation"), false, false);
    };

    const handleApprove = () => {
        const scr = serviceConnectionRequests.find(r => r.id === selectedServiceConnectionRequestId);
        const name = isEmpty(service) ? scr.service.name : service.name;
        confirm(() => {
            refreshAndFlash(approveServiceConnectionRequest(scr),
                I18n.t("serviceConnectionRequest.flash.accepted", {name}),
                () => initializeFilters());
        }, I18n.t("serviceConnectionRequest.approveConfirmation"), false, false);
    };

    const handleDeny = () => {
        const scr = serviceConnectionRequests.find(r => r.id === selectedServiceConnectionRequestId);
        const name = isEmpty(service) ? scr.service.name : service.name;
        confirm(() => {
            refreshAndFlash(denyServiceConnectionRequest(scr, rejectionReason),
                I18n.t("serviceConnectionRequest.flash.declined", {name}),
                () => initializeFilters());
        }, I18n.t("serviceConnectionRequest.declineConfirmation"), true, true);
    };

    const cancelSideScreen = (e) => {
        stopEvent(e);
        setSelectedServiceConnectionRequestId(null);
    };

    const openServiceConnectionRequest = (serviceConnectionRequest) => (e) => {
        stopEvent(e);
        setSelectedServiceConnectionRequestId(serviceConnectionRequest.id);
    };

    const renderFilter = (
        <div className="service-connection-request-filter">
            <Select
                className={"service-connection-request-filter-select"}
                value={filterValue}
                classNamePrefix={"filter-select"}
                onChange={option => setFilterValue(option)}
                options={filterOptions}
                isSearchable={false}
                isClearable={false}
            />
        </div>
    );

    const renderDeclineRejectionOptions = (reason) => (
        <div className="rejection-reason-container">
            <label htmlFor="rejection-reason">{I18n.t("joinRequest.rejectionReason")}</label>
            <InputField value={reason}
                        multiline={true}
                        onChange={e => setRejectionReason(e.target.value)}/>
            <span className="rejection-reason-disclaimer">{I18n.t("joinRequest.rejectionReasonNote")}</span>
        </div>
    );

    const renderServiceConnectionRequest = (svc, serviceConnectionRequest) => {
        const isOpen = serviceConnectionRequest.status === "open";
        const isDeclined = serviceConnectionRequest.status === "denied";

        return (
            <div className="service-connection-requests-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={isWarning}
                                    disabledConfirm={declineDialog && isEmpty(rejectionReason)}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}>
                    {declineDialog && renderDeclineRejectionOptions(rejectionReason)}
                </ConfirmationDialog>
                <div>
                    <a className={"back-to-service-connection-requests"}
                       onClick={cancelSideScreen}
                       href={"/#cancel"}>
                        <ChevronLeft/>{I18n.t("models.serviceConnectionRequests.backToServiceConnectionRequests")}
                    </a>
                </div>
                <div className="service-connection-request-form">
                    <div className="service-connection-request-header">
                        <h2>{I18n.t(`models.serviceConnectionRequests.${isEmpty(svc) ? "detailsWithService" : "details"}`,
                            {
                                date: moment(serviceConnectionRequest.created_at * 1000).format("LL"),
                                name: serviceConnectionRequest.requester.name || serviceConnectionRequest.requester.uid,
                                collaborationName: serviceConnectionRequest.collaboration.name,
                                serviceName: isEmpty(svc) ? serviceConnectionRequest.service.name : ""
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
                        {isOpen && <>
                                <Button cancelButton={true} txt={I18n.t("serviceConnectionRequest.decline")} onClick={handleDeny}/>
                                <Button txt={I18n.t("serviceConnectionRequest.accept")} onClick={handleApprove}/>
                        </>}
                        {!isOpen && <Button warningButton={true} onClick={handleRemove}/>}
                    </section>
                </div>
            </div>)
    };

    if (loading) {
        return <SpinnerField/>;
    }

    const selectedServiceConnectionRequest = getSelectedServiceConnectionRequest();
    if (selectedServiceConnectionRequest) {
        return renderServiceConnectionRequest(service, selectedServiceConnectionRequest);
    }

    const columns = [
        {
            nonSortable: true,
            key: "logo",
            header: "",
            mapper: scr => <Logo src={scr.collaboration.logo}/>
        },
        {
            key: "collaboration__name",
            class: isEmpty(service) ? "" : "has-service",
            header: I18n.t("models.serviceConnectionRequests.name"),
            mapper: scr => scr.collaboration.name
        },
        isEmpty(service) ? {
            key: "service__name",
            header: I18n.t("models.serviceConnectionRequests.serviceName"),
            mapper: scr => scr.service.name
        } : null,
        {
            key: "requester__name",
            class: isEmpty(service) ? "" : "has-service",
            header: I18n.t("models.serviceConnectionRequests.requester"),
            mapper: scr => <UserColumn entity={{user: scr.requester}} currentUser={currentUser}/>
        },
        {
            key: "user__schac_home_organisation",
            header: I18n.t("models.users.institute"),
            mapper: scr => <InstituteColumn entity={{user: scr.requester}} currentUser={currentUser}/>
        },
        {
            key: "status",
            header: I18n.t("collaborationRequest.status"),
            mapper: entity => <Chip type={chipTypeForStatus(entity)}
                                    label={I18n.t(`collaborationRequest.statuses.${entity.status}`)}/>
        }
    ].filter(tab => tab !== null);

    const filteredServiceConnectionRequests = filterValue.value === allValue
        ? serviceConnectionRequests
        : serviceConnectionRequests.filter(jr => jr.status === filterValue.value);

    return (
        <div>
            <Entities entities={filteredServiceConnectionRequests}
                      modelName="serviceConnectionRequests"
                      searchAttributes={["requester__name", "requester__email", "message", "status", "collaboration__name"]}
                      defaultSort="collaboration__name"
                      rowLinkMapper={() => openServiceConnectionRequest}
                      columns={columns}
                      filters={renderFilter}
                      loading={loading}
                      {...rest}/>
        </div>
    );
};

export default ServiceConnectionRequests;

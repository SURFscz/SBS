import React, {useCallback, useEffect, useState} from "react";
import {ReactComponent as ChevronLeft} from "../../../icons/chevron-left.svg";

import "./JoinRequests.scss";
import {isEmpty, stopEvent} from "../../../utils/Utils";
import I18n from "../../../locale/I18n";
import Button from "../../button/Button";
import {setFlash} from "../../../utils/Flash";
import ConfirmationDialog from "../../confirmation-dialog/ConfirmationDialog";
import Entities from "../entities/Entities";
import SpinnerField from "../spinner-field/SpinnerField";
import InputField from "../../input-field/InputField";
import {joinRequestAccept, joinRequestDecline, joinRequestDelete} from "../../../api";
import UserColumn from "../user-column/UserColumn";
import moment from "moment";
import {ReactComponent as MembersIcon} from "../../../icons/single-neutral.svg";
import {Chip, Tooltip} from "@surfnet/sds";
import Select from "react-select";
import InstituteColumn from "../institute-column/InstituteColumn";
import {chipTypeForStatus} from "../../../utils/UserRole";
import {useQueryParameter} from "../../../hooks/useQueryParameter";

const allValue = "all";

export const JoinRequests = ({collaboration, refresh, user: currentUser, ...rest}) => {

    const [queryFilterValue, setQueryFilterValue] = useQueryParameter('filterValue');

    const [selectedJoinRequestId, setSelectedJoinRequestId] = useState(null);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [confirmationDialogQuestion, setConfirmationDialogQuestion] = useState(undefined);
    const [confirmationDialogAction, setConfirmationDialogAction] = useState(() => () => true);
    const [declineDialog, setDeclineDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [loading, setLoading] = useState(true);
    const [filterOptions, setFilterOptions] = useState([]);
    const [filterValue, setFilterValue] = useState({});

    const cancelDialogAction = () => {
        setConfirmationDialogOpen(false);
        setDeclineDialog(false);
        setRejectionReason("");
    };

    const initializeFilters = useCallback(() => {
        const {join_requests} = collaboration;
        const baseOptions = [{
            label: I18n.t("collaborationRequest.statuses.all", {nbr: join_requests.length}),
            value: allValue
        }];
        const statusOptions = join_requests.reduce((acc, jr) => {
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

        const allOptions = baseOptions.concat(statusOptions);
        setFilterOptions(allOptions);
        setFilterValue(allOptions.find(o => o.value === queryFilterValue) || baseOptions[0]);
        setLoading(false);
        setSelectedJoinRequestId(null);
        setDeclineDialog(false);
        setRejectionReason("");
    }, [collaboration]);

    useEffect(() => {
        initializeFilters();
    }, [initializeFilters]);

    const closeConfirmationDialog = () => setConfirmationDialogOpen(false);

    const refreshAndFlash = (promise, flashMsg, callback) => {
        closeConfirmationDialog();
        setLoading(true);
        promise.then(res => {
            refresh(() => {
                setFlash(flashMsg);
                callback && callback(res);
            });
        });
    };

    const getSelectedJoinRequest = () =>
        collaboration.join_requests.find(jr => jr.id === selectedJoinRequestId);

    const acceptJoinRequest = () => {
        const joinRequest = getSelectedJoinRequest();
        refreshAndFlash(joinRequestAccept(joinRequest),
            I18n.t("joinRequest.flash.accepted", {name: collaboration.name}));
    };

    const deleteJoinRequest = () => {
        const joinRequest = getSelectedJoinRequest();
        refreshAndFlash(joinRequestDelete(joinRequest),
            I18n.t("joinRequest.flash.deleted", {name: collaboration.name}));
    };

    const declineJoinRequest = () => {
        const joinRequest = getSelectedJoinRequest();
        refreshAndFlash(joinRequestDecline(joinRequest, rejectionReason),
            I18n.t("joinRequest.flash.declined", {name: collaboration.name}));
    };

    const confirm = (action, question, isDecline) => {
        setConfirmationDialogOpen(true);
        setConfirmationDialogQuestion(question);
        setConfirmationDialogAction(() => action);
        setDeclineDialog(isDecline);
    };

    const cancelSideScreen = e => {
        stopEvent(e);
        setSelectedJoinRequestId(null);
    };

    const openJoinRequest = joinRequest => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        setSelectedJoinRequestId(joinRequest.id);
    };

    const renderFilter = (
        <div className="join-request-filter">
            <Select
                className={"join-request-filter-select"}
                value={filterValue}
                classNamePrefix={"filter-select"}
                onChange={option => {
                    setQueryFilterValue(option.value);
                    setFilterValue(option);
                }}
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

    const renderJoinRequestForm = (joinRequest) => {
        const isOpen = joinRequest.status === "open";
        const isDeclined = joinRequest.status === "denied";
        return (
            <div className="join-request-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={true}
                                    confirm={confirmationDialogAction}
                                    disabledConfirm={declineDialog && isEmpty(rejectionReason)}
                                    question={confirmationDialogQuestion}>
                    {declineDialog && renderDeclineRejectionOptions(rejectionReason)}
                </ConfirmationDialog>
                <div>
                    <a className={"back-to-join-requests"} onClick={cancelSideScreen} href={"/cancel"}>
                        <ChevronLeft/>{I18n.t("models.joinRequests.backToJoinRequests")}
                    </a>
                </div>
                <div className="join-request-form">
                    <div className="join-request-header">
                        <h2>{I18n.t("models.joinRequests.details",
                            {
                                date: moment(joinRequest.created_at * 1000).format("LL"),
                                name: joinRequest.user.name
                            })}</h2>
                        {<Chip label={I18n.t(`collaborationRequest.statuses.${joinRequest.status}`)}
                               type={chipTypeForStatus(joinRequest)}/>}
                    </div>
                    <InputField name={I18n.t("joinRequest.message")} value={joinRequest.message}
                                disabled={true}
                                multiline={true}
                                toolTip={I18n.t("joinRequest.messageTooltip", {name: joinRequest.user.name})}/>

                    {isDeclined && <InputField name={I18n.t("joinRequest.rejectionReasonLabel")}
                                               value={joinRequest.rejection_reason}
                                               disabled={true}
                                               multiline={true}/>}

                    <section className="actions">
                        {isOpen && <Button cancelButton={true} txt={I18n.t("joinRequest.decline")}
                                           onClick={() => confirm(
                                               declineJoinRequest,
                                               I18n.t("joinRequest.declineConfirmation"),
                                               true
                                           )}/>}
                        {isOpen && <Button txt={I18n.t("joinRequest.accept")}
                                           onClick={acceptJoinRequest}/>}
                        {!isOpen && <Button warningButton={true}
                                            onClick={() => confirm(
                                                deleteJoinRequest,
                                                I18n.t("joinRequest.deleteConfirmation"),
                                                false)}/>}
                    </section>
                </div>
            </div>);
    };

    if (loading) {
        return <SpinnerField/>;
    }

    const selectedJoinRequest = getSelectedJoinRequest();
    if (selectedJoinRequest) {
        return renderJoinRequestForm(selectedJoinRequest);
    }

    const columns = [
        {
            nonSortable: true,
            key: "icon",
            header: "",
            mapper: () => <div className="member-icon">
                <Tooltip standalone={true} children={<MembersIcon/>} tip={I18n.t("tooltips.joinRequest")}/>
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
            mapper: entity => <InstituteColumn entity={entity} currentUser={currentUser}/>
        },
        {
            key: "status",
            header: I18n.t("collaborationRequest.status"),
            mapper: entity => <Chip type={chipTypeForStatus(entity)}
                                    label={I18n.t(`collaborationRequest.statuses.${entity.status}`)}/>
        },
    ];

    const filteredJoinRequests = filterValue.value === allValue ? collaboration.join_requests :
        collaboration.join_requests.filter(jr => jr.status === filterValue.value);

    return (
        <div>
            <Entities entities={filteredJoinRequests}
                      modelName="joinRequests"
                      searchAttributes={["user__name", "user__email", "message", "status", "reference"]}
                      defaultSort="name"
                      rowLinkMapper={() => openJoinRequest}
                      inputFocus={true}
                      columns={columns}
                      filters={renderFilter}
                      loading={loading}
                      {...rest}/>
        </div>
    );
};

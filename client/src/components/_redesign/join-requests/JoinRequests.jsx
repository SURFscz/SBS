import React from "react";
import {ReactComponent as ChevronLeft} from "../../../icons/chevron-left.svg";

import "./JoinRequests.scss";
import {isEmpty, stopEvent} from "../../../utils/Utils";
import I18n from "../../../locale/I18n";
import Button from "../../button/Button";
import {setFlash} from "../../../utils/Flash";
import ConfirmationDialog from "../../confirmation-dialog/ConfirmationDialog";
import Entities from "../entities/Entities";
import SpinnerField from "../SpinnerField";
import InputField from "../../input-field/InputField";
import {joinRequestAccept, joinRequestDecline, joinRequestDelete} from "../../../api";
import UserColumn from "../UserColumn";
import moment from "moment";
import {ReactComponent as MembersIcon} from "../../../icons/single-neutral.svg";
import {Chip, Tooltip} from "@surfnet/sds";
import Select from "react-select";
import InstituteColumn from "../institute-column/InstituteColumn";
import {chipTypeForStatus} from "../../../utils/UserRole";

const allValue = "all";

class JoinRequests extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedJoinRequestId: null,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({
                confirmationDialogOpen: false,
                declineDialog: false,
                rejectionReason: ""
            }),
            declineDialog: false,
            rejectionReason: "",
            loading: true,
            filterOptions: [],
            filterValue: {},

        }
    }

    componentDidMount = callback => {
        const {join_requests} = this.props.collaboration;
        const filterOptions = [{
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

        this.setState({
            filterOptions: filterOptions.concat(statusOptions),
            filterValue: filterOptions[0],
            loading: false,
            selectedJoinRequestId: null,
            declineDialog: false,
            rejectionReason: "",
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

    deleteJoinRequest = () => {
        const {collaboration} = this.props;
        const joinRequest = this.getSelectedJoinRequest();
        this.refreshAndFlash(joinRequestDelete(joinRequest),
            I18n.t("joinRequest.flash.deleted", {
                name: collaboration.name
            }), () => this.componentDidMount());
    };

    declineJoinRequest = () => {
        const {collaboration} = this.props;
        const {rejectionReason} = this.state;
        const joinRequest = this.getSelectedJoinRequest();
        this.refreshAndFlash(joinRequestDecline(joinRequest, rejectionReason),
            I18n.t("joinRequest.flash.declined", {
                name: collaboration.name
            }), () => this.componentDidMount());
    };

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

    confirm = (action, question, declineDialog) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action,
            declineDialog: declineDialog
        });
    };

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({selectedJoinRequestId: null});
    }

    openJoinRequest = joinRequest => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.setState({selectedJoinRequestId: joinRequest.id});
    };

    filter = (filterOptions, filterValue) => {
        return (
            <div className="join-request-filter">
                <Select
                    className={"join-request-filter-select"}
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

    renderJoinRequestForm = (collaboration, joinRequest) => {
        const {
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            rejectionReason,
            confirmationDialogQuestion,
            declineDialog
        } = this.state;
        const isOpen = joinRequest.status === "open"
        const isDeclined = joinRequest.status === "denied";
        return (
            <div className="join-request-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={true}
                                    confirm={confirmationDialogAction}
                                    disabledConfirm={declineDialog && isEmpty(rejectionReason)}
                                    question={confirmationDialogQuestion}>
                    {declineDialog && this.getDeclineRejectionOptions(rejectionReason)}
                </ConfirmationDialog>
                <div>
                    <a className={"back-to-join-requests"} onClick={this.cancelSideScreen} href={"/cancel"}>
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
                                           onClick={() => this.confirm(
                                               this.declineJoinRequest,
                                               I18n.t("joinRequest.declineConfirmation"),
                                               true
                                           )}/>}
                        {isOpen && <Button txt={I18n.t("joinRequest.accept")}
                                           onClick={this.acceptJoinRequest}/>}
                        {!isOpen && <Button warningButton={true}
                                            onClick={() => this.confirm(
                                                this.deleteJoinRequest,
                                                I18n.t("joinRequest.deleteConfirmation"),
                                                false)}/>}
                    </section>
                </div>
            </div>)

    }

    render() {
        const {loading, filterOptions, filterValue} = this.state;
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
        ]
        const filteredJoinRequests = filterValue.value === allValue ? collaboration.join_requests :
            collaboration.join_requests.filter(jr => jr.status === filterValue.value);
        return (
            <div>
                <Entities entities={filteredJoinRequests}
                          modelName="joinRequests"
                          searchAttributes={["user__name", "user__email", "message", "status", "reference"]}
                          defaultSort="name"
                          rowLinkMapper={() => this.openJoinRequest}
                          inputFocus={true}
                          columns={columns}
                          filters={this.filter(filterOptions, filterValue)}
                          loading={loading}
                          {...this.props}/>
            </div>
        )
    }
}

export default JoinRequests;

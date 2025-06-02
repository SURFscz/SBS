import React from "react";

import "./ServiceRequests.scss";
import I18n from "../../locale/I18n";
import Entities from "./entities/Entities";
import Logo from "./logo/Logo";
import Select from "react-select";
import SpinnerField from "./SpinnerField";
import UserColumn from "./UserColumn";
import {dateFromEpoch} from "../../utils/Date";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../../utils/SocketIO";
import {chipTypeForStatus} from "../../utils/UserRole";
import {Chip} from "@surfnet/sds";
import {findAllServiceRequests} from "../../api";
import {statusCustomSort, stopEvent} from "../../utils/Utils";

const allValue = "all";

export default class ServiceRequests extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            filterOptions: [],
            filterValue: {},
            loading: true,
            socketSubscribed: false,
            service_requests: []
        }
    }

    componentWillUnmount = () => {
        socket.then(s => s.off(`service_requests`));
    }

    componentDidMount = callback => {
        const {personal, user, service_requests} = this.props;
        const promise = personal ? Promise.resolve(service_requests) : findAllServiceRequests();
        promise.then(res => {
            const filterOptions = [{
                label: I18n.t("collaborationRequest.statuses.all", {nbr: res.length}),
                value: allValue
            }];
            const statusOptions = res.reduce((acc, cr) => {
                const option = acc.find(opt => opt.status === cr.status);
                if (option) {
                    ++option.nbr;
                } else {
                    acc.push({status: cr.status, nbr: 1})
                }
                return acc;
            }, []).map(option => ({
                label: `${I18n.t("collaborationRequest.statuses." + option.status)} (${option.nbr})`,
                value: option.status
            })).sort((o1, o2) => o1.label.localeCompare(o2.label));

            const {socketSubscribed} = this.state;
            if (!socketSubscribed) {
                socket.then(s => s.on(`service_requests`, data => {
                    const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
                    const {refreshUserHook} = this.props;
                    if (subscriptionIdSessionStorage !== data.subscription_id && (!personal || user.id === data.current_user_id)) {
                        if (refreshUserHook) {
                            refreshUserHook(() => this.componentDidMount());
                        } else {
                            this.componentDidMount();
                        }

                    }
                }));
                this.setState({socketSubscribed: true})
            }
            this.setState({
                filterOptions: filterOptions.concat(statusOptions),
                filterValue: filterOptions[0],
                loading: false,
                service_requests: res
            }, callback);
        });
    }

    openServiceRequest = serviceRequest => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.props.history.push(`/service-request/${serviceRequest.id}`)
    };


    filter = (filterOptions, filterValue) => {
        return (
            <div className="service-request-filter">
                <Select
                    className={"service-request-filter-select"}
                    classNamePrefix={"filter-select"}
                    value={filterValue}
                    onChange={option => this.setState({filterValue: option})}
                    options={filterOptions}
                    isSearchable={false}
                    isClearable={false}
                />
            </div>
        );
    }

    render() {
        const {user, personal} = this.props;
        const {service_requests, filterOptions, filterValue, loading} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: entity => <Logo src={entity.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.services.name"),
                mapper: entity => entity.name,
            },
            {
                key: "description",
                header: I18n.t("models.groups.description"),
                mapper: entity => <span className={"cut-of-lines"}>{entity.description}</span>
            },
            {
                key: "requester__name",
                header: I18n.t("models.service_requests.requester"),
                mapper: entity => <UserColumn entity={{user: personal ? user : entity.requester}} currentUser={user}/>
            },
            {
                key: "created_at",
                header: I18n.t("models.memberJoinRequests.requested"),
                mapper: entity => dateFromEpoch(entity.created_at)
            },
            {
                key: "connection_type",
                header: I18n.t("models.service_requests.protocol"),
                mapper: entity => I18n.t(`service.protocolsShort.${entity.connection_type}`)
            },
            {
                key: "status",
                header: I18n.t("collaborationRequest.status"),
                mapper: entity => <Chip type={chipTypeForStatus(entity)}
                                        label={I18n.t(`collaborationRequest.statuses.${entity.status}`)}/>,
                customSort: statusCustomSort
            }
        ]
        const filteredServiceRequests = filterValue.value === allValue ? service_requests :
            service_requests.filter(cr => cr.status === filterValue.value);

        return (
            <Entities entities={filteredServiceRequests}
                      modelName={"service_requests"}
                      searchAttributes={["user__name", "user__email", "description", "name", "status"]}
                      defaultSort="status"
                      columns={columns}
                      inputFocus={true}
                      showNew={false}
                      filters={this.filter(filterOptions, filterValue)}
                      loading={false}
                      rowLinkMapper={personal ? null : () => this.openServiceRequest}
                      {...this.props}/>
        )
    }

}

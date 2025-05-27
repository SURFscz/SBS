import React from "react";

import "./MyRequests.scss";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import Logo from "./Logo";
import Select from "react-select";
import SpinnerField from "./SpinnerField";
import {dateFromEpoch} from "../../utils/Date";
import {
    COLLABORATION_REQUEST_TYPE,
    JOIN_REQUEST_TYPE, SERVICE_CONNECTION_REQUEST_TYPE,
    SERVICE_REQUEST_TYPE,
    socket,
    SUBSCRIPTION_ID_COOKIE_NAME
} from "../../utils/SocketIO";
import {chipTypeForStatus} from "../../utils/UserRole";
import {Chip} from "@surfnet/sds";
import {organisationNames} from "../../api";
import {AppStore} from "../../stores/AppStore";
import {statusCustomSort} from "../../utils/Utils";


const allValue = "all";

export default class MyRequests extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            filterOptions: [],
            filterValue: {},
            loading: true,
            socketSubscribed: false
        }
    }

    componentWillUnmount = () => {
        const {requests} = this.props;
        socket.then(s => {
            s.off(`service_requests`);
            requests.forEach(request => {
                switch (request.requestType) {
                    case SERVICE_CONNECTION_REQUEST_TYPE:
                    case JOIN_REQUEST_TYPE: {
                        s.off(`collaboration_${request.collaboration_id}`);
                        break;
                    }
                    case COLLABORATION_REQUEST_TYPE: {
                        s.off(`organisation_${request.organisation_id}`);
                        break;
                    }
                }
            });
        });
    }

    onSocketMessage = data => {
        const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
        const {refreshUserHook} = this.props;
        if (subscriptionIdSessionStorage !== data.subscription_id) {
            refreshUserHook(() => this.componentDidMount());
        }
    }

    componentDidMount = callback => {
        const {requests, standAlone} = this.props;
        const filterOptions = [{
            label: I18n.t("collaborationRequest.statuses.all", {nbr: requests.length}),
            value: allValue
        }];
        const statusOptions = requests.reduce((acc, cr) => {
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
        if (standAlone) {
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {value: I18n.t("breadcrumb.myRequests")}
                ];
            });
        }

        const {socketSubscribed} = this.state;
        if (!socketSubscribed) {
            socket.then(s => {
                if (this.hasRequest(requests, SERVICE_REQUEST_TYPE)) {
                    s.on(`service_requests`, this.onSocketMessage);
                }
                requests.forEach(request => {
                    if (request.requestType === COLLABORATION_REQUEST_TYPE) {
                        s.on(`organisation_${request.organisation_id}`, this.onSocketMessage);
                    } else if (request.requestType === JOIN_REQUEST_TYPE || request.requestType === SERVICE_CONNECTION_REQUEST_TYPE) {
                        s.on(`collaboration_${request.collaboration_id}`, this.onSocketMessage)
                    }
                });
                this.setState({socketSubscribed: true})
            })
        }
        const joinRequests = requests.filter(request => request.requestType === JOIN_REQUEST_TYPE);
        organisationNames(joinRequests).then(res => {
            joinRequests.forEach(jr => jr.organisationName = res[jr.id]);
            requests.forEach(request => request.organisationName = this.organisationName(request));
            this.setState({
                filterOptions: filterOptions.concat(statusOptions),
                filterValue: filterOptions[0],
                loading: false
            }, callback);
        })
    }

    hasRequest = (requests, requestType) => {
        return requests.some(request => request.requestType === requestType)
    }

    filter = (filterOptions, filterValue) => {
        return (
            <div className="requests-filter">
                <Select
                    className={"requests-filter-select"}
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

    organisationName = request => {
        switch (request.requestType) {
            case JOIN_REQUEST_TYPE:
                return request.organisationName;
            case COLLABORATION_REQUEST_TYPE:
                return request.organisation.name;
            case SERVICE_REQUEST_TYPE:
                return request.providing_organisation;
            case SERVICE_CONNECTION_REQUEST_TYPE:
                return I18n.t("myRequests.notApplicable")
        }
    }

    render() {
        const {requests} = this.props;
        const {filterOptions, filterValue, loading} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: request => <Logo
                    src={request.requestType === JOIN_REQUEST_TYPE ? request.collaboration.logo :
                        request.requestType === SERVICE_CONNECTION_REQUEST_TYPE ? request.service.logo : request.logo}/>
            },
            {
                key: "requestType",
                header: I18n.t("myRequests.requestType"),
                mapper: request => I18n.t(`myRequests.types.${request.requestType}`)
            },
            {
                key: "name",
                header: I18n.t("myRequests.name"),
                mapper: request => request.requestType === JOIN_REQUEST_TYPE ? request.collaboration.name :
                    request.requestType === SERVICE_CONNECTION_REQUEST_TYPE ? request.service.name : request.name,
            },
            {
                key: "organisationName",
                header: I18n.t("myRequests.organisationName"),
                mapper: request => request.organisationName,
            },
            {
                key: "created_at",
                header: I18n.t("models.memberJoinRequests.requested"),
                mapper: entity => dateFromEpoch(entity.created_at)
            },
            {
                key: "status",
                header: I18n.t("collaborationRequest.status"),
                mapper: entity => <Chip type={chipTypeForStatus(entity)}
                                        label={I18n.t(`collaborationRequest.statuses.${entity.status}`)}/>,
                customSort: statusCustomSort
            }
        ]
        const filteredRequests = filterValue.value === allValue ? requests :
            requests.filter(cr => cr.status === filterValue.value);

        return (
            <Entities entities={filteredRequests}
                      modelName={"my_requests"}
                      searchAttributes={["name", "description", "organisationName", "status"]}
                      defaultSort="status"
                      columns={columns}
                      showNew={false}
                      inputFocus={true}
                      filters={this.filter(filterOptions, filterValue)}
                      loading={false}
                      {...this.props}/>
        )
    }

}

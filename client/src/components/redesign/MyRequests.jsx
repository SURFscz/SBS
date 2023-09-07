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
    JOIN_REQUEST_TYPE,
    SERVICE_TYPE_REQUEST,
    socket,
    SUBSCRIPTION_ID_COOKIE_NAME
} from "../../utils/SocketIO";
import {chipTypeForStatus} from "../../utils/UserRole";
import {Chip} from "@surfnet/sds";
import {schacHomes} from "../../api";


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
        const {requests} = this.props;
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

        const {socketSubscribed} = this.state;
        if (!socketSubscribed) {
            socket.then(s => {
                if (this.hasRequest(requests, SERVICE_TYPE_REQUEST)) {
                    s.on(`service_requests`, this.onSocketMessage);
                }
                requests.forEach(request => {
                    if (request.requestType === COLLABORATION_REQUEST_TYPE) {
                        s.on(`organisation_${request.organisation_id}`, this.onSocketMessage);
                    } else if (request.requestType === JOIN_REQUEST_TYPE) {
                        s.on(`collaboration_${request.collaboration_id}`, this.onSocketMessage)
                    }
                });
                this.setState({socketSubscribed: true})
            })
        }
        const joinRequests = requests.filter(request => request.requestType === JOIN_REQUEST_TYPE);
        schacHomes(joinRequests).then(res => {
            joinRequests.forEach(jr => jr.schacHomes = res[jr.id]);
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
                return (request.schacHomes || []).map((name, index) => <span key={index} className="schac_home">{name}</span>);
            case COLLABORATION_REQUEST_TYPE:
                return request.organisation.name;
            case SERVICE_TYPE_REQUEST:
                return request.providing_organisation;
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
                    src={request.requestType === JOIN_REQUEST_TYPE ? request.collaboration.logo : request.logo}/>
            },
            {
                key: "requestType",
                header: I18n.t("myRequests.requestType"),
                mapper: request => I18n.t(`myRequests.types.${request.requestType}`)
            },
            {
                key: "name",
                header: I18n.t("myRequests.name"),
                mapper: request => request.requestType === JOIN_REQUEST_TYPE ? request.collaboration.name : request.name,
            },
            {
                nonSortable: true,
                key: "description",
                header: I18n.t("myRequests.description"),
                mapper: request => request.requestType === JOIN_REQUEST_TYPE ? "-" : <span className="cut-of-lines">{request.description}</span>
            },
            {
                nonSortable: true,
                key: "organisation__name",
                header: I18n.t("myRequests.organisationName"),
                mapper: request => this.organisationName(request),
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
                                        label={I18n.t(`collaborationRequest.statuses.${entity.status}`)}/>
            }
        ]
        const filteredRequests = filterValue.value === allValue ? requests :
            requests.filter(cr => cr.status === filterValue.value);

        return (
            <Entities entities={filteredRequests}
                      modelName={"member_collaboration_requests"}
                      searchAttributes={["name", "description", "organisation__name", "name", "status"]}
                      defaultSort="name"
                      columns={columns}
                      showNew={false}
                      filters={this.filter(filterOptions, filterValue)}
                      loading={false}
                      {...this.props}/>
        )
    }

}


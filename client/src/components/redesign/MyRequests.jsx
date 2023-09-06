import React from "react";

import "./MemberCollaborationRequests.scss";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import Logo from "./Logo";
import Select from "react-select";
import SpinnerField from "./SpinnerField";
import UserColumn from "./UserColumn";
import {dateFromEpoch} from "../../utils/Date";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME, COLLABORATION_REQUEST_TYPE, JOIN_REQUEST_TYPE, SERVICE_TYPE_REQUEST} from "../../utils/SocketIO";
import {chipTypeForStatus} from "../../utils/UserRole";
import {Chip} from "@surfnet/sds";
import {schacHome} from "../../api";

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
                switch (request.typeRequest) {
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
                if (this.hasRequest(SERVICE_TYPE_REQUEST)) {
                    s.on(`service_requests`, this.onSocketMessage);
                }
                requests.forEach(request => {
                    if (request.requestType === COLLABORATION_REQUEST_TYPE) {
                        s.on(`organisation_${request.organisation_id}`, this.onSocketMessage);
                    } else if (request.requestType === JOIN_REQUEST_TYPE) {
                        s.off(`collaboration_${request.collaboration_id}`)
                    }
                });
                this.setState({socketSubscribed: true})
            })
        }
        requests.filter(request => request.requestType !== SERVICE_TYPE_REQUEST)
        Promise.all(join_requests.map(jr => schacHome(jr.collaboration.organisation_id))).then(results => {
            results.forEach((schacHome, index) => join_requests[index].schacHome = schacHome)
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
            <div className="collaboration-request-filter">
                <Select
                    className={"collaboration-request-filter-select"}
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
        const {collaboration_requests, user, isPersonal = true, isDeleted = false} = this.props;
        const {filterOptions, filterValue, loading} = this.state;
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
                header: I18n.t("models.memberJoinRequests.collaborationName"),
                mapper: entity => entity.name,
            },
            {
                key: "organisation__name",
                header: I18n.t("models.memberJoinRequests.organisationName"),
                mapper: entity => entity.organisation.name,
            },
            {
                key: "user__name",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={isPersonal ? user : entity.requester}
                                              showMe={isPersonal}/>
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
        const filteredCollaborationRequests = filterValue.value === allValue ? collaboration_requests :
            collaboration_requests.filter(cr => cr.status === filterValue.value);

        return (
            <Entities entities={filteredCollaborationRequests}
                      modelName={isPersonal ? "member_collaboration_requests" : isDeleted ? "deleted_collaboration_requests" : "system_collaboration_requests"}
                      searchAttributes={["user__name", "user__email", "organisation__name", "name", "status"]}
                      defaultSort="name"
                      columns={columns}
                      showNew={false}
                      filters={this.filter(filterOptions, filterValue)}
                      loading={false}
                      {...this.props}/>
        )
    }

}


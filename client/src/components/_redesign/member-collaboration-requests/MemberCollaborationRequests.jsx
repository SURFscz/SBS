import React from "react";

import "./MemberCollaborationRequests.scss";
import I18n from "../../../locale/I18n";
import Entities from "../entities/Entities";
import Logo from "../logo/Logo";
import Select from "react-select";
import SpinnerField from "../spinner-field/SpinnerField";
import UserColumn from "../UserColumn";
import {dateFromEpoch} from "../../../utils/Date";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../../../utils/SocketIO";
import {chipTypeForStatus} from "../../../utils/UserRole";
import {Chip} from "@surfnet/sds";

const allValue = "all";

export default class MemberCollaborationRequests extends React.PureComponent {

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
        const {collaboration_requests} = this.props;
        collaboration_requests.forEach(collaborationRequests => {
            socket.then(s => s.off(`organisation_${collaborationRequests.organisation_id}`));
        });
    }

    componentDidMount = callback => {
        const {collaboration_requests, user, isPersonal = true} = this.props;
        if (isPersonal) {
            collaboration_requests.forEach(cr => {
                cr.user = user;
            })
        } else {
            collaboration_requests.forEach(cr => {
                cr.user = cr.requester;
            })
        }

        const filterOptions = [{
            label: I18n.t("collaborationRequest.statuses.all", {nbr: collaboration_requests.length}),
            value: allValue
        }];
        const statusOptions = collaboration_requests.reduce((acc, cr) => {
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
            collaboration_requests.forEach(collaborationRequests => {
                socket.then(s => s.on(`organisation_${collaborationRequests.organisation_id}`, data => {
                    const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
                    const {refreshUserHook} = this.props;
                    if (subscriptionIdSessionStorage !== data.subscription_id) {
                        refreshUserHook(() => this.componentDidMount());
                    }
                }));
            })
            this.setState({socketSubscribed: true})
        }
        this.setState({
            filterOptions: filterOptions.concat(statusOptions),
            filterValue: filterOptions[0],
            loading: false
        }, callback);
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

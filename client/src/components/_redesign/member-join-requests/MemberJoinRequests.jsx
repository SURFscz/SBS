import React from "react";

import "./MemberJoinRequests.scss";
import I18n from "../../../locale/I18n";
import Entities from "../entities/Entities";
import SpinnerField from "../spinner-field/SpinnerField";
import UserColumn from "../UserColumn";
import Select from "react-select";
import Logo from "../logo/Logo";
import {dateFromEpoch} from "../../../utils/Date";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../../../utils/SocketIO";
import InstituteColumn from "../institute-column/InstituteColumn";
import {schacHome} from "../../../api";
import {chipTypeForStatus} from "../../../utils/UserRole";
import {Chip} from "@surfnet/sds";

const allValue = "all";

class MemberJoinRequests extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            filterOptions: [],
            filterValue: {},
            socketSubscribed: false
        };
    }

    componentWillUnmount = () => {
        const {join_requests, isPersonal = true} = this.props;
        if (isPersonal) {
            join_requests.forEach(joinRequest => {
                socket.then(s => s.off(`collaboration_${joinRequest.collaboration_id}`));
            });
        }
    }

    componentDidMount = callback => {
        const {join_requests, user, isPersonal = true} = this.props;
        if (isPersonal) {
            join_requests.forEach(jr => {
                jr.user = user;
            })
        }
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
        if (isPersonal) {
            const {socketSubscribed} = this.state;
            if (!socketSubscribed) {
                join_requests.forEach(joinRequest => {
                    socket.then(s => s.on(`collaboration_${joinRequest.collaboration_id}`, data => {
                        const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
                        const {refreshUserHook} = this.props;
                        if (subscriptionIdSessionStorage !== data.subscription_id) {
                            refreshUserHook(() => this.componentDidMount());
                        }
                    }));
                })
                this.setState({socketSubscribed: true})
            }
        }
        Promise.all(join_requests.map(jr => schacHome(jr.collaboration.organisation_id))).then(results => {
            results.forEach((schacHome, index) => join_requests[index].schacHome = schacHome)
            this.setState({
                filterOptions: filterOptions.concat(statusOptions),
                filterValue: filterOptions[0],
                loading: false
            }, callback);

        });
    }

    filter = (filterOptions, filterValue) => {
        return (
            <div className="join-request-filter">
                <Select
                    className={"join-request-filter-select"}
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
        const {loading, filterOptions, filterValue} = this.state;
        const {join_requests, user: currentUser, isPersonal = true, isDeleted = false} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: entity => <Logo src={entity.collaboration.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.memberJoinRequests.collaborationName"),
                mapper: entity => entity.collaboration.name,
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: entity => <InstituteColumn entity={{user: {schac_home_organisation: entity.schacHome}}}
                                                   currentUser={currentUser}/>
            },
            {
                key: "user__name",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={isPersonal ? currentUser : entity.user}
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
                                    label={I18n.t(`collaborationRequest.statuses.${entity.status}`)} />
            }
        ]
        const filteredJoinRequests = filterValue.value === allValue ? join_requests :
            join_requests.filter(jr => jr.status === filterValue.value);
        return (
            <div>
                <Entities entities={filteredJoinRequests}
                          modelName={isPersonal ? "memberJoinRequests" : isDeleted ? "deletedJoinRequests" : "systemJoinRequests"}
                          searchAttributes={["user__name", "user__email", "collaboration__name", "status"]}
                          defaultSort="name"
                          columns={columns}
                          filters={this.filter(filterOptions, filterValue)}
                          loading={loading}
                          {...this.props}/>
            </div>
        )
    }
}

export default MemberJoinRequests;

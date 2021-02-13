import React from "react";

import "./MemberJoinRequests.scss";
import I18n from "i18n-js";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";
import UserColumn from "./UserColumn";
import Select from "react-select";
import Logo from "./Logo";
import {dateFromEpoch} from "../../utils/Date";

const allValue = "all";

class MemberJoinRequests extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            filterOptions: [],
            filterValue: {},

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

        this.setState({
            filterOptions: filterOptions.concat(statusOptions),
            filterValue: filterOptions[0],
            loading: false
        }, callback);
    }

    filter = (filterOptions, filterValue) => {
        return (
            <div className="join-request-filter">
                <Select
                    className={"join-request-filter-select"}
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
                mapper: entity => <span
                    className={`person-role ${entity.status}`}>{I18n.t(`collaborationRequest.statuses.${entity.status}`)}</span>
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
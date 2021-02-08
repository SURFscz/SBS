import React from "react";

import "./MemberCollaborationRequests.scss";
import I18n from "i18n-js";
import Entities from "./Entities";
import Logo from "./Logo";
import Select from "react-select";
import SpinnerField from "./SpinnerField";
import UserColumn from "./UserColumn";
import {dateFromEpoch} from "../../utils/Date";

const allValue = "all";

export default class MemberCollaborationRequests extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            filterOptions: [],
            filterValue: {},
            loading: true
        }
    }

    componentDidMount = () => {
        const {collaboration_requests, user} = this.props;
        collaboration_requests.forEach(cr => {
            cr.user = user;
        })

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

        this.setState({
            filterOptions: filterOptions.concat(statusOptions),
            filterValue: filterOptions[0],
            loading: false
        });
    }


    filter = (filterOptions, filterValue) => {
        return (
            <div className="collaboration-request-filter">
                <Select
                    className={"collaboration-request-filter-select"}
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
        const {collaboration_requests, user} = this.props;
        const {filterOptions, filterValue, loading} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: entity => <Logo src={entity.organisation.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.memberJoinRequests.collaborationName"),
                mapper: entity => entity.organisation.name,
            },
            {
                key: "user__name",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} currentUser={user}/>
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
        const filteredCollaborationRequests = filterValue.value === allValue ? collaboration_requests :
            collaboration_requests.filter(cr => cr.status === filterValue.value);

        return (
            <Entities entities={filteredCollaborationRequests}
                      modelName={"member_collaboration_requests"}
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


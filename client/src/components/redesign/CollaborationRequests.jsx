import React from "react";

import "./CollaborationRequests.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Logo from "./Logo";
import Select from "react-select";

const allValue = "all";

export default class CollaborationRequests extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            filterOptions: [],
            filterValue: {},
        }
    }

    componentDidMount = () => {
        const {collaboration_requests} = this.props.organisation;
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
            filterValue: filterOptions[0]
        });
    }


    openCollaborationRequest = collaborationRequest => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.props.history.push(`/collaboration-requests/${collaborationRequest.id}`);
    };

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
        const {organisation} = this.props;
        const {filterOptions, filterValue} = this.state;
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: cr => <Logo src={cr.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.collaborations.name"),
                mapper: cr => <a href={`/collaboration-requests/${cr.id}`}
                                 onClick={this.openCollaborationRequest(cr)}>{cr.name}</a>
            },
            {
                key: "status",
                header: I18n.t("collaborationRequest.status"),
                mapper: cr => <span
                    className={`person-role ${cr.status}`}>{I18n.t(`collaborationRequest.statuses.${cr.status}`)}</span>
            },
            {
                key: "requester",
                header: I18n.t("models.collaboration_requests.requester"),
                mapper: cr => <div className="user-name-email-container">
                    <div className="user-name-email">
                        <span className="name">{cr.requester.name}</span>
                        <span className="email">{cr.requester.email}</span>
                    </div>
                </div>
            },
        ]
        const filteredCollaborationRequests = filterValue.value === allValue ? organisation.collaboration_requests :
            organisation.collaboration_requests.filter(cr => cr.status === filterValue.value);

        return (
            <Entities entities={filteredCollaborationRequests}
                      modelName={"collaboration_requests"}
                      searchAttributes={["name", "requester__name"]}
                      defaultSort="name"
                      rowLinkMapper={() => this.openCollaborationRequest}
                      columns={columns}
                      showNew={false}
                      hideTitle={true}
                      filters={this.filter(filterOptions, filterValue)}
                      loading={false}
                      {...this.props}/>
        )
    }

}


import React, {useCallback, useEffect, useState} from "react";

import "./CollaborationRequests.scss";
import {stopEvent} from "../../../utils/Utils";
import I18n from "../../../locale/I18n";
import Entities from "../entities/Entities";
import Logo from "../logo/Logo";
import Select from "react-select";
import InstituteColumn from "../institute-column/InstituteColumn";
import UserColumn from "../user-column/UserColumn";
import {chipTypeForStatus} from "../../../utils/UserRole";
import {Chip} from "@surfnet/sds";
import {useQueryParameter} from "../../../hooks/useQueryParameter";
import {useLocation} from "react-router-dom";

const allValue = "all";

const CollaborationRequests = ({organisation, user, history, ...rest}) => {

    const location = useLocation();
    const [queryFilterValue, setQueryFilterValue] = useQueryParameter('filterValue');
    const [filterOptions, setFilterOptions] = useState([]);
    const [filterValue, setFilterValue] = useState({});

    const initializeFilters = useCallback(() => {
        const {collaboration_requests} = organisation;
        const baseOptions = [{
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

        const allOptions = baseOptions.concat(statusOptions);
        setFilterOptions(allOptions);
        setFilterValue(allOptions.find(o => o.value === queryFilterValue) || baseOptions[0]);
    }, [organisation]);

    useEffect(() => {
        initializeFilters();
    }, [initializeFilters]);

    const openCollaborationRequest = collaborationRequest => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        history.push(`/collaboration-requests/${collaborationRequest.id}`, {
            from: `${location.pathname}${location.search}`
        });
    };

    const renderFilter = (
        <div className="collaboration-request-filter">
            <Select
                className={"collaboration-request-filter-select"}
                value={filterValue}
                classNamePrefix={"filter-select"}
                onChange={option => {
                    setQueryFilterValue(option.value);
                    setFilterValue(option);
                }}
                options={filterOptions}
                isSearchable={false}
                isClearable={false}
            />
        </div>
    );

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
                             className={"neutral-appearance"}
                             onClick={openCollaborationRequest(cr)}>{cr.name}</a>
        },
        {
            key: "units",
            class: "units",
            header: I18n.t("units.column"),
            mapper: cr => <div className="unit-container">
                {(cr.units || [])
                    .sort((u1, u2) => u1.name.localeCompare(u2.name))
                    .map((unit, index) => <span key={index} className="chip-container">
                    {unit.name}</span>)}
            </div>
        },
        {
            key: "status",
            header: I18n.t("collaborationRequest.status"),
            mapper: cr => <Chip type={chipTypeForStatus(cr)}
                                label={I18n.t(`collaborationRequest.statuses.${cr.status}`)}/>
        },
        {
            key: "requester",
            header: I18n.t("models.collaboration_requests.requester"),
            mapper: cr => <UserColumn entity={{user: cr.requester}} currentUser={user}/>
        },
        {
            key: "user__schac_home_organisation",
            header: I18n.t("models.users.institute"),
            mapper: cr => <InstituteColumn entity={{user: cr.requester}} currentUser={user}/>
        },
    ];

    const filteredCollaborationRequests = filterValue.value === allValue ? organisation.collaboration_requests :
        organisation.collaboration_requests.filter(cr => cr.status === filterValue.value);

    const numberOfRequests = organisation.collaboration_requests.length;
    return (
        <Entities entities={filteredCollaborationRequests}
                  modelName={"collaboration_requests"}
                  searchAttributes={["name", "requester__name"]}
                  inputFocus={true}
                  defaultSort="name"
                  rowLinkMapper={() => openCollaborationRequest}
                  columns={columns}
                  showNew={false}
                  customNoEntities={" "}
                  title={numberOfRequests === 0 ? I18n.t("models.collaboration_requests.noEntities") :
                      `${I18n.t("models.collaboration_requests.title")} (${numberOfRequests})`}
                  filters={renderFilter}
                  loading={false}
                  {...rest}/>
    );
};

export default CollaborationRequests;

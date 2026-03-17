import React, {useCallback, useEffect, useRef, useState} from "react";

import "./ServiceRequests.scss";
import I18n from "../../../locale/I18n";
import Entities from "../entities/Entities";
import Logo from "../logo/Logo";
import Select from "react-select";
import SpinnerField from "../spinner-field/SpinnerField";
import UserColumn from "../user-column/UserColumn";
import {dateFromEpoch} from "../../../utils/Date";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../../../utils/SocketIO";
import {chipTypeForStatus} from "../../../utils/UserRole";
import {Chip} from "@surfnet/sds";
import {findAllServiceRequests} from "../../../api";
import {statusCustomSort, stopEvent} from "../../../utils/Utils";
import {useQueryParameter} from "../../../hooks/useQueryParameter";
import {useLocation} from "react-router-dom";

const allValue = "all";

const ServiceRequests = ({personal, user, service_requests: serviceRequestsProp, refreshUserHook, history, ...rest}) => {

    const location = useLocation();
    const [queryFilterValue, setQueryFilterValue] = useQueryParameter('filterValue');

    const [filterOptions, setFilterOptions] = useState([]);
    const [filterValue, setFilterValue] = useState({});
    const [loading, setLoading] = useState(true);
    const [serviceRequests, setServiceRequests] = useState([]);
    const socketSubscribedRef = useRef(false);

    const initializeFilters = useCallback(() => {
        const promise = personal ? Promise.resolve(serviceRequestsProp) : findAllServiceRequests();
        promise.then(res => {
            const baseOptions = [{
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

            if (!socketSubscribedRef.current) {
                socket.then(s => s.on(`service_requests`, data => {
                    const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
                    if (subscriptionIdSessionStorage !== data.subscription_id && (!personal || user.id === data.current_user_id)) {
                        if (refreshUserHook) {
                            refreshUserHook();
                        }
                    }
                }));
                socketSubscribedRef.current = true;
            }

            const allOptions = baseOptions.concat(statusOptions);
            setFilterOptions(allOptions);
            setFilterValue(allOptions.find(o => o.value === queryFilterValue) || baseOptions[0]);
            setLoading(false);
            setServiceRequests(res);
        });
    }, [personal, serviceRequestsProp, user, refreshUserHook]);

    useEffect(() => {
        initializeFilters();
    }, [initializeFilters]);

    useEffect(() => {
        return () => {
            socket.then(s => s.off(`service_requests`));
        };
    }, []);

    const openServiceRequest = serviceRequest => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        history.push(`/service-request/${serviceRequest.id}`, {
            from: `${location.pathname}${location.search}`
        });
    };

    const renderFilter = (
        <div className="service-request-filter">
            <Select
                className={"service-request-filter-select"}
                classNamePrefix={"filter-select"}
                value={filterValue}
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
            mapper: entity => I18n.t(`service.protocolsShort.${entity.connection_type || "none"}`)
        },
        {
            key: "status",
            header: I18n.t("collaborationRequest.status"),
            mapper: entity => <Chip type={chipTypeForStatus(entity)}
                                    label={I18n.t(`collaborationRequest.statuses.${entity.status}`)}/>,
            customSort: statusCustomSort
        }
    ];

    const filteredServiceRequests = filterValue.value === allValue ? serviceRequests :
        serviceRequests.filter(cr => cr.status === filterValue.value);

    return (
        <Entities entities={filteredServiceRequests}
                  modelName={"service_requests"}
                  searchAttributes={["user__name", "user__email", "description", "name", "status"]}
                  defaultSort="status"
                  columns={columns}
                  inputFocus={true}
                  showNew={false}
                  filters={renderFilter}
                  loading={false}
                  rowLinkMapper={personal ? null : () => openServiceRequest}
                  {...rest}/>
    );
};

export default ServiceRequests;

import React, {useCallback, useEffect, useRef, useState} from "react";

import "./MyRequests.scss";
import I18n from "../../../locale/I18n";
import Entities from "../entities/Entities";
import Logo from "../logo/Logo";
import Select from "react-select";
import SpinnerField from "../spinner-field/SpinnerField";
import {dateFromEpoch} from "../../../utils/Date";
import {
    COLLABORATION_REQUEST_TYPE,
    JOIN_REQUEST_TYPE, SERVICE_CONNECTION_REQUEST_TYPE,
    SERVICE_REQUEST_TYPE,
    socket,
    SUBSCRIPTION_ID_COOKIE_NAME
} from "../../../utils/SocketIO";
import {chipTypeForStatus} from "../../../utils/UserRole";
import {Chip} from "@surfnet/sds";
import {organisationNames} from "../../../api";
import {AppStore} from "../../../stores/AppStore";
import {statusCustomSort} from "../../../utils/Utils";
import {useQueryParameter} from "../../../hooks/useQueryParameter";

const allValue = "all";

const getOrganisationName = request => {
    switch (request.requestType) {
        case JOIN_REQUEST_TYPE:
            return request.organisationName;
        case COLLABORATION_REQUEST_TYPE:
            return request.organisation.name;
        case SERVICE_REQUEST_TYPE:
            return request.providing_organisation;
        case SERVICE_CONNECTION_REQUEST_TYPE:
            return I18n.t("myRequests.notApplicable");
        default:
            return "";
    }
};

export const MyRequests = ({requests, standAlone, refreshUserHook, ...rest}) => {

    const [queryFilterValue, setQueryFilterValue] = useQueryParameter('filterValue');

    const [filterOptions, setFilterOptions] = useState([]);
    const [filterValue, setFilterValue] = useState({});
    const [loading, setLoading] = useState(true);
    const socketSubscribedRef = useRef(false);

    const initializeFilters = useCallback(() => {
        const baseOptions = [{
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

        const onSocketMessage = data => {
            const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
            if (subscriptionIdSessionStorage !== data.subscription_id) {
                refreshUserHook();
            }
        };

        if (!socketSubscribedRef.current) {
            socket.then(s => {
                if (requests.some(r => r.requestType === SERVICE_REQUEST_TYPE)) {
                    s.on(`service_requests`, onSocketMessage);
                }
                requests.forEach(request => {
                    if (request.requestType === COLLABORATION_REQUEST_TYPE) {
                        s.on(`organisation_${request.organisation_id}`, onSocketMessage);
                    } else if (request.requestType === JOIN_REQUEST_TYPE || request.requestType === SERVICE_CONNECTION_REQUEST_TYPE) {
                        s.on(`collaboration_${request.collaboration_id}`, onSocketMessage);
                    }
                });
                socketSubscribedRef.current = true;
            });
        }

        const joinRequests = requests.filter(request => request.requestType === JOIN_REQUEST_TYPE);
        organisationNames(joinRequests).then(res => {
            joinRequests.forEach(jr => jr.organisationName = res[jr.id]);
            requests.forEach(request => request.organisationName = getOrganisationName(request));
            const allOptions = baseOptions.concat(statusOptions);
            setFilterOptions(allOptions);
            setFilterValue(allOptions.find(o => o.value === queryFilterValue) || baseOptions[0]);
            setLoading(false);
        });
    }, [requests, standAlone, refreshUserHook]);

    useEffect(() => {
        initializeFilters();
    }, [initializeFilters]);

    useEffect(() => {
        return () => {
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
                        default:
                            break;
                    }
                });
            });
        };
    }, [requests]);

    const renderFilter = (
        <div className="requests-filter">
            <Select
                className={"requests-filter-select"}
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
    ];

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
                  filters={renderFilter}
                  loading={false}
                  {...rest}/>
    );
};

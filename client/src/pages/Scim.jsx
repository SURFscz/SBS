import React from "react";
import {allMockScimServices, clearMockScimStatistics, mockScimStatistics} from "../api";
import "./Scim.scss";
import I18n from "i18n-js";
import SpinnerField from "../components/redesign/SpinnerField";
import ConfirmationDialog from "../components/ConfirmationDialog";
import InputField from "../components/InputField";
import {isEmpty, stopEvent} from "../utils/Utils";
import Button from "../components/Button";
import Logo from "../components/redesign/Logo";
import Entities from "../components/redesign/Entities";
import ReactJson from "react-json-view";

class Scim extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: {},
            loading: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: null,
            confirmationDialogQuestion: "",
            statistics: null
        };
    }

    componentDidMount = () => {
        allMockScimServices().then(res => this.setState({services: res, loading: false}));
    };

    clearStatistics = showConfirmation => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogQuestion: I18n.t("system.scim."),
                confirmationDialogAction: () => this.clearStatistics(false)
            });
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            clearMockScimStatistics().then(() => this.setState({loading: false, statistics: null}));
        }
    }

    retrieveStatistics = () => {
        this.setState({loading: true});
        mockScimStatistics().then(res => this.setState({loading: false, statistics: res}));
    }

    openService = service => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    renderStatistics = statistics => {
        return <ReactJson src={statistics} collapsed={3}/>
    }

    renderServices = services => {
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: service => <Logo src={service.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.services.name"),
                mapper: service => <a href={`/services/${service.id}`}
                                      onClick={this.openService(service)}>{service.name}</a>,
            },
            {
                key: "scim_url",
                header: I18n.t("system.scim.service.scimUrl"),
                mapper: service => service.scim_url,
            },
            {
                key: "scim_enabled",
                header: I18n.t("system.scim.service.scimEnabled"),
                mapper: service => <span>{I18n.t(`forms.${service.scim_enabled ? "yes" : "no"}`)}</span>
            },
            {
                key: "scim_provision_users",
                header: I18n.t("system.scim.service.scimProvisionUsers"),
                mapper: service => <span>{I18n.t(`forms.${service.scim_provision_users ? "yes" : "no"}`)}</span>
            },
            {
                key: "scim_provision_groups",
                header: I18n.t("system.scim.service.scimProvisionGroups"),
                mapper: service => <span>{I18n.t(`forms.${service.scim_provision_groups ? "yes" : "no"}`)}</span>
            }];
        return (
            <Entities entities={services}
                      title={I18n.t("system.scim.services")}
                      modelName="scimServices"
                      searchAttributes={["name"]}
                      defaultSort="name"
                      columns={columns}
                      showNew={false}
                      loading={false}
                      rowLinkMapper={() => this.openService}
                      {...this.props}/>
        )

    }

    render() {
        const {
            services, loading, statistics, confirmationDialogOpen, confirmationDialogAction,
            confirmationDialogQuestion,
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const scimMockUrl = `${window.location.origin}/api/scim_mock`.replace("3000", "8080");
        return (
            <div className="mod-scim-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={() => this.setState({confirmationDialogOpen: false})}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <div>
                    <p>{I18n.t("system.scim.info")}</p>
                    <InputField value={scimMockUrl}
                                disabled={true}
                                displayLabel={false}
                                copyClipBoard={true}/>
                </div>
                <div className="info-block">
                    <p>{I18n.t("system.scim.stats")}</p>
                    <div className="actions">
                        {isEmpty(statistics) && <Button txt={I18n.t("system.scim.retrieveStats")}
                                                        onClick={this.retrieveStatistics}/>}
                        {!isEmpty(statistics) && <Button txt={I18n.t("system.scim.clearStats")}
                                                         onClick={() => this.clearStatistics(true)}
                                                         cancelButton={true}/>}
                    </div>
                </div>
                {statistics && <div className="info-block">
                    {this.renderStatistics(statistics)}
                </div>}
                <div className="info-block">
                    {this.renderServices(services)}
                </div>


            </div>);
    }
}

export default Scim;
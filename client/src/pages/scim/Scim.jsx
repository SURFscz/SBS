import React from "react";
import {allMockScimServices, clearMockScimStatistics, mockScimStatistics, sweep} from "../../api";
import "./Scim.scss";
import I18n from "../../locale/I18n";
import SpinnerField from "../../components/_redesign/SpinnerField";
import ConfirmationDialog from "../../components/confirmation-dialog/ConfirmationDialog";
import InputField from "../../components/input-field/InputField";
import {isEmpty, stopEvent} from "../../utils/Utils";
import Button from "../../components/button/Button";
import Logo from "../../components/_redesign/Logo";
import Entities from "../../components/_redesign/entities/Entities";
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
            statistics: null,
            sweepResults: null,
            sweepService: null,
            sweepTime: 0
        };
    }

    componentDidMount = () => {
        allMockScimServices().then(res => this.setState({services: res, loading: false}));
    };

    clearStatistics = showConfirmation => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogQuestion: I18n.t("system.scim.clearConfirmation"),
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

    doSweep = service => {
        this.setState({loading: true});
        const now = new Date();
        sweep(service).then(res => {
            this.setState({
                sweepResults: res,
                sweepService: service,
                sweepTime: new Date().getMilliseconds() - now.getMilliseconds(),
                loading: false
            });
        }).catch(e => {
            if (e.response && e.response.json) {
                e.response.json().then(res => {
                    this.setState({
                        sweepResults: res,
                        sweepService: service,
                        sweepTime: new Date().getMilliseconds() - now.getMilliseconds(),
                        loading: false
                    });
                })
            }
        })
    }

    clearSweepResults = () => {
        this.setState({sweepResults: null, sweepService: null});
    }

    openService = service => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    renderStatistics = statistics => {
        return <ReactJson src={statistics} collapsed={1}/>
    }

    renderSweepResults = (sweepResults, sweepService, sweepTime) => {
        return (
            <div className="sweep-results-container">
                <div className="sweep-results">
                    <h2>{`Results from SCIM sync for service ${sweepService.name} (in ${sweepTime} ms)`}</h2>
                    <Button txt={"Clear"} onClick={() => this.clearSweepResults()}/>
                </div>
                <ReactJson src={sweepResults}/>
            </div>)
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
                                      className={"neutral-appearance"}
                                      onClick={this.openService(service)}>{service.name}</a>,
            },
            {
                key: "id",
                header: I18n.t("system.scim.service.id"),
                mapper: service => service.id,
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
                key: "sweep_scim_enabled",
                header: I18n.t("system.scim.service.sweepScimEnabled"),
                mapper: service => <span>{I18n.t(`forms.${service.sweep_scim_enabled ? "yes" : "no"}`)}</span>
            },
            {
                key: "sweep",
                header: "",
                mapper: service => <Button txt={I18n.t("system.scim.service.sweep")}
                                           onClick={() => this.doSweep(service)}/>
            }
        ];
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
            confirmationDialogQuestion, sweepResults, sweepService, sweepTime
        } = this.state;
        const {mock_scim_enabled} = this.props.config;
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
                {mock_scim_enabled && <div className="service-entities">
                    <p>{I18n.t("system.scim.info")}</p>
                    <InputField value={scimMockUrl}
                                disabled={true}
                                displayLabel={false}
                                copyClipBoard={true}/>
                </div>}
                {mock_scim_enabled && <div className="info-block">
                    <p>{I18n.t("system.scim.stats")}</p>
                    <div className="actions">
                        {isEmpty(statistics) && <Button txt={I18n.t("system.scim.retrieveStats")}
                                                        onClick={this.retrieveStatistics}/>}
                        {!isEmpty(statistics) && <Button txt={I18n.t("system.scim.reRetrieveStats")}
                                                         onClick={this.retrieveStatistics}/>}
                        {!isEmpty(statistics) && <Button txt={I18n.t("system.scim.clearStats")}
                                                         onClick={() => this.clearStatistics(true)}
                                                         cancelButton={true}/>}
                    </div>
                </div>}
                {statistics && <div className="info-block">
                    {this.renderStatistics(statistics)}
                </div>}
                <div className="info-block">
                    {this.renderServices(services)}
                </div>
                {sweepResults && <div className="info-block">
                    {this.renderSweepResults(sweepResults, sweepService, sweepTime)}
                </div>}


            </div>);
    }
}

export default Scim;

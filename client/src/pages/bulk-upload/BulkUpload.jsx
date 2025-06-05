import React from "react";
import I18n from "../../locale/I18n";
import "./BulkUpload.scss";
import {AppStore} from "../../stores/AppStore";
import {ReactComponent as CloudIcon} from "../../icons/cloud-upload.svg";
import UnitHeader from "../../components/redesign/unit-header/UnitHeader";
import Tabs from "../../components/tabs/Tabs";
import {isEmpty, stopEvent} from "../../utils/Utils";
import {headers, parseBulkInvitation} from "../../utils/CSVParser";
import {ReactComponent as SuccessIcon} from "@surfnet/sds/icons/functional-icons/success.svg";
import {ReactComponent as AlertIcon} from "@surfnet/sds/icons/functional-icons/alert-triangle.svg";
import exampleCVS from '!!raw-loader!../../schemas/bulk-import-example.csv';
import Button from "../../components/button/Button";
import DOMPurify from "dompurify";
import TabularData from "../../components/tabular-data/TabularData";
import {invitationBulkUpload} from "../../api";
import SpinnerMarathonField from "../../components/redesign/spinner-marathon-field/SpinnerMarathonField";

class BulkUpload extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: false,
            tab: "main",
            errorWrongExtension: false,
            errors: [],
            csv: null,
            data: [],
            fileName: null,
            tabs: [],
            showDetails: false,
            showResults: false,
            results: null,
            allEmails: []
        }
    }

    componentDidMount = () => {
        AppStore.update(s => {
            s.breadcrumb.paths = [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {path: "", value: I18n.t("bulkUpload.breadcrumb")}
            ];
        });
        const params = this.props.match.params;
        const tab = params.tab || this.state.tab;
        this.tabChanged(tab);
    };

    internalOnChange = e => {
        const files = e.target.files;
        if (!isEmpty(files)) {
            const file = files[0];
            if (file.name.endsWith(".csv")) {
                const reader = new FileReader();
                reader.onload = () => {
                    const csv = reader.result.toString();
                    const results = parseBulkInvitation(csv);
                    this.setState({
                        csv: csv,
                        data: results.data,
                        errors: results.errors,
                        showDetails: results.errors.length > 0,
                        errorWrongExtension: false,
                        fileName: file.name,
                        results: null
                    });
                };
                reader.readAsText(file);
            } else {
                this.setState({csv: null, errorWrongExtension: true, fileName: file.name});
            }
        }
    };

    countElements = (data, errors, attribute) => {
        return data.reduce((acc, row, index) => {
            if (!errors.some(error => error.row === index)) {
                row[attribute].forEach(attr => acc.add(attr));
            }
            return acc
        }, new Set()).size;
    }

    proceed = () => {
        const {data, errors} = this.state;
        const filteredData = data.filter((_, index) => !errors.some(error => error.row === index));
        this.setState({data: filteredData, loading: true});
        invitationBulkUpload(filteredData).then(r => {
            // Check for removed emails
            const allEmails = new Set(r.invitations.map(invitation => invitation.email));
            this.setState({results: r, loading: false, allEmails: [...allEmails], showResults: !isEmpty(r.errors)})
        });
    }

    resultsSummary = results => {
        const nbrInvitations = results.invitations.length;

        const hasErrors = !isEmpty(results.errors);
        const allErrors = nbrInvitations === 0;

        return (
            <>
                <div className={`summary ${allErrors ? "errors" : ""}`}>
                    {allErrors ? <AlertIcon/> : <SuccessIcon/>}
                    {allErrors && <p className="error info" dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("bulkUpload.errorUpload"))
                    }}/>}
                    {!allErrors && <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("bulkUpload.successFullyUploaded", {
                            nbrInvitations: nbrInvitations
                        }))
                    }}/>}
                </div>
                {(hasErrors && !allErrors) &&
                    <div className="summary errors">
                        <AlertIcon/>
                        <p>{I18n.t("bulkUpload.errorUploadDetails")}</p>
                    </div>}
            </>
        );
    }

    csvSummary = (data, errors, fileName) => {
        const nbrInvitees = this.countElements(data, errors, "invitees");
        const nbrCollaborations = this.countElements(data, errors, "short_names");
        const nbrGroups = this.countElements(data, errors, "groups");

        const hasErrors = !isEmpty(errors);
        const allErrors = data.length === errors.length || nbrInvitees === 0;

        return (
            <>
                <div className={`summary ${allErrors ? "errors" : ""}`}>
                    {allErrors ? <AlertIcon/> : <SuccessIcon/>}
                    {allErrors && <p className="error info" dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("bulkUpload.errorParsed", {fileName: fileName}))
                    }}/>}
                    {!allErrors && <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("bulkUpload.successFullyParsed", {
                            fileName: fileName,
                            invitees: nbrInvitees,
                            collaborations: nbrCollaborations,
                            groups: nbrGroups,
                        }))
                    }}/>}
                </div>
                {!allErrors && <div className="actions">
                    <Button onClick={this.proceed} small={true} txt={I18n.t("bulkUpload.proceed")}/>
                </div>}
                {(hasErrors && !allErrors) &&
                    <div className="summary errors">
                        <AlertIcon/>
                        <p>{I18n.t("bulkUpload.errorRows")}</p>
                    </div>}
            </>
        );
    }

    openFileDialog = e => {
        stopEvent(e);
        //Needed for Firefox
        this.inputFile && setTimeout(() => this.inputFile.click(), 1);
    }

    handleDrop = event => {
        event.preventDefault();
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const fileList = event.dataTransfer.files;
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(fileList[0]);
            if (this.inputFile) {
                this.inputFile.files = dataTransfer.files;
                this.inputFile.dispatchEvent(new Event("change", {bubbles: true}));
            }
        }
    };

    handleDragOver = e => {
        e.preventDefault();
    };

    getMainTab = (data, errorWrongExtension, fileName, showDetails, errors, results, showResults, allEmails) => {
        const hasResults = !isEmpty(results);
        return (
            <div key="main" name="main" label={I18n.t("bulkUpload.main")}>
                <div className="mod-bulk-upload main">
                    <div className="sds--file-upload"
                         onDrop={this.handleDrop}
                         onDragOver={this.handleDragOver}>
                        <input id="fileUpload_csv"
                               type="file"
                               ref={ref => {
                                   if (!isEmpty(ref)) {
                                       this.inputFile = ref;
                                   }
                               }}
                               name={"fileUpload_csv"}
                               accept="text/csv"
                               onChange={this.internalOnChange}/>

                        <label htmlFor="fileUpload_csv"
                               className="sds--file-upload--message">
                            <span>{I18n.t("bulkUpload.dragDrop")}</span>
                            <a href="/client/public" onClick={this.openFileDialog}>{I18n.t("bulkUpload.click")}</a>
                        </label>
                    </div>

                    {errorWrongExtension &&
                        <p className="error info">{I18n.t("bulkUpload.errorWrongExtension", {name: fileName})}</p>}

                    {(!errorWrongExtension && !isEmpty(fileName) && !hasResults) && <>
                        {this.csvSummary(data, errors, fileName)}
                        <a href="/client/public" onClick={e => {
                            stopEvent(e);
                            this.setState({showDetails: !showDetails});
                        }}>
                            {I18n.t(`bulkUpload.${showDetails ? "hideDetails" : "showDetails"}`)}
                        </a>
                        {showDetails && <TabularData headers={headers.split(",")}
                                                     data={data}
                                                     errors={errors}
                                                     showRequiredInfo={false}/>}
                    </>}
                    {hasResults && <>
                        {this.resultsSummary(results)}
                        <a href="/client/public" onClick={e => {
                            stopEvent(e);
                            this.setState({showResults: !showResults});
                        }}>
                            {I18n.t(`bulkUpload.${showResults ? "hideResults" : "showResults"}`)}
                        </a>
                        {showResults && <TabularData headers={headers.split(",")}
                                                     data={data}
                                                     isResultView={true}
                                                     errors={results.errors}
                                                     allEmails={allEmails}
                                                     showRequiredInfo={false}/>}
                    </>}
                </div>
            </div>
        )
    }

    downloadSample = () => {
        const file = new File([exampleCVS], "bulk-import-example.csv");

        const link = document.createElement("a");
        link.style.display = "none";
        link.href = URL.createObjectURL(file);
        link.download = file.name;

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            URL.revokeObjectURL(link.href);
            link.parentNode.removeChild(link);
        }, 25);
    }


    getDocsTab = () => {
        return (
            <div key="docs" name="docs" label={I18n.t("bulkUpload.docs")}>
                <div className="mod-bulk-upload docs">
                    <p>{I18n.t("bulkUpload.schema")}</p>
                    <div>
                        <Button onClick={() => this.downloadSample()}
                                small={true}
                                txt={I18n.t("bulkUpload.download")}
                        />
                    </div>
                    <p className="info table">{I18n.t("bulkUpload.exampleInfo")}</p>
                    <TabularData headers={headers.split(",")}
                                 data={parseBulkInvitation(exampleCVS).data}
                                 errors={[]}/>
                </div>
            </div>
        )
    }

    tabChanged = name => {
        this.setState({tab: name}, () =>
            this.props.history.replace(`/bulk-upload/${name}`));
    }

    render() {
        const {
            loading, tab, data, errorWrongExtension, fileName, showDetails, errors, results, showResults, allEmails
        } = this.state;

        if (loading) {
            const nbrInvitees = this.countElements(data, errors, "invitees");
            return <SpinnerMarathonField message={I18n.t("bulkUpload.loading", {count: nbrInvitees})}/>
        }

        const tabs = [
            this.getMainTab(data, errorWrongExtension, fileName, showDetails, errors, results, showResults, allEmails),
            this.getDocsTab()
        ]
        return (
            <div className="mod-bulk-upload-container">
                <UnitHeader obj={({name: I18n.t("bulkUpload.title"), svg: CloudIcon})}
                            mayEdit={false}
                            svg={CloudIcon}
                            name={I18n.t("bulkUpload.title")}>

                </UnitHeader>
                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>

            </div>);
    }

}

export default BulkUpload;

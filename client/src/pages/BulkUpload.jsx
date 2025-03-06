import React from "react";
import I18n from "../locale/I18n";
import "./BulkUpload.scss";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as CloudIcon} from "../icons/cloud-upload.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import Tabs from "../components/Tabs";
import SpinnerField from "../components/redesign/SpinnerField";
import {isEmpty, stopEvent} from "../utils/Utils";
import {parseBulkInvitation} from "../utils/CSVParser";
import bulkInvitationUpload from "../schemas/BulkInvitationUpload.json";
import {ReactComponent as SuccessIcon} from "@surfnet/sds/icons/functional-icons/success.svg";
import {ReactComponent as AlertIcon} from "@surfnet/sds/icons/functional-icons/alert-triangle.svg";
import exampleCVS from '!!raw-loader!../schemas/bulk-import-example.csv';
import JsonFormatter from "react-json-formatter";
import Button from "../components/Button";
import DOMPurify from "dompurify";

const jsonStyle = {
    propertyStyle: {color: "black"},
    stringStyle: {color: "green"},
    numberStyle: {color: 'darkorange'}
}


class BulkUpload extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: false,
            tab: "main",
            errorWrongExtension: false,
            errorFormat: false,
            errors: [],
            csv: null,
            data: [],
            fileName: null,
            tabs: [],
            showDetails: false,
            showSchema: false,
        }
    }

    componentDidMount = () => {
        AppStore.update(s => {
            s.breadcrumb.paths = [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {path: "", value: I18n.t("bulkUpload.breadcrumb")}
            ];
        })
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
                        errorFormat: results.error,
                        errorWrongExtension: false
                    });
                };
                reader.readAsText(file);
            } else {
                this.setState({csv: null, errorWrongExtension: true, fileName: file.name});
            }
        }
    };

    countElements = (data, attribute) => {
        return data.reduce((acc, row) => {
            row[attribute].forEach(attr => acc.add(attr));
            return acc
        }, new Set()).size;
    }

    csvSummary = (data, errorFormat) => {
        return (
            <div className={`summary ${errorFormat ? "errors" : ""}`}>
                {errorFormat ? <AlertIcon/> : <SuccessIcon/>}
                {errorFormat && <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("bulkUpload.errorParsed"))
                }}/>}
                {!errorFormat && <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("bulkUpload.successFullyParsed", {
                        invitees: this.countElements(data, "invitees"),
                        collaborations: this.countElements(data, "short_names"),
                        groups: this.countElements(data, "groups"),
                    }))
                }}/>}
            </div>
        );
    }

    openFileDialog = e => {
        stopEvent(e);
        this.inputFile && setTimeout(() => this.inputFile.click(), 50);
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

    getMainTab = (data, errorWrongExtension, errorFormat, fileName, showDetails, errors) => {
        return (
            <div key="main" name="main" label={I18n.t("bulkUpload.main")}>
                <div className="mod-bulk-upload main">
                    <div
                        className={`sds--file-upload ${(errorWrongExtension || errorFormat) ? "sds--file-upload--status-error" : ""}`}>
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
                               onDrop={this.handleDrop}
                               onDragOver={this.handleDragOver}
                               className="sds--file-upload--message">
                            <span>{I18n.t("bulkUpload.dragDrop")}</span>
                            <a href="/" onClick={this.openFileDialog}>{I18n.t("bulkUpload.click")}</a>
                        </label>
                    </div>
                    {errorWrongExtension &&
                        <p className="error">{I18n.t("bulkUpload.errorWrongExtension", {name: fileName})}</p>}
                    {errorFormat &&
                        <p className="error">{I18n.t("bulkUpload.errorFormat", {name: fileName})}</p>}

                    {(!isEmpty(data) || !isEmpty(errors)) && this.csvSummary(data, errorFormat)}

                    {!isEmpty(data) && <a href="/" onClick={e => {
                        stopEvent(e);
                        this.setState({showDetails: !showDetails});
                    }}>
                        {I18n.t(`bulkUpload.${showDetails ? "hideDetails" : "showDetails"}`)}
                    </a>}
                    {((!isEmpty(data) || !isEmpty(errors)) && showDetails) &&
                        <div className="json-schema">
                            <JsonFormatter json={JSON.stringify(errorFormat ? errors : data)}
                                           tabWith={4}
                                           jsonStyle={jsonStyle}/>
                        </div>}
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
        }, 5);
    }


    getDocsTab = showSchema => {
        return (
            <div key="docs" name="docs" label={I18n.t("bulkUpload.docs")}>
                <div className="mod-bulk-upload docs">
                    <p>{I18n.t("bulkUpload.schema")}</p>
                    <div>
                        <Button onClick={() => this.downloadSample()}
                                small={true}
                                icon={<CloudIcon/>}
                                txt={I18n.t("bulkUpload.download")}
                        />
                    </div>
                    <a href="/" onClick={e => {
                        stopEvent(e);
                        this.setState({showSchema: !showSchema});
                    }}>
                        {I18n.t(`bulkUpload.${showSchema ? "hideSchema" : "showSchema"}`)}
                    </a>
                    {showSchema && <div className="json-schema">
                        <JsonFormatter json={JSON.stringify(bulkInvitationUpload)}
                                       tabWith={4}
                                       jsonStyle={jsonStyle}/>
                    </div>}
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
            loading, tab, data, errorWrongExtension, errorFormat, fileName, showSchema,
            showDetails, errors
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const tabs = [
            this.getMainTab(data, errorWrongExtension, errorFormat, fileName, showDetails, errors),
            this.getDocsTab(showSchema)
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
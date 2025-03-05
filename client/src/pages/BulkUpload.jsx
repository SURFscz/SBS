import React from "react";
import I18n from "../locale/I18n";
import "./BulkUpload.scss";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as CloudIcon} from "../icons/cloud-upload.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import Tabs from "../components/Tabs";
import SpinnerField from "../components/redesign/SpinnerField";
import {isEmpty, stopEvent} from "../utils/Utils";

class BulkUpload extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: false,
            tab: "main",
            error: false,
            csv: null,
            tabs: [],
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
            const reader = new FileReader();
            reader.onload = () => {
                const csv = reader.result.toString();
                this.setState({csv: csv});
            };
            reader.readAsText(file);
        }
    };

    openFileDialog = e => {
        stopEvent(e);
        this.inputFile && setTimeout(() => this.inputFile.click(), 50);
    }

    getMainTab = (csv, error) => {
        return (
            <div key="main" name="main" label={I18n.t("bulkUpload.main")}>
                <div className="mod-bulk-upload main">
                    <div className={`sds--file-upload ${error ? "sds--file-upload--status-error" : ""}`}>
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
                        <label for="fileUpload_csv" className="sds--file-upload--message sds--text--body--small">
                            <span>{I18n.t("bulkUpload.dragDrop")}</span>
                            <a href="/" onClick={this.openFileDialog}>{I18n.t("bulkUpload.click")}</a>
                        </label>
                    {!isEmpty(error) && <p className="sds--file-upload--message">{error}</p>}
                </div>
                {csv && <div>
                    <code>{csv}</code>
                </div>}
            </div>
    </div>
    )
    }

    getDocsTab = () => {
        return (
            <div key="docs" name="docs" label={I18n.t("bulkUpload.docs")}>
                <div className="mod-bulk-upload">
                    TODO DOCS
                </div>
            </div>
        )
    }

    tabChanged = name => {
        this.setState({tab: name}, () =>
            this.props.history.replace(`/bulk-upload/${name}`));
    }

    render() {
        const {loading, tab, csv} = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const tabs = [
            this.getMainTab(csv),
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
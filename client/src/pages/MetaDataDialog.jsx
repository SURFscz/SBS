import React from "react";
import I18n from "../locale/I18n";
import "./MetaDataDialog.scss";
import InputField from "../components/input-field/InputField";
import {Modal} from "@surfnet/sds";

class MetaDataDialog extends React.Component {

    content(samlMetadata) {
        return (
            <div className="metadata-dialog-inner">
                <InputField value={samlMetadata}
                            name={`samlMetadata`}
                            multiline={true}
                            copyClipBoard={true}
                            large={true}
                            cols={10}
                            disabled={true}
                            displayLabel={false}
                />

            </div>)
    }

    render() {
        const {samlMetadata, toggle} = this.props;
        return (
            <Modal
                confirm={toggle}
                full={true}
                children={this.content(samlMetadata)}
                title={I18n.t("serviceRequest.metaData")}
                confirmationButtonLabel={I18n.t("forms.close")}
                className={"metadata-modal"}
            />
        )
    }

}

export default MetaDataDialog;

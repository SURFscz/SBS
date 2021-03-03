import React from "react";
import PropTypes from "prop-types";
import I18n from "i18n-js";
import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";
import "./CroppedImageField.scss";
import {isEmpty} from "../../utils/Utils";
import "react-image-crop/lib/ReactCrop.scss";
import Logo from "./Logo";
import Button from "../Button";
import CroppedImageDialog from "./CroppedImageDialog";
import ConfirmationDialog from "../ConfirmationDialog";
import ErrorIndicator from "./ErrorIndicator";

export default class CroppedImageField extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            dialogOpen: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true
        }
    }

    onInternalChange = (val) => {
        this.setState({dialogOpen: false});
        const {onChange} = this.props;
        setTimeout(() => onChange(val), 425);
    }

    closeDialog = () => this.setState({dialogOpen: false});

    render() {
        const {dialogOpen, confirmationDialogOpen, confirmationDialogAction} = this.state;
        const {title, name, value, secondRow = false, initial = false, disabled = false} = this.props;
        const imageRequired = !initial && isEmpty(value);
        return (
            <div className={`cropped-image-field ${secondRow ? "second-row" : ""}`}>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={() => this.setState({confirmationDialogOpen: false})}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={I18n.t("forms.imageDeleteConfirmation")}/>
                <CroppedImageDialog onSave={this.onInternalChange} onCancel={this.closeDialog} isOpen={dialogOpen}
                                    name={name} value={value} title={title}/>
                <label className="info" htmlFor="">{title}</label>
                <section className="file-upload">
                    {!value && <div className={`no-image ${imageRequired ? "error" : ""}`}>
                        {<NotFoundIcon/>}
                    </div>}
                    {value &&
                    <div className="preview">
                        {value && <Logo className="cropped-img" src={value}/>}
                    </div>}
                    <div className="file-upload-actions">
                        <Button txt={value ? I18n.t("forms.change") : I18n.t("forms.add")}
                                disabled={disabled}
                                onClick={() => this.setState({dialogOpen: true})}/>
                    </div>
                </section>
                {imageRequired && <ErrorIndicator msg={I18n.t("forms.imageRequired")} />}
            </div>
        );
    }

}

CroppedImageField.propTypes = {
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    isNew: PropTypes.bool.isRequired,
    title: PropTypes.string,
    value: PropTypes.string,
    secondRow: PropTypes.bool,
    disabled: PropTypes.bool,
    initial: PropTypes.bool,
};

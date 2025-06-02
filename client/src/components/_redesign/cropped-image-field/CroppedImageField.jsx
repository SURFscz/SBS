import React from "react";
import PropTypes from "prop-types";
import I18n from "../../../locale/I18n";
import {ReactComponent as NotFoundIcon} from "../../../icons/image-not-found.svg";
import "./CroppedImageField.scss";
import {isEmpty} from "../../../utils/Utils";
import "react-image-crop/dist/ReactCrop.css";
import Logo from "../logo/Logo";
import Button from "../../button/Button";
import CroppedImageDialog from "../cropped-image-dialog/CroppedImageDialog";
import ConfirmationDialog from "../../confirmation-dialog/ConfirmationDialog";
import ErrorIndicator from "../error-indicator/ErrorIndicator";

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

    closeDialog = () => {
        this.setState({dialogOpen: false});
    }

    render() {
        const {dialogOpen, confirmationDialogOpen, confirmationDialogAction} = this.state;
        const {title, name, value, isNew, secondRow = false, initial = false, disabled = false, includeLogoGallery = false} = this.props;
        const imageRequired = !initial && isEmpty(value);
        return (
            <div className={`cropped-image-field ${secondRow ? "second-row" : ""}`}>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={() => this.setState({confirmationDialogOpen: false})}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={I18n.t("forms.imageDeleteConfirmation")}/>
                <CroppedImageDialog onSave={this.onInternalChange}
                                    onCancel={this.closeDialog}
                                    isOpen={dialogOpen}
                                    isNew={isNew}
                                    name={name}
                                    value={value}
                                    includeLogoGallery={includeLogoGallery}
                                    title={title}/>
                <label className="info" htmlFor="">{title}<sup className="required">*</sup></label>
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
                                small={true}
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

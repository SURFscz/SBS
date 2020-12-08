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

export default class CroppedImageField extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            error: "",
            dialogOpen: false
        }
    }

    onInternalChange = val => {
        this.setState({dialogOpen: false});
        const {onChange} = this.props;
        setTimeout(() => onChange(val), 425);
    }

    closeDialog = () => this.setState({dialogOpen: false});

    render() {
        const {error, dialogOpen} = this.state;
        const {title, name, value, secondRow = false, initial = false} = this.props;
        return (
            <div className={`cropped-image-field ${secondRow ? "second-row" : ""}`}>
                <CroppedImageDialog onSave={this.onInternalChange} onCancel={this.closeDialog} isOpen={dialogOpen}
                                    name={name} value={value} title={title}/>
                <label className="info" htmlFor="">{title}</label>
                <section className="file-upload">
                    {!value && <div className="no-image">
                        {<NotFoundIcon/>}
                    </div>}
                    {value &&
                    <div className="preview">
                        {value && <Logo className="cropped-img" src={value}/>}
                    </div>}
                    <div className="file-upload-actions">
                        <Button txt={I18n.t("forms.add")} onClick={() => this.setState({dialogOpen: true})}/>
                        {value && <Button warningButton={true} onClick={() => this.onInternalChange(null)}/>}
                    </div>
                </section>
                {!isEmpty(error) && <span className="error">{error}</span>}
                {(!initial && isEmpty(value)) && <span className="error">{I18n.t("forms.imageRequired")}</span>}
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

import React from "react";
import PropTypes from "prop-types";
import I18n from "i18n-js";
import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";
import "./CroppedImageField.scss";
import {isEmpty} from "../../utils/Utils";
import ReactCrop from "react-image-crop";
import "react-image-crop/lib/ReactCrop.scss";
import Logo from "./Logo";

export default class CroppedImageField extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            error: "",
            source: null,
            crop: {},
        }
    }

    internalOnChange = e => {
        const files = e.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 512 * 1000) {
                this.setState({error: I18n.t("forms.imageToLarge")});
            } else {
                const reader = new FileReader();
                reader.onload = evt => {
                    const {onChange} = this.props;
                    const base64 = btoa(evt.target.result);
                    this.setState({source: base64});
                    onChange(base64);
                }
                reader.readAsBinaryString(files[0]);
            }
        }
    }

    // If you setState the crop in here you should return false.
    onImageLoaded = image => {
        this.imageRef = image;
        const width = image.width;
        const height = image.height;
        const aspect = 1;
        const w = width / aspect < height * aspect ? 100 : ((height * aspect) / width) * 100;
        const h = width / aspect > height * aspect ? 100 : (width / aspect / height) * 100;
        const y = (100 - h) / 2;
        const x = (100 - w) / 2;
        this.setState({
            crop: {
                unit: "%",
                width: 100,
                x: Math.round(x),
                y: Math.round(y),
                aspect: aspect
            }
        })
        return false;
    };

    onCropComplete = crop => {
        if (this.imageRef && crop.width && crop.height) {
            const canvas = document.createElement("canvas");
            const image = this.imageRef;
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;
            canvas.width = crop.width;
            canvas.height = crop.height;
            const ctx = canvas.getContext("2d");

            ctx.drawImage(
                image,
                crop.x * scaleX,
                crop.y * scaleY,
                crop.width * scaleX,
                crop.height * scaleY,
                0,
                0,
                crop.width,
                crop.height
            );

            canvas.toBlob(blob => {
                if (!blob) {
                    return;
                }
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64data = reader.result;
                    this.props.onChange(base64data.substring(base64data.indexOf(",") + 1));
                }
            }, "image/jpeg", 1);

        }
    };

    onCropChange = (crop, percentCrop) => this.setState({crop: percentCrop});

    render() {
        const {error, crop, source} = this.state;
        const {title, name, value, secondRow = false, initial = false, isNew} = this.props;

        const src = `data:image/jpeg;base64,${(!isNew && !source) ? value : source}`;
        return (
            <div className={`cropped-image-field ${secondRow ? "second-row" : ""}`}>
                <label className="info" htmlFor="">{title}</label>
                <section className="file-upload">
                    {(!source && isNew) && <div className="no-image">
                        {<NotFoundIcon/>}
                    </div>}
                    {(!isNew || source) && <div className="preview">
                        {source &&
                        <ReactCrop
                            src={src}
                            crop={crop}
                            ruleOfThirds
                            onImageLoaded={this.onImageLoaded}
                            onComplete={this.onCropComplete}
                            onChange={this.onCropChange}
                        />}
                        {source && <Logo className="cropped-img" src={value}/>}
                        {(!source && !isNew) && <img alt="" src={src}/>}
                    </div>}
                    <label className="file-upload-label button" htmlFor={`fileUpload_${name}`}>
                        {I18n.t("forms.upload")}
                    </label>
                    <input type="file"
                           id={`fileUpload_${name}`}
                           name={`fileUpload_${name}`}
                           accept="image/png, image/jpeg, image/jpg"
                           style={{display: "none"}}
                           onChange={this.internalOnChange}/>
                </section>
                <span className="disclaimer">{I18n.t("forms.image")}</span>
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
    initial: PropTypes.bool,
};

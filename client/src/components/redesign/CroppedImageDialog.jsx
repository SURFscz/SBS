import React from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import "./CroppedImageDialog.scss";

import Button from "../Button";
import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";
import {isEmpty} from "../../utils/Utils";
import ReactCrop from "react-image-crop";
import ErrorIndicator from "./ErrorIndicator";

export default class CroppedImageDialog extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            error: "",
            source: null,
            result: null,
            busy: false,
            crop: {},
        }
    }

    internalOnChange = e => {
        const files = e.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 2 * 1024 * 1000) {
                this.setState({error: I18n.t("forms.imageToLarge")});
            } else {
                const reader = new FileReader();
                reader.onload = evt => {
                    const base64 = btoa(evt.target.result);
                    this.imageRef = null;
                    this.setState({source: base64, result: null});
                }
                reader.readAsBinaryString(files[0]);
            }
        }
    }

    // If you setState the crop in here you should return false.
    onImageLoaded = image => {
        this.imageRef = image;
        const ratio = 80 / 58;
        const imageW = image.width;
        const imageH = image.height;
        const imageRatio = imageW / imageH;
        const x = imageRatio <= ratio ? 0 : ((((imageW - (imageH * ratio)) / 2) / imageW) * 100);
        const y = imageRatio >= ratio ? 0 : ((((imageH - (imageW / ratio)) / 2) / imageH) * 100);
        const crop = {
            unit: "%",
            x: Math.round(x),
            y: Math.round(y),
            aspect: ratio
        };
        crop[`${imageRatio <= ratio ? "width" : "height"}`] = 100;
        this.setState({crop});
        return false;
    };

    onSaveInternal = () => {
        this.props.onSave(this.state.result);
    }

    onCropComplete = crop => {
        if (this.imageRef && crop.width && crop.height) {
            this.setState({busy: true});
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
                    this.setState({
                        result: base64data.substring(base64data.indexOf(",") + 1),
                        busy: false
                    });
                }
            }, "image/jpeg", 1);

        }
    };

    onCropChange = (crop, percentCrop) => this.setState({crop: percentCrop});

    renderImages = (error, value, source, crop, onCancel, onSave, name) => {
        const src = `data:image/jpeg;base64,${source || value}`;
        return (
            <div className="cropped-image-dialog-container">
                {(!value && !source) && <div className="no-image">
                    {<NotFoundIcon/>}
                </div>}
                {(source || value) && <div className="preview">
                    <ReactCrop
                        src={src}
                        crop={crop}
                        ruleOfThirds
                        onImageLoaded={this.onImageLoaded}
                        onComplete={this.onCropComplete}
                        onChange={this.onCropChange}
                    />
                </div>}
                {<label className="file-upload-label button" htmlFor={`fileUpload_${name}`}>
                    {I18n.t("forms.upload")}
                </label>}
                {<input type="file"
                        id={`fileUpload_${name}`}
                        name={`fileUpload_${name}`}
                        accept="image/png, image/jpeg, image/jpg"
                        style={{display: "none"}}
                        onChange={this.internalOnChange}/>}
                {(!value && !source) && <span className="disclaimer">{I18n.t("forms.image")}</span>}
                {(value || source) && <span className="disclaimer">{I18n.t("forms.dragImage")}</span>}
                {!isEmpty(error) && <ErrorIndicator msg={error}/>}
            </div>
        );

    }

    onCancelInternal = () => {
        this.props.onCancel();
        setTimeout(() => this.setState({source: null}), 75);
    }

    render() {
        const {onSave, onCancel, isOpen, name, value, title} = this.props;
        const {error, crop, source, busy} = this.state;

        return (
            <Modal
                isOpen={isOpen}
                onRequestClose={this.onCancelInternal}
                contentLabel={I18n.t("imageDialog.label")}
                className="cropped-image-dialog-content"
                overlayClassName="cropped-image-dialog-overlay"
                closeTimeoutMS={250}
                ariaHideApp={false}>
                <h2>{title}</h2>
                {this.renderImages(error, value, source, crop, onCancel, onSave, name)}
                <section className="actions">
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.onCancelInternal}/>
                    <Button txt={I18n.t("forms.save")} disabled={busy || !source}
                            onClick={this.onSaveInternal}/>
                </section>
            </Modal>
        );

    }

}


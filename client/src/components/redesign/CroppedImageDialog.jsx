import React from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import "./CroppedImageDialog.scss";

import Button from "../Button";
import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";
import {isEmpty} from "../../utils/Utils";
import ReactCrop from "react-image-crop";
import ErrorIndicator from "./ErrorIndicator";
import CheckBox from "../CheckBox";
import {sanitizeHtml} from "../../utils/Markdown";
import {srcUrl} from "../../utils/Image";

export default class CroppedImageDialog extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = this.initialState(props)
    }

    initialState = (props = {}) => ({
        error: "",
        source: props.value,
        copy: props.value,
        isSvg: false,
        initialSvg: false,
        result: null,
        busy: false,
        crop: {},
        addWhiteSpace: false
    });

    internalOnChange = e => {
        const files = e.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 2 * 1024 * 1000) {
                this.setState({error: I18n.t("forms.imageToLarge")});
            } else {
                const reader = new FileReader();
                reader.onload = evt => {
                    let data = evt.target.result;
                    const isSvg = data.indexOf("<svg") > -1;
                    if (isSvg) {
                        data = sanitizeHtml(data);
                    }
                    const base64 = btoa(data);
                    this.imageRef = null;
                    this.setState({
                        source: base64,
                        copy: base64,
                        isSvg: isSvg,
                        initialSvg: isSvg,
                        result: null,
                        error: "",
                        addWhiteSpace: false
                    });
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
        this.setState(this.initialState());
    }

    onCropComplete = crop => {
        if (this.imageRef && crop.width && crop.height) {
            this.setState({busy: true});
            const canvas = document.createElement("canvas");
            const image = this.imageRef;
            image.setAttribute('crossOrigin', 'anonymous');
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;
            canvas.width = crop.width;
            canvas.height = crop.height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "rgba(255, 255, 255, .99)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    onWhiteSpace = e => {
        const {source, isSvg, copy, initialSvg} = this.state;
        const {value} = this.props;
        const src = source || value;
        const val = e.target.checked;

        if (!val) {
            this.setState({addWhiteSpace: val, source: copy || value, isSvg: initialSvg});
        } else {
            this.setState({busy: true});
            const image = new Image();
            image.setAttribute('crossOrigin', 'anonymous');
            const type = isSvg ? "svg+xml" : "jpeg";
            image.src = srcUrl(src, type);
            image.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 480;
                canvas.height = 348;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const wrh = image.width / image.height;
                let newWidth = canvas.width;
                let newHeight = newWidth / wrh;
                if (newHeight > canvas.height) {
                    newHeight = canvas.height;
                    newWidth = newHeight * wrh;
                }
                const xOffset = newWidth < canvas.width ? ((canvas.width - newWidth) / 2) : 0;
                const yOffset = newHeight < canvas.height ? ((canvas.height - newHeight) / 2) : 0;

                ctx.drawImage(image, xOffset, yOffset, newWidth, newHeight);

                canvas.toBlob(blob => {
                    if (!blob) {
                        return;
                    }
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const base64data = reader.result;
                        this.setState({
                            source: base64data.substring(base64data.indexOf(",") + 1),
                            busy: false,
                            copy: src,
                            isSvg: false,
                            addWhiteSpace: val
                        });
                    }
                }, "image/jpeg", 1);
            };
        }
    }

    onCropChange = (crop, percentCrop) => this.setState({crop: percentCrop});

    renderImages = (error, src, isSvg, crop, onCancel, onSave, name, addWhiteSpace) => {
        const type = isSvg ? "svg+xml" : "jpeg";
        const img = srcUrl(src, type);
        return (
            <div className="cropped-image-dialog-container">
                {(!src) && <div className="no-image">
                    {<NotFoundIcon/>}
                </div>}
                {src && <div className="preview">
                    <ReactCrop
                        src={img}
                        crop={crop}
                        ruleOfThirds
                        onImageLoaded={this.onImageLoaded}
                        onComplete={this.onCropComplete}
                        onChange={this.onCropChange}
                    />
                </div>}
                {<label className="file-upload-label sds--btn sds--btn--primary"
                        htmlFor={`fileUpload_${name}`}>
                    {I18n.t("forms.upload")}
                </label>}
                {<input type="file"
                        id={`fileUpload_${name}`}
                        name={`fileUpload_${name}`}
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                        style={{display: "none"}}
                        onChange={this.internalOnChange}/>}
                {!src && <span className="disclaimer">{I18n.t("forms.image")}</span>}
                {src && <span className="disclaimer">{I18n.t("forms.dragImage")}</span>}
                {src && <CheckBox name={"add-white-space"}
                                  value={addWhiteSpace}
                                  onChange={this.onWhiteSpace}
                                  info={I18n.t("forms.whiteSpace")}/>
                }
                {!isEmpty(error) && <ErrorIndicator msg={error}/>}
            </div>
        );

    }

    onCancelInternal = () => {
        this.props.onCancel();
        setTimeout(() => this.setState(this.initialState()), 175);
    }

    render() {
        const {onSave, onCancel, isOpen, name, value, title} = this.props;
        const {error, crop, source, isSvg, busy, addWhiteSpace} = this.state;
        const src = source || value;
        return (
            <Modal
                isOpen={isOpen}
                onRequestClose={this.onCancelInternal}
                className="cropped-image-dialog-content"
                overlayClassName="cropped-image-dialog-overlay"
                closeTimeoutMS={0}
                ariaHideApp={false}>
                <h2>{title}</h2>
                {this.renderImages(error, src, isSvg, crop, onCancel, onSave, name, addWhiteSpace)}
                <section className="actions">
                    <Button cancelButton={true}
                            txt={I18n.t("forms.cancel")}
                            onClick={this.onCancelInternal}/>
                    <Button txt={I18n.t("forms.apply")}

                            disabled={busy || !src}
                            onClick={this.onSaveInternal}/>
                </section>
            </Modal>
        );

    }

}


import React from "react";
import I18n from "../../locale/I18n";
import "./CroppedImageDialog.scss";
import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";

import Undraw1 from "../../undraw/undraw_Code_typing_re_p8b9.png";
import Undraw2 from "../../undraw/undraw_Collaborating_re_l43g.png";
import Undraw3 from "../../undraw/undraw_Collaboration_re_vyau.png";
import Undraw4 from "../../undraw/undraw_Collaborators_re_hont.png";
import Undraw5 from "../../undraw/undraw_Data_re_80ws.png";
import Undraw6 from "../../undraw/undraw_Design_feedback_re_8gtk.png";
import Undraw7 from "../../undraw/undraw_Design_team_re_gh2d.png";
import Undraw8 from "../../undraw/undraw_Designer_life_re_6ywf.png";
import Undraw9 from "../../undraw/undraw_File_bundle_re_6q1e.png";
import Undraw10 from "../../undraw/undraw_Good_team_re_hrvm.png";
import Undraw11 from "../../undraw/undraw_Google_docs_re_evm3.png";
import Undraw12 from "../../undraw/undraw_Live_collaboration_re_60ha.png";
import Undraw13 from "../../undraw/undraw_Mobile_wireframe_re_jxui.png";
import Undraw14 from "../../undraw/undraw_Online_collaboration_re_bkpm.png";
import Undraw15 from "../../undraw/undraw_Our_solution_re_8yk6.png";
import Undraw16 from "../../undraw/undraw_Redesign_feedback_re_jvm0.png";
import Undraw17 from "../../undraw/undraw_Remote_design_team_re_urdx.png";
import Undraw18 from "../../undraw/undraw_Remote_team_re_ck1y.png";
import Undraw19 from "../../undraw/undraw_Scrum_board_re_wk7v.png";
import Undraw20 from "../../undraw/undraw_Shared_goals_re_jvqd.png";
import Undraw21 from "../../undraw/undraw_Sharing_articles_re_jnkp.png";
import Undraw22 from "../../undraw/undraw_Team_chat_re_vbq1.png";
import Undraw23 from "../../undraw/undraw_Team_collaboration_re_ow29.png";
import Undraw24 from "../../undraw/undraw_Team_goals_re_4a3t.png";
import Undraw25 from "../../undraw/undraw_Work_time_re_hdyv.png";
import Undraw26 from "../../undraw/undraw_Work_together_re_5yhn.png";
import Undraw27 from "../../undraw/undraw_add_friends_re_3xte.png";
import Undraw28 from "../../undraw/undraw_collab_8oes.png";
import Undraw29 from "../../undraw/undraw_completed_tasks_vs6q.png";
import Undraw30 from "../../undraw/undraw_design_tools_42tf.png";
import Undraw31 from "../../undraw/undraw_develop_app_re_bi4i.png";
import Undraw32 from "../../undraw/undraw_icons_wdp4.png";
import Undraw33 from "../../undraw/undraw_miro_qvwm.png";
import Undraw34 from "../../undraw/undraw_real_time_collaboration_c62i.png";
import Undraw35 from "../../undraw/undraw_teamwork_hpdk.png";
import Undraw36 from "../../undraw/undraw_unDraw_1000_gty8.png";
import {isEmpty, shuffleArray, stopEvent} from "../../utils/Utils";
import ReactCrop, {centerCrop, makeAspectCrop,} from "react-image-crop";
import CheckBox from "../CheckBox";
import {sanitizeHtml} from "../../utils/Markdown";
import {srcUrl} from "../../utils/Image";
import {Modal} from "@surfnet/sds";
import Button from "../Button";

export default class CroppedImageDialog extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = this.initialState(props);
        const images = [
            Undraw1,
            Undraw2,
            Undraw3,
            Undraw4,
            Undraw5,
            Undraw6,
            Undraw7,
            Undraw8,
            Undraw9,
            Undraw10,
            Undraw11,
            Undraw12,
            Undraw13,
            Undraw14,
            Undraw15,
            Undraw16,
            Undraw17,
            Undraw18,
            Undraw19,
            Undraw20,
            Undraw21,
            Undraw22,
            Undraw23,
            Undraw24,
            Undraw25,
            Undraw26,
            Undraw27,
            Undraw28,
            Undraw29,
            Undraw30,
            Undraw31,
            Undraw32,
            Undraw33,
            Undraw34,
            Undraw35,
            Undraw36
        ];
        this.shuffledImages = shuffleArray(images);
    }

    initialState = (props = {}) => ({
        error: "",
        source: props.value,
        copy: props.value,
        isSvg: false,
        initialSvg: false,
        result: null,
        busy: false,
        crop: undefined,
        ratio: 80 / 58,
        addWhiteSpace: false,
        showImageGallery: false,
        galleryIndex: null,
        galleryImage: null
    });

    centerAspectCrop = (mediaWidth, mediaHeight, aspect) => {
        return centerCrop(makeAspectCrop({
            unit: "%",
            width: 100
        }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight)
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
                        crop: undefined,
                        addWhiteSpace: false
                    });
                }
                reader.readAsBinaryString(files[0]);
            }
        }
    }

    // If you setState the crop in here you should return false.
    onImageLoaded = event => {
        const image = event.target;
        this.imageRef = image;
        const {width, height} = image;
        const {ratio} = this.state;
        const crop = this.centerAspectCrop(width, height, ratio);
        this.setState({crop: crop});
    };

    onSaveInternal = () => {
        const {result, showImageGallery, galleryImage} = this.state;
        if (showImageGallery && galleryImage) {
            this.setState({
                source: galleryImage,
                copy: galleryImage,
                isSvg: false,
                initialSvg: false,
                result: null,
                error: "",
                crop: undefined,
                addWhiteSpace: false,
                showImageGallery: false,
                galleryIndex: null
            })
        } else {
            this.props.onSave(result);
            this.setState(this.initialState());
        }
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
            this.setState({addWhiteSpace: val, source: copy || value, result: copy || value, isSvg: initialSvg});
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
                        const newSource = base64data.substring(base64data.indexOf(",") + 1);
                        this.setState({
                            source: newSource,
                            result: newSource,
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

    selectFromGallery = e => {
        stopEvent(e);
        this.setState({
            showImageGallery: !this.state.showImageGallery,
            galleryIndex: null,
            galleryImage: null
        });
    }

    onCropChange = (crop, percentCrop) => {
        this.setState({crop: percentCrop});
    }

    renderGallery = (galleryIndex) => {
        return (
            <div className={"cropped-image-dialog-container"}>
                <div className={"image-gallery-container"}>
                    <div className={"image-gallery"}>
                        {this.shuffledImages.map((image, index) =>
                            <img key={index}
                                 src={image}
                                 className={`${galleryIndex === index ? "selected" : ""}`}
                                 onClick={e => {
                                     fetch(e.target.src).then(res => {
                                         res.blob().then(content => {
                                             const reader = new FileReader();
                                             reader.onload = ({target: {result}}) => {
                                                 this.setState({
                                                     galleryImage: result.substring(result.indexOf(",") + 1)
                                                 });
                                             };
                                             reader.readAsDataURL(content);
                                         })
                                     });
                                     this.setState({galleryIndex: index});
                                 }}
                                 alt="Logo"/>)}
                    </div>
                </div>
                <div className={"button-container"}>
                    <Button txt={I18n.t("gallery.upload")}
                            onClick={e => {
                                this.inputFile && setTimeout(() => this.inputFile.click(), 250) ;
                                this.selectFromGallery(e);
                            }}
                            className={"tertiary"}
                    />
                </div>
            </div>
        );
    }

    renderImages = (error, src, isSvg, crop, ratio, onCancel, onSave, name, addWhiteSpace, includeLogoGallery) => {
        const type = isSvg ? "svg+xml" : "jpeg";
        const img = srcUrl(src, type);
        return (
            <div className={"cropped-image-dialog-container"}>
                <div className={`cropped-image-dialog ${includeLogoGallery ? "large" : ""}`}>
                    {(!src) && <div className="no-image">
                        {<NotFoundIcon/>}
                    </div>}
                    {src && <div className="preview">
                        <ReactCrop crop={crop}
                                   ruleOfThirds={true}
                                   aspect={ratio}
                                   onComplete={this.onCropComplete}
                                   onChange={this.onCropChange}>
                            <img alt="Crop me"
                                 src={img}
                                 ref={ref => this.imageRef = ref}
                                 onLoad={this.onImageLoaded}/>
                        </ReactCrop>
                    </div>}
                    <div className={`sds--file-upload ${error ? "sds--file-upload--status-error" : ""}`}>
                        <input id={`fileUpload_${name}`}
                               type="file"
                               ref={ref => {
                                   if (!isEmpty(ref)) {
                                       this.inputFile = ref;
                                   }
                               }}
                               name={`fileUpload_${name}`}
                               accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                               onChange={this.internalOnChange}/>
                        {(isEmpty(error) && !src) && <p className="sds--file-upload--message sds--text--body--small">
                            {I18n.t("forms.image")}
                        </p>}
                        {(isEmpty(error) && src) && <p className="sds--file-upload--message sds--text--body--small">
                            {I18n.t("forms.dragImage")}
                        </p>}
                        {!isEmpty(error) && <p className="sds--file-upload--message">{error}</p>}
                    </div>
                    {src && <CheckBox name={"add-white-space"}
                                      value={addWhiteSpace}
                                      onChange={this.onWhiteSpace}
                                      info={I18n.t("forms.whiteSpace")}/>
                    }
                </div>
                {includeLogoGallery &&
                <div className={"button-container"}>
                    <Button txt={I18n.t("gallery.select")}
                            onClick={this.selectFromGallery}
                            className={"tertiary"}
                    />
                </div>}
            </div>
        );
    }

    onCancelInternal = () => {
        this.props.onCancel();
        setTimeout(() => this.setState(this.initialState()), 175);
    }

    render() {
        const {onSave, onCancel, isOpen, name, value, title, includeLogoGallery} = this.props;
        const {
            error,
            crop,
            source,
            isSvg,
            busy,
            addWhiteSpace,
            ratio,
            showImageGallery,
            galleryIndex,
            galleryImage
        } = this.state;
        const src = source || value;
        if (!isOpen) {
            return null;
        }
        return (
            <Modal
                confirm={this.onSaveInternal}
                cancel={this.onCancelInternal}
                children={showImageGallery ? this.renderGallery(galleryIndex) :
                    this.renderImages(error, src, isSvg, crop, ratio, onCancel, onSave, name, addWhiteSpace, includeLogoGallery)
                }
                title={title}
                cancelButtonLabel={I18n.t("forms.cancel")}
                confirmationButtonLabel={I18n.t("forms.apply")}
                confirmDisabled={showImageGallery ? !galleryImage : (busy || !src)}
            />
        );

    }

}


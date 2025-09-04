import React from "react";
import I18n from "../../../locale/I18n";
import "./CroppedImageDialog.scss";
import {ReactComponent as NotFoundIcon} from "../../../icons/image-not-found.svg";
import {detect} from "detect-browser";
import Undraw1 from "../../../undraw/undraw_Adventure_re_ncqp.png";
import Undraw2 from "../../../undraw/undraw_Aircraft_re_m05i.png";
import Undraw3 from "../../../undraw/undraw_Alien_science_re_0f8q.png";
import Undraw4 from "../../../undraw/undraw_Chat_bot_re_e2gj.png";
import Undraw5 from "../../../undraw/undraw_Code_typing_re_p8b9.png";
import Undraw6 from "../../../undraw/undraw_Collaboration_re_vyau.png";
import Undraw7 from "../../../undraw/undraw_Collaborators_re_hont.png";
import Undraw8 from "../../../undraw/undraw_Data_re_80ws.png";
import Undraw9 from "../../../undraw/undraw_Data_report_re_p4so.png";
import Undraw10 from "../../../undraw/undraw_Decide_re_ixfw.png";
import Undraw11 from "../../../undraw/undraw_Design_team_re_gh2d.png";
import Undraw12 from "../../../undraw/undraw_Doctors_p6aq.png";
import Undraw13 from "../../../undraw/undraw_Engineering_team_a7n2.png";
import Undraw14 from "../../../undraw/undraw_Envelope_re_f5j4.png";
import Undraw15 from "../../../undraw/undraw_Environmental_study_re_q4q8.png";
import Undraw16 from "../../../undraw/undraw_File_bundle_re_6q1e.png";
import Undraw17 from "../../../undraw/undraw_File_sync_re_0pcx.png";
import Undraw18 from "../../../undraw/undraw_Firmware_re_fgdy.png";
import Undraw19 from "../../../undraw/undraw_Good_team_re_hrvm.png";
import Undraw20 from "../../../undraw/undraw_Live_collaboration_re_60ha.png";
import Undraw21 from "../../../undraw/undraw_Location_search_re_ttoj.png";
import Undraw22 from "../../../undraw/undraw_My_universe_803e.png";
import Undraw23 from "../../../undraw/undraw_Not_found_re_bh2e.png";
import Undraw24 from "../../../undraw/undraw_Notebook_re_id0r.png";
import Undraw25 from "../../../undraw/undraw_Online_collaboration_re_bkpm.png";
import Undraw26 from "../../../undraw/undraw_People_search_re_5rre.png";
import Undraw27 from "../../../undraw/undraw_Project_feedback_re_cm3l.png";
import Undraw28 from "../../../undraw/undraw_Remote_design_team_re_urdx.png";
import Undraw29 from "../../../undraw/undraw_Remote_team_re_ck1y.png";
import Undraw30 from "../../../undraw/undraw_Science_re_mnnr.png";
import Undraw31 from "../../../undraw/undraw_Scientist_ft0o.png";
import Undraw32 from "../../../undraw/undraw_Scrum_board_re_wk7v.png";
import Undraw33 from "../../../undraw/undraw_Secure_server_re_8wsq.png";
import Undraw34 from "../../../undraw/undraw_Server_status_re_n8ln.png";
import Undraw35 from "../../../undraw/undraw_Share_link_re_54rx.png";
import Undraw36 from "../../../undraw/undraw_Shared_goals_re_jvqd.png";
import Undraw37 from "../../../undraw/undraw_Shared_workspace_re_3gsu.png";
import Undraw38 from "../../../undraw/undraw_Sharing_articles_re_jnkp.png";
import Undraw39 from "../../../undraw/undraw_Speech_to_text_re_8mtf.png";
import Undraw40 from "../../../undraw/undraw_Taken_re_yn20.png";
import Undraw41 from "../../../undraw/undraw_Teaching_re_g7e3.png";
import Undraw42 from "../../../undraw/undraw_Team_chat_re_vbq1.png";
import Undraw43 from "../../../undraw/undraw_Team_collaboration_re_ow29.png";
import Undraw44 from "../../../undraw/undraw_Team_goals_re_4a3t.png";
import Undraw45 from "../../../undraw/undraw_Team_re_0bfe.png";
import Undraw46 from "../../../undraw/undraw_Web_search_re_efla.png";
import Undraw47 from "../../../undraw/undraw_World_re_768g.png";
import Undraw48 from "../../../undraw/undraw_completed_tasks_vs6q.png";
import Undraw49 from "../../../undraw/undraw_connected_world_wuay.png";
import Undraw50 from "../../../undraw/undraw_creative_experiment_8dk3.png";
import Undraw51 from "../../../undraw/undraw_data_processing_yrrv.png";
import Undraw52 from "../../../undraw/undraw_environment_iaus.png";
import Undraw53 from "../../../undraw/undraw_medical_research_qg4d.png";
import Undraw54 from "../../../undraw/undraw_nature_m5ll.png";
import Undraw55 from "../../../undraw/undraw_real_time_collaboration_c62i.png";
import Undraw56 from "../../../undraw/undraw_server_cluster_jwwq.png";
import Undraw57 from "../../../undraw/undraw_sharing_knowledge_03vp.png";
import Undraw58 from "../../../undraw/undraw_stars_re_6je7.png";
import Undraw59 from "../../../undraw/undraw_teamwork_hpdk.png";
import Undraw60 from "../../../undraw/undraw_two_factor_authentication_namy.png";
import Undraw61 from "../../../undraw/undraw_video_upload_3d4u.png";
import Undraw62 from "../../../undraw/undraw_visual_data_re_mxxo.png";

import {isEmpty, shuffleArray, stopEvent} from "../../../utils/Utils";
import ReactCrop, {centerCrop, makeAspectCrop,} from "react-image-crop";
import CheckBox from "../../checkbox/CheckBox";
import {sanitizeHtml} from "../../../utils/Markdown";
import {srcUrl} from "../../../utils/Image";
import {Modal} from "@surfnet/sds";
import Button from "../../button/Button";

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
            Undraw36,
            Undraw37,
            Undraw38,
            Undraw39,
            Undraw40,
            Undraw41,
            Undraw42,
            Undraw43,
            Undraw44,
            Undraw45,
            Undraw46,
            Undraw47,
            Undraw48,
            Undraw49,
            Undraw50,
            Undraw51,
            Undraw52,
            Undraw53,
            Undraw54,
            Undraw55,
            Undraw56,
            Undraw57,
            Undraw58,
            Undraw59,
            Undraw60,
            Undraw61,
            Undraw62,];
        this.shuffledImages = shuffleArray(images);
        this.browser = detect();
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
        galleryImage: null,
        croppedOnce: false
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
            if (file.size > 60 * 1000) {
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
                galleryIndex: null,
                croppedOnce: false
            })
        } else {

            this.props.onSave(result);
            this.setState(this.initialState());
        }
    }

    onCropComplete = (crop) => {
        const {croppedOnce} = this.state;
        if (!croppedOnce && this.browser.name === "safari") {
            this.setState({croppedOnce: true},
                () => setTimeout(() => this.onCropComplete(crop), 750))

        }
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

    loadGalleryImage = (e, index) => {
        fetch(e.target.src).then(res => {
            res.blob().then(content => {
                const reader = new FileReader();
                reader.onload = ({target: {result}}) => {
                    this.setState({
                        galleryImage: result.substring(result.indexOf(",") + 1)
                    }, () => {
                        if (e.detail === 2) {
                            this.onSaveInternal();
                        }
                    });

                };
                reader.readAsDataURL(content);
            })
        });
        this.setState({galleryIndex: index});
    }

    renderGallery = galleryIndex => {
        return (
            <div className={"cropped-image-dialog-container"}>
                <div className={"image-gallery-container"}>
                    <div className={"image-gallery"}>
                        {this.shuffledImages.map((image, index) =>
                            <img key={index}
                                 src={image}
                                 className={`${galleryIndex === index ? "selected" : ""}`}
                                 onClick={e => this.loadGalleryImage(e, index)}
                                 alt="Logo"/>)}
                    </div>
                </div>
                <div className={"button-container"}>
                    <Button txt={I18n.t("gallery.upload")}
                            onClick={e => {
                                this.inputFile && setTimeout(() => this.inputFile.click(), 250);
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
                    {!src && <div className="no-image">
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

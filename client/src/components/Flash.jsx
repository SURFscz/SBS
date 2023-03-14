import React from "react";
import {emitter} from "../utils/Events";
import {clearFlash, getFlash} from "../utils/Flash";
import {isEmpty} from "../utils/Utils";
import "./Flash.scss";
import {Alert, AlertType, Toaster, ToasterContainer, ToasterType} from "@surfnet/sds";

export default class Flash extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            flash: {},
            className: "hide",
            type: "info"
        };
        this.callback = flash => {
            this.setState({flash: flash, className: isEmpty(flash) || isEmpty(flash.message) ? "hide" : ""});
            if ((flash && flash.message) && (!flash.type || flash.type === "info")) {
                setTimeout(() => this.setState({className: "hide", flash: {}}), 2225000);
            }
        };
    }

    componentDidMount() {
        this.setState({flash: getFlash()});
        emitter.addListener("flash", this.callback);
    }

    componentWillUnmount() {
        emitter.removeListener("flash", this.callback);
    }

    render() {
        const {flash, className} = this.state;
        if (flash.type === "error" || flash.type === "warning") {
            return (
                <Alert message={flash.message}
                       alertType={flash.type === "warning" ? AlertType.Warning : AlertType.Error}
                       hide={className === "hide"}
                       close={clearFlash}/>
            );
        }
        if (flash.message) {
            return (
                <ToasterContainer>
                    <Toaster message={flash.message}
                             toasterType={ToasterType.Success}/>
                </ToasterContainer>);
        }
        return null;
        // return (
        //     <div className={`flash ${className} ${flash.type}`}>
        //         <div className="message-container">
        //             {messages.map((message, index) => <p key={index}>{message}</p>)}
        //         </div>
        //         <a className="close" href="/close" onClick={clearFlash}>
        //             <FontAwesomeIcon icon="times"/>
        //         </a>
        //     </div>
        // );
    }
}

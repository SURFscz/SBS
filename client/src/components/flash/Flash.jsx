import React from "react";
import {emitter} from "../../utils/Events";
import {clearFlash, getFlash} from "../../utils/Flash";
import {isEmpty} from "../../utils/Utils";
import "./Flash.scss";
import {Alert, AlertType, Toaster, ToasterContainer, ToasterType} from "@surfnet/sds";

export default class Flash extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            flash: {},
            type: "info"
        };
        this.callback = flash => {
            this.setState({flash: flash});
            if ((flash && flash.message) && (!flash.type || flash.type === "info")) {
                setTimeout(() => this.setState({flash: {}}), flash.duration === 42 ? 18500 : 5000);
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

    close = () => this.setState({flash: {}})

    render() {
        const {flash} = this.state;
        if (!isEmpty(flash) && (flash.type === "error" || flash.type === "warning")) {
            return (
                <Alert message={flash.message}
                       action={flash.action}
                       actionLabel={flash.actionLabel}
                       alertType={flash.type === "warning" ? AlertType.Warning : AlertType.Error}
                       close={clearFlash}/>
            );
        }
        if (!isEmpty(flash) && !isEmpty(flash.message)) {
            return (
                <ToasterContainer>
                    <Toaster message={flash.message}
                             toasterType={ToasterType.Success}
                             close={flash.duration === 42 ? this.close : null}/>
                </ToasterContainer>);
        }
        return null;
    }
}

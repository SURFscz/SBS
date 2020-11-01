import React from "react";
import I18n from "i18n-js";
import {Link} from "react-router-dom";
import {ReactComponent as Logo} from "../images/logo-surf-white.svg";
import "./Header.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import UserMenu from "./redesign/UserMenu";
import {globalUserRole} from "../utils/UserRole";
import spinner from "../utils/Spin";
import MDSpinner from "react-md-spinner";

export default class Header extends React.PureComponent {

    constructor() {
        super();
        this.state = {
            dropDownActive: false,
            loading: false
        };
    }

    componentDidMount() {
        spinner.onStart = () => this.setState({loading: true});
        spinner.onStop = () => this.setState({loading: false});
    }

    renderSpinner = () =>
        this.state.loading ? <div className="spinner">
            <MDSpinner size={24}
                       singleColor={"#433902"}
                       duration={1000}
                       borderSize={4}/>
        </div> : null;

    renderProfileLink(currentUser) {
        return (
            <div className="menu" onClick={() => this.setState({dropDownActive: !this.state.dropDownActive})}>
                <div className="user">
                    <span>{currentUser.name}</span>
                    <span className="role">{globalUserRole(currentUser)}</span>
                </div>
                {this.renderDropDownIndicator()}
            </div>
        );
    }

    renderDropDownIndicator = () => this.state.dropDownActive ? <FontAwesomeIcon icon="angle-up"/> :
        <FontAwesomeIcon icon="angle-down"/>;


    render() {
        const {currentUser} = this.props;
        const {dropDownActive} = this.state;
        return (
            <div className="header-container">
                <div className="header">
                    <Link className="logo" to="/"><Logo/></Link>

                    <h1 className="title">{I18n.t("header.title")}</h1>
                    {this.renderSpinner()}
                    {!currentUser.guest && <div className="user-profile">
                        {this.renderProfileLink(currentUser)}
                        {dropDownActive &&
                        <UserMenu currentUser={currentUser} close={() => this.setState({dropDownActive: false})}/>}
                    </div>}
                </div>
            </div>
        );
    }
}

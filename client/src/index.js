import "@babel/polyfill";
import {polyfill} from "es6-promise";
import "isomorphic-fetch";
import React from 'react';
import ReactDOM from 'react-dom';
import './stylesheets/index.scss';
import App from './pages/App';
import {getParameterByName} from "./utils/QueryParameters";
import {isEmpty} from "./utils/Utils";
import moment from "moment-timezone";
import I18n from "i18n-js";
import Cookies from "js-cookie";
import "./locale/en";
import "./locale/nl";

polyfill();

(() => {
    // DetermineLanguage based on parameter, cookie and finally navigator
    let parameterByName = getParameterByName("lang", window.location.search);

    if (isEmpty(parameterByName)) {
        parameterByName = Cookies.get("lang");
    }

    if (isEmpty(parameterByName)) {
        parameterByName = navigator.language.toLowerCase().substring(0, 2);
    }

    I18n.locale = parameterByName || "en";
    moment.locale(I18n.locale);

})();
ReactDOM.render(<App/>, document.getElementById("app"));
import "core-js/stable";
import "regenerator-runtime/runtime";
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
import {reportError} from "./api";

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
    if (["nl", "en"].indexOf(parameterByName) === -1) {
        parameterByName = "en";
    }
    I18n.locale = parameterByName;
    const oldMissingTranslation = I18n.missingTranslation.bind(I18n);
    I18n.missingTranslation = (scope, options) => {
        const res = oldMissingTranslation(scope, options);
        reportError({"Missing translation": res});
        return res;
    };
    moment.locale(I18n.locale);

})();
ReactDOM.render(<App/>, document.getElementById("app"));
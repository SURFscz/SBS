import "core-js/stable";
import "regenerator-runtime/runtime";
import {polyfill} from "es6-promise";
import React from 'react';
import "react-tooltip/dist/react-tooltip.css";
import './stylesheets/index.scss';
import App from './pages/App';
import moment from "moment-timezone";
import 'moment/locale/nl';
import 'moment/locale/en-gb';
import I18n from "./locale/I18n";
import "./locale/en";
import "./locale/nl";
import {createRoot} from 'react-dom/client';
import '@surfnet/sds/styles/sds.css';
//Do not change the order of @surfnet.sds style imports
import '@surfnet/sds/cjs/index.css';

polyfill();

(() => {
    moment.locale(I18n.locale);
})();

const container = document.getElementById("app");
const root = createRoot(container);
root.render(<App/>);

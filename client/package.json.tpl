{
    "name": "client",
    "version": "0.1.0",
    "private": true,
    "dependencies": {
        "@babel/plugin-proposal-private-property-in-object": "^7.21.11",
        "@fortawesome/fontawesome-svg-core": "^6.6.0",
        "@fortawesome/free-solid-svg-icons": "^6.6.0",
        "@fortawesome/react-fontawesome": "^0.2.2",
        "@surfnet/sds": "^0.0.111",
        "core-js": "^3.38.0",
        "detect-browser": "^5.3.0",
        "dompurify": "^3.1.6",
        "es6-promise": "^4.2.8",
        "events": "^3.2.0",
        "i18n-js": "^4.4.3",
        "immer": "^10.1.1",
        "isomorphic-dompurify": "^2.14.0",
        "js-cookie": "^3.0.1",
        "jsondiffpatch": "^0.5.0",
        "lodash.clonedeep": "^4.5.0",
        "lodash.debounce": "^4.0.8",
        "lodash.escape": "^4.0.1",
        "moment": "^2.30.1",
        "moment-timezone": "^0.5.45",
        "prop-types": "^15.6.2",
        "pullstate": "^1.23.0",
        "react": "^18.3.1",
        "react-copy-to-clipboard": "^5.0.1",
        "react-datepicker": "^7.3.0",
        "react-dom": "^18.3.1",
        "react-image-crop": "^10.1.8",
        "react-json-formatter": "^0.4.0",
        "react-json-view": "^1.21.3",
        "react-md-spinner": "^1.0.0",
        "react-mde": "^11.0.0",
        "react-router-dom": "^5.2.0",
        "react-select": "^5.8.0",
        "react-tooltip": "5.28.0",
        "recharts": "^2.12.6",
        "scroll-into-view": "^1.15.0",
        "serialize-javascript": "^6.0.2",
        "showdown": "^2.1.0",
        "socket.io-client": "^4.7.5",
        "source-map-explorer": "^2.5.0",
        "timeago.js": "^4.0.2"
    },
    "devDependencies": {
        "dot-prop": "^9.0.0",
        "eslint-plugin-risxss": "^2.1.0",
        "http-proxy-middleware": "^3.0.0",
        "react-scripts": "^5.0.1",
        "sass": "^1.77.8"
    },
    "resolutions": {
        "minimatch": "^9.0.4",
        "tough-cookie": "4.1.4",
        "ws": "^8.17.1"
    },
    "scripts": {
        "start": "DANGEROUSLY_DISABLE_HOST_CHECK=true GENERATE_SOURCEMAP=false HOST=0 react-scripts start",
        "build": "DANGEROUSLY_DISABLE_HOST_CHECK=true GENERATE_SOURCEMAP=true react-scripts build",
        "test": "DANGEROUSLY_DISABLE_HOST_CHECK=true GENERATE_SOURCEMAP=false react-scripts test --transformIgnorePatterns 'node_modules/(?!i18n-js)/'",
        "analyze": "source-map-explorer build/static/js/main.*.js "
    },
    "proxy": "http://${SBS_SERVER}:8080/",
    "eslintConfig": {
        "extends": "react-app"
    },
    "browserslist": [
        ">0.2%",
        "not dead",
        "not ie <= 11",
        "not op_mini all"
    ]
}

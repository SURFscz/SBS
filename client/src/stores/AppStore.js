import {Store} from "pullstate";

export const AppStore = new Store({
    breadcrumb: {
        //{path: "/organisation/4", value: org.name}
        paths: [],
    },
    sideComponent: null
});

let csrfToken = null;

export const getCsrfToken = () => csrfToken;
export const setCsrfToken = newCsrfToken => csrfToken = newCsrfToken;
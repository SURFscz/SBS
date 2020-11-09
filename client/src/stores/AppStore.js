import {Store} from "pullstate";

export const AppStore = new Store({
    breadcrumb: {
        //{path: "/organisation/4", value: org.name}
        paths: [],
    },
    sideComponent: null
});
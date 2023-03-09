import {Store} from "pullstate";

export const AppStore = new Store({
    breadcrumb: {
        paths: [
            //{path: "/organisation/4", value: org.name}
        ],
    },
    objectRole: null,
    actions: [
        //{name: I18n.t("home.edit"), perform: () => this.props.history.push("/edit-collaboration/" + collaboration.id)
    ]
});



let csrfToken = null;

export const getCsrfToken = () => csrfToken;
export const setCsrfToken = newCsrfToken => csrfToken = newCsrfToken;
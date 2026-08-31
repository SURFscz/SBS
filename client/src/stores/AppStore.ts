import {Store} from "pullstate";

export type BreadcrumbPath = {
    path?: string | null;
    value: string;
};

export type AppStoreAction = {
    name: string;
    perform: () => void;
};

export type AppStoreState = {
    breadcrumb: {paths: BreadcrumbPath[]};
    objectRole: string | null;
    actions: AppStoreAction[];
};

const initialState: AppStoreState = {
    breadcrumb: {
        paths: [
            //{path: "/organisation/4", value: org.name}
        ]
    },
    objectRole: null,
    actions: [
        //{name: I18n.t("home.edit"), perform: () => this.props.history.push("/edit-collaboration/" + collaboration.id)
    ]
};

export const AppStore = new Store(initialState);

let csrfToken: string | null = null;

export const getCsrfToken = (): string | null => csrfToken;
export const setCsrfToken = (newCsrfToken: string | null): void => {
    csrfToken = newCsrfToken;
};

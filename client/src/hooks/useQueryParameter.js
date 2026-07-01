import { useHistory, useLocation } from "react-router-dom";

export const useQueryParameter = key => {
    const history = useHistory();
    const { search, pathname } = useLocation();

    const query = new URLSearchParams(search);
    const value = query.get(key);

    const setValue = (newValue) => {
        const params = new URLSearchParams(search);
        params.set(key, newValue);

        history.replace({
            pathname: pathname,
            search: params.toString(),
        });
    };

    return [value, setValue];
};

export const useQueryParameterList = key => {
    const history = useHistory();
    const { search, pathname } = useLocation();

    const query = new URLSearchParams(search);
    const raw = query.get(key);
    const value = raw ? raw.split(",").filter(Boolean) : [];

    const setValue = (newValues) => {
        const params = new URLSearchParams(search);
        if (newValues.length === 0) {
            params.delete(key);
        } else {
            params.set(key, newValues.join(","));
        }

        history.replace({
            pathname: pathname,
            search: params.toString(),
        });
    };

    return [value, setValue];
};

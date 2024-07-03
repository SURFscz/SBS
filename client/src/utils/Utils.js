import moment from "moment";
import escape from "lodash.escape";
import I18n from "../locale/I18n";

export function stopEvent(e) {
    if (e !== undefined && e !== null) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    return true;
}

export function isEmpty(obj) {
    if (obj === undefined || obj === null) {
        return true;
    }
    if (Array.isArray(obj)) {
        return obj.length === 0;
    }
    if (typeof obj === "string") {
        return obj.trim().length === 0;
    }
    if (obj && obj.getTime) {
        return obj.getTime() !== obj.getTime();
    }
    if (typeof obj === "object") {
        return Object.keys(obj).length === 0;
    }
    return false;
}

export function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
        (acc[item[key]] = acc[item[key]] || []).push(item);
        return acc;
    }, {});
}

export function sortObjects(objects, attribute, reverse, customSort = null) {
    //Check if the column has a custom sort function
    if (!isEmpty(customSort) && typeof customSort === "function") {
        return [...objects].sort((a, b) => customSort(a, b, reverse));
    }
    return [...objects].sort((a, b) => {
        const val1 = valueForSort(attribute, a);
        const val2 = valueForSort(attribute, b);
        if (typeof val1 === "number" && typeof val2 === "number") {
            return (val1 - val2) * (reverse ? -1 : 1);
        }
        const aS = val1.toString();
        const bS = val2.toString();
        if (aS.length === 0) {
            return (reverse ? -1 : 1);
        }
        if (bS.length === 0) {
            return (reverse ? 1 : -1);
        }
        return aS.localeCompare(bS) * (reverse ? -1 : 1);
    });
}

export function valueForSort(attribute, obj) {
    if (attribute.endsWith("_date")) {
        return obj[attribute] || Number.MAX_SAFE_INTEGER;
    }
    if (attribute === "requestType") {
        return I18n.t(`myRequests.types.${obj.requestType}`)
    }
    const val = obj[attribute];
    if (moment.isMoment(val)) {
        return val.unix();
    }
    if (!isEmpty(val)) {
        return val;
    }
    const parts = attribute.replace(/__/g, ".").split(".");
    const res = parts.reduce((acc, e) => {
        if (isEmpty(acc)) {
            return "";
        }
        return acc[e];
    }, obj);
    return res || "";

}

export function pseudoGuid() {
    return (crypto.randomUUID && typeof crypto.randomUUID === "function" && crypto.randomUUID()) ||
        Math.round((new Date().getTime() * Math.random() * 1000)).toString()
}

export function escapeDeep(obj) {
    if (!isEmpty(obj)) {
        Object.keys(obj).forEach(key => {
            const val = obj[key];
            if (typeof (val) === "string" || val instanceof String) {
                obj[key] = escape(val);
            } else if (typeof (val) === "object" || val instanceof Object) {
                escapeDeep(val);
            }
        });

    }
}

export const removeDuplicates = (arr, attr) => arr
    .filter((obj, pos, arr) => arr.map(mapObj => mapObj[attr]).indexOf(obj[attr]) === pos);

export const ErrorOrigins = {
    invitationNotFound: "invitationNotFound",
    invalidSecondFactorUUID: "invalidSecondFactorUUID",
    invalidPamWebSSO: "invalidPamWebSSO"
}

export const splitListSemantically = (arr, lastSeparator) => {
    return [arr.slice(0, -1).join(", "), arr.slice(-1)[0]].join(arr.length < 2 ? "" : ` ${lastSeparator} `);
}

export const shuffleArray = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return [...arr];
}

export const capitalize = str => {
    return isEmpty(str) ? str : (str.charAt(0).toUpperCase() + str.slice(1));
}

export const statusCustomSort = (o1, o2, reverse) => {
    const comparison = o1.status === "open" ? -1 : o2.status === "open" ? 1 : o1.status.localeCompare(o2.status);
    return reverse ? comparison * -1 : comparison;
};

export const userColumnsCustomSort = (o1, o2, reverse) => {
    let comparison;
    if (o1.invite && !o2.invite) {
        comparison = 1;
    } else if (!o1.invite && o2.invite) {
        comparison = -1;
    } else if (o1.invite && o2.invite) {
        comparison = o1.invitee_email.localeCompare(o2.invitee_email);
    } else if (!o1.invite && !o2.invite) {
        comparison = (o1.user || {name: ""}).name.localeCompare((o2.user || {name: ""}).name);
    }
    return reverse ? comparison * -1 : comparison;

}

export const expiryDateCustomSort = (o1, o2, reverse) => {
    let comparison;
    if (o1.invite && !o2.invite) {
        comparison = 1;
    } else if (!o1.invite && o2.invite) {
        comparison = -1;
    } else if (o1.invite && o2.invite) {
        comparison = (o1.expiry_date || 0) - (o2.expiry_date || 0);
    } else if (!o1.invite && !o2.invite && o1.organisation_id && o2.organisation_id) {
        comparison = 0;
    } else if (!o1.invite && !o2.invite) {
        comparison = (o1.expiry_date || 0) - (o2.expiry_date || 0);
    }
    return reverse ? comparison * -1 : comparison;

}

export const joinSelectValuesArray = arr => {
    return isEmpty(arr) ? null : Array.isArray(arr) ? arr.map(option => option.value).join(",") : arr;
}

export const commaSeparatedArrayToSelectValues = str => {
    return isEmpty(str) ? [] : Array.isArray(str) ? str : str.split ? str.split(",").map(s => ({value: s.trim(), label: s.trim()})) : str;
}


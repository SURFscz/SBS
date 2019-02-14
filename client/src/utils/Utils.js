import moment from "moment";
import escape from "lodash.escape";

export function stopEvent(e) {
    if (e !== undefined && e !== null) {
        e.preventDefault();
        e.stopPropagation();
    }
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

export function sortObjects(objects, attribute, reverse) {
    return [...objects].sort((a, b) => {
        const aS = valueForSort(attribute, a).toString();
        const bs = valueForSort(attribute, b).toString();
        return aS.localeCompare(bs) * (reverse ? -1 : 1);
    });
}

export function valueForSort(attribute, obj) {
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

export function escapeHtmlTooltip(msg) {
    msg = escape(msg);
    msg = msg.replace(/\n/g, "<br/>");
    return msg;
}

const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);

export function pseudoGuid() {
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}


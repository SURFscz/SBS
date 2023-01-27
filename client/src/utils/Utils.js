import moment from "moment";
import escape from "lodash.escape";

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
    msg = msg.replace(/%20/g, " ");
    return msg;
}

const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);

export function pseudoGuid() {
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
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

export function emailMembersLink(members) {
    return encodeURI(members.map(m => `"${m.user.name}" <${m.user.email}>`).join(","));
}

export const removeDuplicates = (arr, attr) => arr
    .filter((obj, pos, arr) => arr.map(mapObj => mapObj[attr]).indexOf(obj[attr]) === pos);

export const ErrorOrigins = {
    invitationNotFound: "invitationNotFound",
    invalidSecondFactorUUID: "invalidSecondFactorUUID",
    invalidPamWebSSO: "invalidPamWebSSO"
}

export const getSchacHomeOrg = (currentUser, organisations) => {
    return organisations.find(org => org.schac_home_organisations.some(sho => sho === currentUser.schac_home_organisation));
}



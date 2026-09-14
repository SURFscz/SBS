import moment from "moment";
import escape from "lodash.escape";
import I18n from "../locale/I18n";

type AnyRecord = Record<string, unknown>;

export type StoppableEvent = {
    preventDefault: () => void;
    stopPropagation: () => void;
};

export type SelectOption = {
    value: string;
    label: string;
};

export function stopEvent(e?: StoppableEvent | null): boolean {
    if (e !== undefined && e !== null) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    return true;
}

/**
 * The predicate only claims null/undefined - empty strings, arrays and objects also return true, but
 * narrowing those away is not possible. This makes `!isEmpty(x)` enough to treat x as defined.
 */
export function isEmpty<T>(obj: T): obj is Extract<T, null | undefined> {
    if (obj === undefined || obj === null) {
        return true;
    }
    if (Array.isArray(obj)) {
        return obj.length === 0;
    }
    if (typeof obj === "string") {
        return obj.trim().length === 0;
    }
    const dateLike = obj as { getTime?: () => number };
    if (dateLike.getTime) {
        return dateLike.getTime() !== dateLike.getTime();
    }
    if (typeof obj === "object") {
        return Object.keys(obj).length === 0;
    }
    return false;
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce<Record<string, T[]>>((acc, item) => {
        const group = String(item[key]);
        (acc[group] = acc[group] || []).push(item);
        return acc;
    }, {});
}

export function sortObjects<T extends AnyRecord>(objects: T[],
                                                 attribute: string,
                                                 reverse: boolean,
                                                 customSort: ((a: T, b: T, reverse: boolean) => number) | null = null): T[] {
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
        const aS = String(val1);
        const bS = String(val2);
        if (aS.length === 0) {
            return (reverse ? -1 : 1);
        }
        if (bS.length === 0) {
            return (reverse ? 1 : -1);
        }
        return aS.localeCompare(bS) * (reverse ? -1 : 1);
    });
}

export function valueForSort(attribute: string, obj: AnyRecord): unknown {
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
    const res = parts.reduce<unknown>((acc, e) => {
        if (isEmpty(acc)) {
            return "";
        }
        return (acc as AnyRecord)[e];
    }, obj);
    return res || "";

}

export function pseudoGuid(): string {
    return (crypto.randomUUID && typeof crypto.randomUUID === "function" && crypto.randomUUID()) ||
        Math.round((new Date().getTime() * Math.random() * 1000)).toString()
}

export function escapeDeep(obj: AnyRecord | null | undefined): void {
    if (!isEmpty(obj)) {
        Object.keys(obj).forEach(key => {
            const val = obj[key];
            if (typeof (val) === "string" || val instanceof String) {
                obj[key] = escape(val as string);
            } else if (typeof (val) === "object" || val instanceof Object) {
                escapeDeep(val as AnyRecord);
            }
        });

    }
}

export const removeDuplicates = <T extends AnyRecord>(arr: T[], attr: keyof T): T[] => arr
    .filter((obj, pos, arr) => arr
        .filter(filObj => !isEmpty(filObj))
        .map(mapObj => mapObj[attr])
        .indexOf((obj || {} as T)[attr]) === pos);

export const ErrorOrigins = {
    invitationNotFound: "invitationNotFound",
    invalidSecondFactorUUID: "invalidSecondFactorUUID",
    invalidPamWebSSO: "invalidPamWebSSO"
}

export const splitListSemantically = (arr: string[], lastSeparator: string): string => {
    return [arr.slice(0, -1).join(", "), arr.slice(-1)[0]].join(arr.length < 2 ? "" : ` ${lastSeparator} `);
}

export const shuffleArray = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return [...arr];
}

export const capitalize = (str: string): string => {
    return isEmpty(str) ? str : (str.charAt(0).toUpperCase() + str.slice(1));
}

export const statusCustomSort = (o1: { status: string }, o2: { status: string }, reverse: boolean): number => {
    const comparison = o1.status === "open" ? -1 : o2.status === "open" ? 1 : o1.status.localeCompare(o2.status);
    return reverse ? comparison * -1 : comparison;
};

const stringArraySort = (val1: string, val2: string, reverse: boolean): number => {
    let comparison;
    if (val1 === val2) {
        comparison = 0;
    } else if (val1 === "") {
        comparison = 1;
    } else if (val2 === "") {
        comparison = -1;
    } else {
        comparison = val1.localeCompare(val2);
    }
    return reverse ? comparison * -1 : comparison;
}

export type UnitSortEntity = {
    units?: { name: string }[];
};

export const unitArraySort = (a1: UnitSortEntity, a2: UnitSortEntity, reverse: boolean): number => {
    const val1 = (a1.units || []).map(unit => unit.name.toLowerCase()).sort().join("");
    const val2 = (a2.units || []).map(unit => unit.name.toLowerCase()).sort().join("");
    return stringArraySort(val1, val2, reverse);
}

export type TagSortEntity = {
    tags?: { tag_value: string }[];
};

export const tagArraySort = (a1: TagSortEntity, a2: TagSortEntity, reverse: boolean): number => {
    const val1 = (a1.tags || []).map(tag => tag.tag_value.toLowerCase()).sort().join("");
    const val2 = (a2.tags || []).map(tag => tag.tag_value.toLowerCase()).sort().join("");
    return stringArraySort(val1, val2, reverse);
}

export type UserColumnSortEntity = {
    invite?: boolean;
    invitee_email?: string;
    user?: { name: string } | null;
};

export const userColumnsCustomSort = (o1: UserColumnSortEntity, o2: UserColumnSortEntity, reverse: boolean): number => {
    //The invite/no-invite branches below are exhaustive, the initial value is never used
    let comparison = 0;
    if (o1.invite && !o2.invite) {
        comparison = 1;
    } else if (!o1.invite && o2.invite) {
        comparison = -1;
    } else if (o1.invite && o2.invite) {
        comparison = (o1.invitee_email || "").localeCompare(o2.invitee_email || "");
    } else if (!o1.invite && !o2.invite) {
        comparison = (o1.user || {name: ""}).name.localeCompare((o2.user || {name: ""}).name);
    }
    return reverse ? comparison * -1 : comparison;
}

export type ExpiryDateSortEntity = {
    invite?: boolean;
    expiry_date?: number | null;
    organisation_id?: number | null;
};

export const expiryDateCustomSort = (o1: ExpiryDateSortEntity, o2: ExpiryDateSortEntity, reverse: boolean): number => {
    //The invite/no-invite branches below are exhaustive, the initial value is never used
    let comparison = 0;
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

export const joinSelectValuesArray = (arr: SelectOption[] | string | null | undefined): string | null => {
    return isEmpty(arr) ? null : Array.isArray(arr) ? arr.map(option => option.value).join(",") : arr;
}

export const commaSeparatedArrayToSelectValues = (str: string | SelectOption[] | null | undefined): SelectOption[] | string => {
    return isEmpty(str) ? [] : Array.isArray(str) ? str : str.split ? str.split(",").map(s => ({
        value: s.trim(),
        label: s.trim()
    })) : str;
}

export const commaSeparatedArrayToValues = (str: string | string[] | null | undefined): string[] | string => {
    return isEmpty(str) ? [] : Array.isArray(str) ? str : str.split ? str.split(",").map(s => s.trim()) : str;
}

export const scrollToBottom = (): void => {
    setTimeout(() => window.scrollTo({top: document.body.scrollHeight, behavior: "smooth"}), 425);
}

export const serial = <T, R>(tasks: T[], fn: (task: T, index: number) => Promise<R>): Promise<R | null> => {
    return tasks.reduce<Promise<R | null>>((promise, task, index) => promise.then(() => fn(task, index)), Promise.resolve(null))
}

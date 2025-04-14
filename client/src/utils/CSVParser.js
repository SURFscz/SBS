import Papa from "papaparse";
import {isEmpty} from "./Utils";

const multiValueColumns = ["short_names", "invitees", "groups"];

export const requiredColumns = ["short_names", "invitees"];

export const dateColumns = ["invitation_expiry_date", "membership_expiry_date"];

const parseDate = val => {
    if (isEmpty(val)) {
        return null;
    }
    let date;
    if (isNaN(val)) {
        date = new Date(val);
    } else {
        val = parseInt(val);
        const time = val < 1741356012216 ? val * 1000 : val;
        date = new Date(time);
    }
    if (isNaN(date)) {
        return null;
    }
    //Don't allow for past dates, use the default on the server
    if (new Date().getTime() > date.getTime()) {
        return null;
    }
    return Math.round(date.getTime() / 1000);
}

export const headers = "short_names,intended_role,invitees,groups,invitation_expiry_date,membership_expiry_date,message,sender_name";

export const parseBulkInvitation = csv => {
    if (csv.indexOf("short_name") === -1) {
        //Add headers
        csv = headers + "\n" + csv;
    }
    const result = Papa.parse(csv, {
        delimiter: ",",
        quoteChar: '"',
        skipEmptyLines: 'greedy',
        trimHeaders: true,
        transform: value => {
            const newValue = value && value.trim();
            return isEmpty(newValue) ? null : newValue;
        },
        header: true
    });
    let data = result.data;
    // Map multi value columns to lists
    data.forEach(row => multiValueColumns.forEach(col => row[col] = row[col] ? row[col]
        .split(",")
        .map(val => val.trim())
        .filter(val => !isEmpty(val)) : []));
    data.forEach(row => dateColumns.forEach(col => row[col] = parseDate(row[col])));
    data.forEach(row => row.intended_role = ["admin", "member"].includes(row.intended_role) ? row.intended_role : "member");
    //Validate each row
    data.forEach((row, index) => {
        if (requiredColumns.some(requiredColumn => isEmpty(row[requiredColumn])) &&
            !result.errors.some(err => err.row === index)) {
            result.errors.push({
                code: "TooFewFields",
                row: index
            });
        }
    });
    const collaborationInvitees = new Set();
    data.forEach((row, index) => {
        (row.invitees || []).forEach(invitee => {
            (row.short_names || []).forEach(shortName => {
                const key = `${invitee}_${shortName}`;
                if (collaborationInvitees.has(key) &&
                    !result.errors.some(err => err.row === index)) {
                    result.errors.push({
                        code: "Duplicate",
                        row: index,
                        invitee: invitee,
                        shortName: shortName
                    });
                } else {
                    collaborationInvitees.add(key);
                }
            })
        })
    });

    return {data: data, errors: result.errors}
};

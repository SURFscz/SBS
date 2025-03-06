import Papa from "papaparse";
import {isEmpty} from "./Utils";

const multiValueColumns = ["short_names", "invitees", "groups"];
const dateColumns = ["invitation_expiry_date", "membership_expiry_date"];

const parseDate = val => {
    if (isEmpty(val)) {
        return null;
    }
    let date;
    if (isNaN(val)) {
        date = new Date(val);
    } else {
        date = new Date(val * 1000);
    }
    if (isNaN(date)) {
        return null;
    }
    return Math.round(date.getTime() / 1000);
}

export const parseBulkInvitation = csv => {
    if (csv.indexOf("short_name") === -1) {
        //Add headers
        csv = "short_names,intended_role,invitees,groups,invitation_expiry_date,membership_expiry_date,message,sender_name" + "\n" + csv;
    }
    const result = Papa.parse(csv, {
        delimiter: ",",
        quoteChar: '"',
        skipEmptyLines: true,
        trimHeaders: true,
        transform: value => {
            const newValue = value && value.trim();
            return isEmpty(newValue) ? null : newValue;
        },
        header: true
    });
    let data = result.data;
    if (result.errors) {
        const errorIndexes = result.errors.map(error => error.row);
        data = data.filter((row, index) => !errorIndexes.includes(index));
    }
    // Map multi value columns to lists
    data.forEach(row => multiValueColumns.forEach(col => row[col] = row[col] ? row[col]
        .split(",")
        .map(val => val.trim())
        .filter(val => !isEmpty(val)) : []));
    data.forEach(row => dateColumns.forEach(col => row[col] = parseDate(row[col])));

    return {data:data, errors: result.errors, error: isEmpty(data)}
};

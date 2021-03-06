import I18n from "i18n-js";
import moment from "moment";

export function shortDateFromEpoch(epoch) {
    const options = {month: "short", day: "numeric"};
    const dateTimeFormat = new Intl.DateTimeFormat(`${I18n.locale}-${I18n.locale.toUpperCase()}`, options)
    return dateTimeFormat.format(new Date(epoch * 1000));
}

export function dateFromEpoch(epoch) {
    const options = {month: "long", day: "numeric", year: "numeric"};
    const dateTimeFormat = new Intl.DateTimeFormat(`${I18n.locale}-${I18n.locale.toUpperCase()}`, options)
    return dateTimeFormat.format(new Date(epoch * 1000));
}

export const isInvitationExpired = invitation => {
    if (!invitation.expiry_date) {
        return false;
    }
    const today = moment();
    const inp = moment(invitation.expiry_date * 1000);
    return today.isAfter(inp);
}


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
export function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
}

export const isInvitationExpired = invitation => {
    if (!invitation.expiry_date) {
        return false;
    }
    const today = moment();
    const inp = moment(invitation.expiry_date * 1000);
    return today.isAfter(inp);
}

export const isUserTokenExpired = (userToken, service) => {
    const milliSecondsInOneDay = 1000 * 60 * 60 * 24;
    const today = moment();
    const expires = moment((userToken.created_at * 1000) + (service.token_validity_days * milliSecondsInOneDay));
    return today.isAfter(expires);
}

export const userTokenExpiryDate = (createdAt, service) => {
    const secondsInOneDay = 60 * 60 * 24;
    return dateFromEpoch(createdAt + (service.token_validity_days * secondsInOneDay));
}


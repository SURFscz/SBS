import I18n from "../locale/I18n";
import {format, register} from "timeago.js";

let timeAgoInitialized = false;

export const shortDateFromEpoch = epoch => {
    const options = {month: "short", day: "numeric"};
    const dateTimeFormat = new Intl.DateTimeFormat(`${I18n.locale}-${I18n.locale.toUpperCase()}`, options)
    return dateTimeFormat.format(new Date(epoch * 1000));
}

export const dateFromEpoch = epoch => {
    const options = {month: "long", day: "numeric", year: "numeric"};
    const dateTimeFormat = new Intl.DateTimeFormat(`${I18n.locale}-${I18n.locale.toUpperCase()}`, options)
    return dateTimeFormat.format(new Date(epoch * 1000));
}

export const formatDate = date => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
}

export const isInvitationExpired = invitation => {
    if (!invitation.expiry_date) {
        return false;
    }
    const today = Date.now();
    const inp = new Date(invitation.expiry_date * 1000);
    return today > inp;
}

export const isUserTokenExpired = (userToken, service) => {
    const milliSecondsInOneDay = 1000 * 60 * 60 * 24;
    const today = Date.now();
    const expires = new Date((userToken.created_at * 1000) + (service.token_validity_days * milliSecondsInOneDay));
    return today > expires;
}

export const userTokenExpiryDate = (createdAt, service) => {
    const secondsInOneDay = 60 * 60 * 24;
    return dateFromEpoch(createdAt + (service.token_validity_days * secondsInOneDay));
}

export const languageSwitched = () => {
    timeAgoInitialized = false;
}

const TIME_AGO_LOCALE = "time-ago-locale";
const LAST_ACTIVITY_LOCALE = "last-activity-locale";
const relativeTimeNotation = (expiryEpoch, translations) => {
    if (!timeAgoInitialized) {
        const timeAgoLocale = (number, index) => {
            return [
                [I18n.t("expirations.ago.now"), I18n.t("expirations.in.now")],
                [I18n.t("expirations.ago.seconds"), I18n.t("expirations.in.seconds")],
                [I18n.t("expirations.ago.minute"), I18n.t("expirations.in.minute")],
                [I18n.t("expirations.ago.minutes"), I18n.t("expirations.in.minutes")],
                [I18n.t("expirations.ago.hour"), I18n.t("expirations.in.hour")],
                [I18n.t("expirations.ago.hours"), I18n.t("expirations.in.hours")],
                [I18n.t("expirations.ago.day"), I18n.t("expirations.in.day")],
                [I18n.t("expirations.ago.days"), I18n.t("expirations.in.days")],
                [I18n.t("expirations.ago.week"), I18n.t("expirations.in.week")],
                [I18n.t("expirations.ago.weeks"), I18n.t("expirations.in.weeks")],
                [I18n.t("expirations.ago.month"), I18n.t("expirations.in.month")],
                [I18n.t("expirations.ago.months"), I18n.t("expirations.in.months")],
                [I18n.t("expirations.ago.year"), I18n.t("expirations.in.year")],
                [I18n.t("expirations.ago.years"), I18n.t("expirations.in.years")]
            ][index];
        };
        const lastActivityLocale = (number, index) => {
            return [
                [I18n.t("expirations.activity.now"), I18n.t("expirations.activity.now")],
                [I18n.t("expirations.activity.seconds"), I18n.t("expirations.activity.seconds")],
                [I18n.t("expirations.activity.minute"), I18n.t("expirations.activity.minute")],
                [I18n.t("expirations.activity.minutes"), I18n.t("expirations.activity.minutes")],
                [I18n.t("expirations.activity.hour"), I18n.t("expirations.activity.hour")],
                [I18n.t("expirations.activity.hours"), I18n.t("expirations.activity.hours")],
                [I18n.t("expirations.activity.day"), I18n.t("expirations.activity.day")],
                [I18n.t("expirations.activity.days"), I18n.t("expirations.activity.days")],
                [I18n.t("expirations.activity.week"), I18n.t("expirations.activity.week")],
                [I18n.t("expirations.activity.weeks"), I18n.t("expirations.activity.weeks")],
                [I18n.t("expirations.activity.month"), I18n.t("expirations.activity.month")],
                [I18n.t("expirations.activity.months"), I18n.t("expirations.activity.months")],
                [I18n.t("expirations.activity.year"), I18n.t("expirations.activity.year")],
                [I18n.t("expirations.activity.years"), I18n.t("expirations.activity.years")]
            ][index];
        };
        register(TIME_AGO_LOCALE, timeAgoLocale);
        register(LAST_ACTIVITY_LOCALE, lastActivityLocale);
        timeAgoInitialized = true;
    }
    const expiryDate = new Date(expiryEpoch * 1000);
    const expired = expiryDate < new Date();
    const relativeTime = format(expiryDate, translations);
    return {expired, relativeTime};
}

export const displayExpiryDate = expiryEpoch => {
    if (!expiryEpoch) {
        return I18n.t("expirations.never");
    }
    const {expired, relativeTime} = relativeTimeNotation(expiryEpoch, TIME_AGO_LOCALE);
    return I18n.t(`expirations.${expired ? "expired" : "expires"}`, {relativeTime: relativeTime})
}

export const displayMembershipExpiryDate = expiryEpoch => {
    if (!expiryEpoch) {
        return I18n.t("expirations.never");
    }
    const {relativeTime} = relativeTimeNotation(expiryEpoch, TIME_AGO_LOCALE);
    return relativeTime;
}

export const displayLastActivityDate = expiryEpoch => {
    const {relativeTime} = relativeTimeNotation(expiryEpoch, LAST_ACTIVITY_LOCALE);
    return relativeTime;
}

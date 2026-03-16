import { describe, it, expect, vi } from 'vitest';
import {
    dateFromEpoch,
    displayExpiryDate,
    displayLastActivityDate,
    displayMembershipExpiryDate,
    formatDate,
    shortDateFromEpoch
} from "../../utils/Date";
import I18n from "../../locale/I18n";


describe('Date', () => {
    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    const relativeHour = 60 * 60;

it("dateFromEpoch", () => {
    const epoch = 1665144992694 / 1000;
    const shortDate = shortDateFromEpoch(epoch);
    expect(shortDate).toEqual("Oct 7");

    const longDate = dateFromEpoch(epoch);
    expect(longDate).toEqual("October 7, 2022");

    const formattedDate = formatDate(new Date(epoch * 1000));
    expect(formattedDate).toEqual("07/10/2022");

});

it("displayExpiryDate", () => {
    I18n.locale = "en";
    const todayEpoch = new Date().getTime() / 1000;
    let res = displayExpiryDate(todayEpoch - (relativeHour * 8));
    expect(res).toEqual("Expired 8 hours ago");

    res = displayExpiryDate(todayEpoch - (relativeHour * 24 * 3));
    expect(res).toEqual("Expired 3 days ago");

    res = displayExpiryDate(todayEpoch - (relativeHour * 24 * 33));
    expect(res).toEqual("Expired 1 month ago");

    res = displayExpiryDate(todayEpoch - (relativeHour * 24 * 365 * 3));
    expect(res).toEqual("Expired 2 years ago");

    res = displayExpiryDate(todayEpoch + (relativeHour * 24 * 4));
    expect(res).toEqual("Expires in 4 days");

    res = displayExpiryDate(todayEpoch + (relativeHour * 24 * 33));
    expect(res).toEqual("Expires in 1 month");
});

it("displayMembershipExpiryDate", () => {
    I18n.locale = "en";
    const todayEpoch = new Date().getTime() / 1000;

    let res = displayMembershipExpiryDate(todayEpoch - (relativeHour * 24 * 3))
    expect(res).toEqual("3 days ago");
});

it("displayLastActivityDate", () => {
    I18n.locale = "nl";
    const todayEpoch = new Date().getTime() / 1000;
    let res = displayLastActivityDate(todayEpoch - (relativeHour * 8));
    expect(res).toEqual("Vandaag");

    res = displayLastActivityDate(todayEpoch - (relativeHour * 25));
    expect(res).toEqual("Gisteren");

    res = displayLastActivityDate(todayEpoch - (relativeHour * 24 * 24));
    expect(res).toEqual("Deze maand");

    res = displayLastActivityDate(todayEpoch - (relativeHour * 24 * 50));
    expect(res).toEqual("Afgelopen maand");
});
});

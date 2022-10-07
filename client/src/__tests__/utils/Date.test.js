import {dateFromEpoch, formatDate, shortDateFromEpoch} from "../../utils/Date";

test("dateFromEpoch", () => {
    const epoch = 1665144992694 / 1000;
    const shortDate = shortDateFromEpoch(epoch);
    expect(shortDate).toEqual("Oct 7");

    const longDate = dateFromEpoch(epoch);
    expect(longDate).toEqual("October 7, 2022");

    const formattedDate = formatDate(new Date(epoch * 1000));
    expect(formattedDate).toEqual("07/10/2022");

});

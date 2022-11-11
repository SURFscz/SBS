import {sanitizeShortName, validUrlRegExp} from "../../validations/regExps";

test("Sanitize short names", () => {
    expect(sanitizeShortName(null)).toEqual(null);
    expect(sanitizeShortName("1QWERTY")).toEqual("qwerty");
    expect(sanitizeShortName("123456789012345678X")).toEqual("x");
    expect(sanitizeShortName("&X")).toEqual("x");
    expect(sanitizeShortName("1ABC!D@E#F&G(HIJ)KLMNOPQRSTUVWYZ")).toEqual("abcdefghijklmnop");
    expect(sanitizeShortName("$ABC!D@E#F&G(HIJ)KLMNOPQRSTUVWYZ")).toEqual("abcdefghijklmnop");
});

test("Valid urls", () => {
    expect(validUrlRegExp.test("https://localhost/api/scim_mock")).toEqual(true);
    expect(validUrlRegExp.test("http://localhost/api/scim_mock")).toEqual(true);

    expect(validUrlRegExp.test("https://google.nl")).toEqual(true);
    expect(validUrlRegExp.test("https://google")).toEqual(true);

    expect(validUrlRegExp.test("nope")).toEqual(false);
})

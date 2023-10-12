import {sanitizeShortName, validUrlRegExp, validEmailRegExp, sanitizeTagName} from "../../validations/regExps";

test("Valid emails", () => {
    expect(validEmailRegExp.test("a@a.com")).toEqual(true);
    expect(validEmailRegExp.test("b@b")).toEqual(true);

    expect(validEmailRegExp.test("nope")).toEqual(false);
})

test("Sanitize tag names", () => {
    expect(sanitizeTagName(null)).toEqual(null);
    expect(sanitizeTagName("1QWERTY")).toEqual("1qwerty");
    expect(sanitizeTagName("1234567890123456789012345678901234567890")).toEqual("12345678901234567890123456789012");
    expect(sanitizeTagName("&X")).toEqual("x");
    expect(sanitizeTagName("_X")).toEqual("x");
    expect(sanitizeTagName("$ABC!D@E#F&G(HIJ)KLMNOPQRSTUVWYZ")).toEqual("abcdefghijklmnopqrstuvwyz");
});

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
    expect(validUrlRegExp.test("https://demo-sp.sram.surf.nl/test")).toEqual(true);
    expect(validUrlRegExp.test("ssh://demo-sp.sram.surf.nl:8080")).toEqual(true);
    expect(validUrlRegExp.test("ftp://demo-sp.sram.surf.nl:8080")).toEqual(true);
    expect(validUrlRegExp.test("ssh://demo-sp.sram.surf.nl:8080/test")).toEqual(true);
    expect(validUrlRegExp.test("ftp://demo-sp.sram.surf.nl:8080/test")).toEqual(true);

    expect(validUrlRegExp.test("https://google.nl")).toEqual(true);
    expect(validUrlRegExp.test("http://localhost:8080/api/scim_mock")).toEqual(true);
    expect(validUrlRegExp.test("ssh://user;key=value;key=value@hostname.com:port")).toEqual(true);
    expect(validUrlRegExp.test("https://google")).toEqual(true);

    expect(validUrlRegExp.test("ssh://")).toEqual(false);
    expect(validUrlRegExp.test("nope")).toEqual(false);
});

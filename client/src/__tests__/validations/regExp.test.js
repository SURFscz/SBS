import {
    sanitizeShortName,
    validUrlRegExp,
    validEmailRegExp,
    sanitizeTagName,
    validRedirectUrlRegExp
} from "../../validations/regExps";

test("Valid emails", () => {
    expect(validEmailRegExp.test("a@a.com")).toBeTruthy();
    expect(validEmailRegExp.test("b@b")).toBeTruthy();
    expect(validEmailRegExp.test("a@a")).toBeTruthy();
    expect(validEmailRegExp.test("a.x@a")).toBeTruthy();
    expect(validEmailRegExp.test("a@a.c")).toBeTruthy();
    expect(validEmailRegExp.test("axz+test@a.c")).toBeTruthy();

    expect(validEmailRegExp.test("nope")).toBeFalsy();
    expect(validEmailRegExp.test("aa")).toBeFalsy();
    expect(validEmailRegExp.test("a!@a.c")).toBeFalsy();
    expect(validEmailRegExp.test("a!@a.c@")).toBeFalsy();

})

test("Sanitize tag names", () => {
    expect(sanitizeTagName(null)).toEqual(null);
    expect(sanitizeTagName("1QWERTY")).toEqual("1qwerty");
    expect(sanitizeTagName("1234567890123456789012345678901234567890")).toEqual("12345678901234567890123456789012");
    expect(sanitizeTagName("😁")).toEqual("😁");
    expect(sanitizeTagName(" 🌹 ")).toEqual("🌹");
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

test("Valid redirect urls", () => {
    expect(validRedirectUrlRegExp.test("https://localhost/api/scim_mock")).toEqual(true);
    expect(validRedirectUrlRegExp.test("http://localhost/redirect")).toEqual(true);
    expect(validRedirectUrlRegExp.test("http://localhost:8080/redirect/extra")).toEqual(true);
    expect(validRedirectUrlRegExp.test("https://demo-sp.sram.surf.nl/redirect")).toEqual(true);

    expect(validRedirectUrlRegExp.test("https://google.nl:433/redirect")).toEqual(true);

    expect(validRedirectUrlRegExp.test("http://google")).toEqual(false);
    expect(validRedirectUrlRegExp.test("ssh://")).toEqual(false);
    expect(validRedirectUrlRegExp.test("nope")).toEqual(false);
    expect(validRedirectUrlRegExp.test("ssh://demo-sp.sram.surf.nl:8080")).toEqual(false);
    expect(validRedirectUrlRegExp.test("ftp://demo-sp.sram.surf.nl:8080")).toEqual(false);
});

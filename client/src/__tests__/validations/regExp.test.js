import { describe, it, expect } from 'vitest';
import {
    sanitizeShortName,
    validUrlRegExp,
    validEmailRegExp,
    sanitizeTagName,
    validTagName,
    validRedirectUrlRegExp
} from "../../validations/regExps";


describe('regExp', () => {
it("Valid emails", () => {
    expect(validEmailRegExp.test("a@a.com")).toBeTruthy();
    expect(validEmailRegExp.test("b@b")).toBeTruthy();
    expect(validEmailRegExp.test("a@a")).toBeTruthy();
    expect(validEmailRegExp.test("a.x@a")).toBeTruthy();
    expect(validEmailRegExp.test("a@a.c")).toBeTruthy();
    expect(validEmailRegExp.test("axz+test@a.c")).toBeTruthy();

    expect(validEmailRegExp.test("nope")).toBeFalsy();
    expect(validEmailRegExp.test("aa")).toBeFalsy();
    expect(validEmailRegExp.test("a!@a.c")).toBeTruthy();
    expect(validEmailRegExp.test("a!@a.c@")).toBeFalsy();
    expect(validEmailRegExp.test("person10@example.com <person10@example.com>")).toBeFalsy();
    expect(validEmailRegExp.test("\"person10@example.com\" <person10@example.com>")).toBeTruthy();

})

it("Sanitize tag names", () => {
    expect(sanitizeTagName(null)).toEqual(null);
    expect(sanitizeTagName("1QWERTY")).toEqual("1qwerty");
    expect(sanitizeTagName("1234567890123456789012345678901234567890")).toEqual("12345678901234567890123456789012");
    expect(sanitizeTagName("😁")).toEqual("😁");
    expect(sanitizeTagName(" 🌹 ")).toEqual("🌹");
});

it("Valid tag names", () => {
    expect(validTagName("tag_uuc")).toBeTruthy();
    expect(validTagName("just_valid-234567890123456789012")).toBeTruthy();
    expect(validTagName("a1234567890123456789012345678901")).toBeTruthy();

    expect(validTagName("123_valid")).toBeFalsy();
    expect(validTagName("Tag_uuc")).toBeFalsy();
    expect(validTagName("tag value")).toBeFalsy();
    expect(validTagName("123456789012345678901234567890123")).toBeFalsy();
    expect(validTagName("")).toBeFalsy();
});

it("Sanitize short names", () => {
    expect(sanitizeShortName(null)).toEqual(null);
    expect(sanitizeShortName("1QWERTY")).toEqual("qwerty");
    expect(sanitizeShortName("123456789012345678X")).toEqual("x");
    expect(sanitizeShortName("&X")).toEqual("x");
    expect(sanitizeShortName("1ABC!D@E#F&G(HIJ)KLMNOPQRSTUVWYZ")).toEqual("abcdefghijklmnop");
    expect(sanitizeShortName("$ABC!D@E#F&G(HIJ)KLMNOPQRSTUVWYZ")).toEqual("abcdefghijklmnop");
});

it("Valid urls", () => {
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

it("Valid redirect urls", () => {
    const redirectURLs = {
        "https://localhost/api/scim_mock": true,
        "http://localhost/redirect": true,
        "http://localhost": true,
        "http://localhost:8080/redirect/ports": true,
        "https://demo-sp.sram.surf.nl/redirect": true,
        "http://127.0.0.0": true,
        "http://127.0.0.0:9/test": true,
        "http://127.255.255.255": true,
        "http://127.255.255.255:999": true,
        //Good luck to you, let's keep the regexp simple
        "http://127.nope": true,
        "http://google": false,
        "ssh://": false,
        "ssh://demo-sp.sram.surf.nl:8080": false,
        "http://127n": false,
        "http://128.0.0.1": false,
    }
    Object.entries(redirectURLs)
        .forEach((arr) => expect(validRedirectUrlRegExp.test(arr[0])).toEqual(arr[1]));
});

});

import React from "react";
import en from "../../locale/en";
import nl from "../../locale/nl";

expect.extend({
    toContainKey(translation, key) {
        return {
            message: () => `Expected ${key} to be present in ${JSON.stringify(translation)}`,
            pass: (translation !== undefined && translation[key] !== undefined)
        };
    },
});

test("All translations exists in all bundles", () => {
    const contains = (translation, translationToVerify) => {
        Object.keys(translation).forEach(key => {
            expect(translationToVerify).toContainKey(key);
            const value = translation[key];
            if (typeof value === "object") {
                contains(value, translationToVerify[key])
            }
        });
    };
    contains(en, nl);
    contains(nl, en);
});
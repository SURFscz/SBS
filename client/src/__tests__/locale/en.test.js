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
    const contains = (translation, translationToVerify, keyCollection) => {
        Object.keys(translation).forEach(key => {
            expect(translationToVerify).toContainKey(key);
            const value = translation[key];
            keyCollection.push(key);
            if (typeof value === "object") {
                contains(value, translationToVerify[key], keyCollection)
            }
        });
    };
    const keyCollectionEN = [];
    contains(en, nl, keyCollectionEN);
    const keyCollectionNL = [];
    contains(nl, en, keyCollectionNL);
    const positionalMismatches = keyCollectionEN.filter((item, index) => keyCollectionNL[index] !== item);
    expect(positionalMismatches.length).toEqual(0)
});
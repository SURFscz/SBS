import fs from 'fs';
import path from 'path';


expect.extend({
    equalLineNumber(enTranslation, nlTranslation, index) {
        const indexOf = enTranslation.indexOf(": ");
        if (indexOf > -1 && enTranslation.indexOf("<") < 0) {
            const sub = enTranslation.substring(0, indexOf);
            return {
                message: () => `en.js line number ${index} has different translation: \n${enTranslation}\nthan\n${nlTranslation} `,
                pass: index === 0 || nlTranslation.startsWith(sub)
            };
        }
        return {pass: true};
    },
});

test("All translations have the same  line number", () => {
    const enTranslations = fs.readFileSync(path.resolve(__dirname, "../../locale/en.js"), {encoding: 'utf8'});
    const nlTranslations = fs.readFileSync(path.resolve(__dirname, "../../locale/nl.js"), {encoding: 'utf8'});
    const enLines = enTranslations.split("\n");
    const nlLines = nlTranslations.split("\n");
    enLines.forEach((enLine, index) => expect(enLine).equalLineNumber(nlLines[index], index));
});
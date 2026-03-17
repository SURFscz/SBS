module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true
    },
    globals: {
        module: true,
        window: true,
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly"
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaFeatures: {
            jsx: true
        },
        ecmaVersion: 2018,
        sourceType: 'module'
    },
    ignorePatterns: [
        ".eslintrc.js"
    ],
    overrides: [
        {
            files: ["src/setupProxy.js", "vite.config.js"],
            env: {
                node: true
            }
        }
    ],
    plugins: ['react', 'risxss'],      //  <<< add risxss in plugins
    rules: {
        'risxss/catch-potential-xss-react': 'error'  //  <<< add this in rules
    }
};

module.exports = {
    env: {
        browser: true,
        es6: true
    },
    globals: {
        module: true,
        window: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaFeatures: {
            jsx: true
        },
        ecmaVersion: 2018,
        sourceType: 'module'
    },
    plugins: ['react', 'risxss'],      //  <<< add risxss in plugins
    rules: {
        'risxss/catch-potential-xss-react': 'error'  //  <<< add this in rules
    }
};

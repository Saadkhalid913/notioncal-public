module.exports = {
    preset: "ts-jest",
    setupFiles: [__dirname + "/tests/setupTests.ts"],
    globalTeardown: __dirname + "/tests/teardown.ts"
}
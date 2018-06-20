import toFunction from '../../../src/graph/util/toFunction'

describe("toFunction", function () {
    test("Should convert the parameter to a function returning the parameter", () => {
        const parameter = "value";
        const func = toFunction(parameter);
        expect(func()).toBe(parameter);
    });

    test("Should not transform the function parameter", () => {
        const parameter = function () { return "value"};
        const func = toFunction(parameter);
        expect(func()).toBe("value");
    });
});
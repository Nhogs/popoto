import provider from "../../src/provider/provider";
import query from '../../src/query/query.js'
import dataModel from "../../src/datamodel/dataModel";

test("MAX_RESULTS_COUNT Should be initialized", () => {
    expect(query.MAX_RESULTS_COUNT).toEqual(100);
});

describe("order by generation", function () {
    beforeEach(() => {
        dataModel.nodes = [
            {
                label: "Person",
                internalLabel: "person",
                type: 0
            }
        ];

        provider.node.Provider = {
            "Person": {
                returnAttributes: ["name", "born"],
                constraintAttribute: "name",
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("test default order by (should be null and not generated in query) []", () => {
        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test null order by (should not be generated in query) []", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = null;

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test default order when attribute set [name ASC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = "name";

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test order by descending [name DESC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = "name";
        provider.node.Provider["Person"].isResultOrderAscending = false;

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test order by ascending [name ASC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = "name";
        provider.node.Provider["Person"].isResultOrderAscending = true;

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test array order by attr default order [born ASC, name ASC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = ["born", "name"];

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test array order by attr simple order [born DESC, name DESC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = ["born", "name"];
        provider.node.Provider["Person"].isResultOrderAscending = false;

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test array order by attr simple array order [born DESC, name DESC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = ["born", "name"];
        provider.node.Provider["Person"].isResultOrderAscending = [false];

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test array order by attr array order [born DESC, name DESC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = ["born", "name"];
        provider.node.Provider["Person"].isResultOrderAscending = [false, false];

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test array order by attr array order [born DESC, name ASC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = ["born", "name"];
        provider.node.Provider["Person"].isResultOrderAscending = [false, true];

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test array order by attr array order [born ASC, name DESC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = ["born", "name"];
        provider.node.Provider["Person"].isResultOrderAscending = [true, false];

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });

    test("test array order by attr array order [name ASC, born DESC]", () => {
        provider.node.Provider["Person"].resultOrderByAttribute = ["name", "born"];
        provider.node.Provider["Person"].isResultOrderAscending = [true, false];

        var statement = query.generateResultQuery(false).statement;
        expect(statement).toMatchSnapshot();
    });
});
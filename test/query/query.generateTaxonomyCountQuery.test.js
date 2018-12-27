import provider from "../../src/provider/provider";
import query from '../../src/query/query.js'
import dataModel from "../../src/datamodel/dataModel";

describe("taxonomy count generation", function () {
    beforeEach(() => {
        provider.node.Provider = {
            "Person": {
                returnAttributes: ["name", "born"],
                constraintAttribute: "name",
            },
            "Movie": {
                returnAttributes: ["title", "born"],
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("Person", () => {
        var countQuery = query.generateTaxonomyCountQuery("Person");
        expect(countQuery).toMatchSnapshot();
    });
    test("Movie", () => {
        var countQuery = query.generateTaxonomyCountQuery("Movie");
        expect(countQuery).toMatchSnapshot();
    });
});

describe("Predefined constraints Neo4j id generation", function () {
    beforeEach(() => {
        provider.node.Provider = {
            "Person": {
                returnAttributes: ["name", "born"],
                constraintAttribute: "name",
                getPredefinedConstraints: function () {
                    return ["$identifier.born > 1976", "$identifier.born <= 1990"];
                }
            },
            "Movie": {
                returnAttributes: ["title", "released"],
                getPredefinedConstraints: function () {
                    return ["$identifier.released > 1976", "$identifier.released <= 1990"];
                }
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("Person", () => {
        var countQuery = query.generateTaxonomyCountQuery("Person");
        expect(countQuery).toMatchSnapshot();
    });

    test("Movie", () => {
        var countQuery = query.generateTaxonomyCountQuery("Movie");
        expect(countQuery).toMatchSnapshot();
    });
});
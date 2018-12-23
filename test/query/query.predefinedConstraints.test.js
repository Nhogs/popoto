import provider from "../../src/provider/provider";
import query from '../../src/query/query.js'
import dataModel from "../../src/datamodel/dataModel";

describe("Predefined constraints Neo4j id generation", function () {
    beforeEach(() => {
        provider.node.Provider = {
            "Person": {
                returnAttributes: ["name", "born"],
                constraintAttribute: "name",
                getPredefinedConstraints: function () {
                    return ["$identifier.born > 1976"];
                }
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
});
import * as d3 from "d3";
import dataModel from "../datamodel/dataModel";
import query from "../query/query";
import provider from "../provider/provider";
import logger from "../logger/logger";
import runner from "../runner/runner";
import result from "../result/result";
import tools from "../tools/tools";
import graph from "../graph/graph";
import {update} from "../popoto";

var taxonomy = {};
taxonomy.containerId = "popoto-taxonomy";

/**
 * Create the taxonomy panel HTML elements.
 */
taxonomy.createTaxonomyPanel = function () {
    var htmlContainer = d3.select("#" + taxonomy.containerId);

    var taxoUL = htmlContainer.append("ul")
        .attr("class", "ppt-taxo-ul");

    var data = taxonomy.generateTaxonomiesData();

    var taxos = taxoUL.selectAll(".taxo").data(data);

    var taxoli = taxos.enter().append("li")
        .attr("id", function (d) {
            return d.id
        })
        .attr("class", "ppt-taxo-li")
        .attr("value", function (d) {
            return d.label;
        });

    taxoli.append("span")
        .attr("class", function (d) {
            return "ppt-icon " + provider.taxonomy.getCSSClass(d.label, "span-icon");
        })
        .html("&nbsp;");

    taxoli.append("span")
        .attr("class", "ppt-label")
        .text(function (d) {
            return provider.taxonomy.getTextValue(d.label);
        });

    taxoli.append("span")
        .attr("class", "ppt-count");

    // Add an on click event on the taxonomy to clear the graph and set this label as root
    taxoli.on("click", taxonomy.onClick);

    taxonomy.addTaxonomyChildren(taxoli);

    // The count is updated for each labels.
    var flattenData = [];
    data.forEach(function (d) {
        flattenData.push(d);
        if (d.children) {
            taxonomy.flattenChildren(d, flattenData);
        }
    });

    if (!graph.DISABLE_COUNT) {
        taxonomy.updateCount(flattenData);
    }
};

/**
 * Recursive function to flatten data content.
 *
 */
taxonomy.flattenChildren = function (d, vals) {
    d.children.forEach(function (c) {
        vals.push(c);
        if (c.children) {
            vals.concat(taxonomy.flattenChildren(c, vals));
        }
    });
};

/**
 * Updates the count number on a taxonomy.
 *
 * @param taxonomyData
 */
taxonomy.updateCount = function (taxonomyData) {
    var statements = [];

    taxonomyData.forEach(function (taxo) {
        statements.push(
            {
                "statement": query.generateTaxonomyCountQuery(taxo.label)
            }
        );
    });

    (function (taxonomies) {
        logger.info("Count taxonomies ==>");
        runner.run(
            {
                "statements": statements
            })
            .then(function (results) {
                logger.info("<== Count taxonomies");

                for (var i = 0; i < taxonomies.length; i++) {
                    var count = results[i].records[0].get('count').toString();
                    d3.select("#" + taxonomies[i].id)
                        .select(".ppt-count")
                        .text(" (" + count + ")");
                }
            }, function (error) {
                logger.error(error);
                d3.select("#popoto-taxonomy")
                    .selectAll(".ppt-count")
                    .text(" (0)");
            })
            .catch(function (error) {
                logger.error(error);
                d3.select("#popoto-taxonomy")
                    .selectAll(".ppt-count")
                    .text(" (0)");
            });
    })(taxonomyData);
};

/**
 * Recursively generate the taxonomy children elements.
 *
 * @param selection
 */
taxonomy.addTaxonomyChildren = function (selection) {
    selection.each(function (d) {
        var li = d3.select(this);

        var children = d.children;
        if (d.children) {
            var childLi = li.append("ul")
                .attr("class", "ppt-taxo-sub-ul")
                .selectAll("li")
                .data(children)
                .enter()
                .append("li")
                .attr("id", function (d) {
                    return d.id
                })
                .attr("class", "ppt-taxo-sub-li")
                .attr("value", function (d) {
                    return d.label;
                });

            childLi.append("span")
                .attr("class", function (d) {
                    return "ppt-icon " + provider.taxonomy.getCSSClass(d.label, "span-icon");
                })
                .html("&nbsp;");

            childLi.append("span")
                .attr("class", "ppt-label")
                .text(function (d) {
                    return provider.taxonomy.getTextValue(d.label);
                });

            childLi.append("span")
                .attr("class", "ppt-count");

            childLi.on("click", taxonomy.onClick);

            taxonomy.addTaxonomyChildren(childLi);
        }

    });
};

taxonomy.onClick = function () {
    d3.event.stopPropagation();

    var label = this.attributes.value.value;

    dataModel.nodes.length = 0;
    dataModel.links.length = 0;

    // Reinitialize internal label generator
    graph.node.internalLabels = {};

    update();
    graph.mainLabel = label;
    if (provider.node.getSchema(label) !== undefined) {
        graph.addSchema(provider.node.getSchema(label));
    } else {
        graph.addRootNode(label);
    }
    graph.hasGraphChanged = true;
    result.hasChanged = true;
    graph.ignoreCount = false;
    update();
    tools.center();
};

/**
 * Parse the list of label providers and return a list of data object containing only searchable labels.
 * @returns {Array}
 */
taxonomy.generateTaxonomiesData = function () {
    var id = 0;
    var data = [];
    // Retrieve root providers (searchable and without parent)
    for (var label in provider.node.Provider) {
        if (provider.node.Provider.hasOwnProperty(label)) {
            if (provider.node.getProperty(label, "isSearchable") && !provider.node.Provider[label].parent) {
                data.push({
                    "label": label,
                    "id": "popoto-lbl-" + id++
                });
            }
        }
    }

    // Add children data for each provider with children.
    data.forEach(function (d) {
        if (provider.node.getProvider(d.label).hasOwnProperty("children")) {
            id = taxonomy.addChildrenData(d, id);
        }
    });

    return data;
};

/**
 * Add children providers data.
 * @param parentData
 * @param id
 */
taxonomy.addChildrenData = function (parentData, id) {
    parentData.children = [];

    provider.node.getProvider(parentData.label).children.forEach(function (d) {
        var childProvider = provider.node.getProvider(d);
        var childData = {
            "label": d,
            "id": "popoto-lbl-" + id++
        };
        if (childProvider.hasOwnProperty("children")) {
            id = taxonomy.addChildrenData(childData, id);
        }
        if (provider.node.getProperty(d, "isSearchable")) {
            parentData.children.push(childData);
        }
    });

    return id;
};


export default taxonomy;
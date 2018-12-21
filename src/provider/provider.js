import * as d3 from "d3";
import logger from "../logger/logger";
import query from "../query/query";
import graph from "../graph/graph";

var provider = {};

/**
 * Default color scale generator.
 * Used in getColor link and node providers.
 */
provider.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
provider.link = {};
provider.link.Provider = {};
provider.taxonomy = {};
provider.taxonomy.Provider = {};
provider.node = {};
provider.node.Provider = {};

//------------------------------------------------
// LINKS

/**
 *  Get the text representation of a link.
 *
 * @param link the link to get the text representation.
 * @returns {string} the text representation of the link.
 */
provider.link.getTextValue = function (link) {
    if (provider.link.Provider.hasOwnProperty("getTextValue")) {
        return provider.link.Provider.getTextValue(link);
    } else {
        if (provider.link.DEFAULT_PROVIDER.hasOwnProperty("getTextValue")) {
            return provider.link.DEFAULT_PROVIDER.getTextValue(link);
        } else {
            logger.error("No provider defined for link getTextValue");
        }
    }
};

provider.link.getColor = function (link, element, attribute) {
    if (provider.link.Provider.hasOwnProperty("getColor")) {
        return provider.link.Provider.getColor(link, element, attribute);
    } else {
        if (provider.link.DEFAULT_PROVIDER.hasOwnProperty("getColor")) {
            return provider.link.DEFAULT_PROVIDER.getColor(link, element, attribute);
        } else {
            logger.error("No provider defined for getColor");
        }
    }
};

provider.link.getCSSClass = function (link, element) {
    if (provider.link.Provider.hasOwnProperty("getCSSClass")) {
        return provider.link.Provider.getCSSClass(link, element);
    } else {
        if (provider.link.DEFAULT_PROVIDER.hasOwnProperty("getCSSClass")) {
            return provider.link.DEFAULT_PROVIDER.getCSSClass(link, element);
        } else {
            logger.error("No provider defined for getCSSClass");
        }
    }
};

provider.link.getDistance = function (link) {
    if (provider.link.Provider.hasOwnProperty("getDistance")) {
        return provider.link.Provider.getDistance(link);
    } else {
        if (provider.link.DEFAULT_PROVIDER.hasOwnProperty("getDistance")) {
            return provider.link.DEFAULT_PROVIDER.getDistance(link);
        } else {
            logger.error("No provider defined for getDistance");
        }
    }
};

/**
 *  Get the semantic text representation of a link.
 *
 * @param link the link to get the semantic text representation.
 * @returns {string} the semantic text representation of the link.
 */
provider.link.getSemanticValue = function (link) {
    if (provider.link.Provider.hasOwnProperty("getSemanticValue")) {
        return provider.link.Provider.getSemanticValue(link);
    } else {
        if (provider.link.DEFAULT_PROVIDER.hasOwnProperty("getSemanticValue")) {
            return provider.link.DEFAULT_PROVIDER.getSemanticValue(link);
        } else {
            logger.error("No provider defined for getSemanticValue");
        }
    }
};

provider.colorLuminance = function (hex, lum) {

    // validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;

    // convert to decimal and change luminosity
    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
    }

    return rgb;
};

/**
 * Label provider used by default if none have been defined for a label.
 * This provider can be changed if needed to customize default behavior.
 * If some properties are not found in user customized providers, default values will be extracted from this provider.
 */
provider.link.DEFAULT_PROVIDER = {
    /**
     * Function used to return the text representation of a link.
     *
     * The default behavior is to return the internal relation name as text for relation links.
     * And return the target node text value for links between a node and its expanded values but only if text is not displayed on value node.
     *
     * @param link the link to represent as text.
     * @returns {string} the text representation of the link.
     */
    "getTextValue": function (link) {
        if (link.type === graph.link.LinkTypes.VALUE) {
            // Links between node and list of values.

            if (provider.node.isTextDisplayed(link.target)) {
                // Don't display text on link if text is displayed on target node.
                return "";
            } else {
                // No text is displayed on target node then the text is displayed on link.
                return provider.node.getTextValue(link.target);
            }

        } else {
            var targetName = "";
            if (link.type === graph.link.LinkTypes.SEGMENT) {
                targetName = " " + provider.node.getTextValue(link.target);
            }
            return link.label + targetName;
        }
    },


    /**
     *
     * @param link
     */
    "getDistance": function (link) {
        if (link.type === graph.link.LinkTypes.VALUE) {
            return (13 / 8) * (provider.node.getSize(link.source) + provider.node.getSize(link.target));
        } else {
            return (20 / 8) * (provider.node.getSize(link.source) + provider.node.getSize(link.target));
        }
    },

    /**
     * Return the color to use on links and relation donut segments.
     *
     *
     * Return null or undefined
     * @param link
     * @param element
     * @param attribute
     * @return {*}
     */
    "getColor": function (link, element, attribute) {
        if (link.type === graph.link.LinkTypes.VALUE) {
            return "#525863";
        } else {
            var colorId = link.source.label + link.label + link.target.label;

            var color = provider.colorScale(colorId);
            if (attribute === "stroke") {
                return provider.colorLuminance(color, -0.2);
            }
            return color;
        }
    },

    /**
     *
     * @param link
     * @param element
     * @return {string}
     */
    "getCSSClass": function (link, element) {
        var cssClass = "ppt-link__" + element;

        if (link.type === graph.link.LinkTypes.VALUE) {
            cssClass = cssClass + "--value";
        } else {
            var labelAsCSSName = "ppt-" + link.label.replace(/[^0-9a-z\-_]/gi, '');
            if (link.type === graph.link.LinkTypes.RELATION) {
                cssClass = cssClass + "--relation";

                if (link.target.count === 0) {
                    cssClass = cssClass + "--disabled";
                }

                cssClass = cssClass + " " + labelAsCSSName
            }
        }

        return cssClass;
    },

    /**
     * Function used to return a descriptive text representation of a link.
     * This representation should be more complete than getLinkTextValue and can contain semantic data.
     * This function is used for example to generate the label in the query viewer.
     *
     * The default behavior is to return the getLinkTextValue.
     *
     * @param link the link to represent as text.
     * @returns {string} the text semantic representation of the link.
     */
    "getSemanticValue": function (link) {
        return provider.link.getTextValue(link);
    }
};

provider.link.Provider = provider.link.DEFAULT_PROVIDER;

//------------------------------------------------
// TAXONOMY

/**
 *  Get the text representation of a taxonomy.
 *
 * @param label the label used for the taxonomy.
 * @returns {string} the text representation of the taxonomy.
 */
provider.taxonomy.getTextValue = function (label) {
    if (provider.taxonomy.Provider.hasOwnProperty("getTextValue")) {
        return provider.taxonomy.Provider.getTextValue(label);
    } else {
        if (provider.taxonomy.DEFAULT_PROVIDER.hasOwnProperty("getTextValue")) {
            return provider.taxonomy.DEFAULT_PROVIDER.getTextValue(label);
        } else {
            logger.error("No provider defined for taxonomy getTextValue");
        }
    }
};

/**
 *
 * @param label
 * @param element
 * @return {*}
 */
provider.taxonomy.getCSSClass = function (label, element) {
    if (provider.taxonomy.Provider.hasOwnProperty("getCSSClass")) {
        return provider.taxonomy.Provider.getCSSClass(label, element);
    } else {
        if (provider.taxonomy.DEFAULT_PROVIDER.hasOwnProperty("getCSSClass")) {
            return provider.taxonomy.DEFAULT_PROVIDER.getCSSClass(label, element);
        } else {
            logger.error("No provider defined for taxonomy getCSSClass");
        }
    }
};

/**
 * Label provider used by default if none have been defined for a label.
 * This provider can be changed if needed to customize default behavior.
 * If some properties are not found in user customized providers, default values will be extracted from this provider.
 */
provider.taxonomy.DEFAULT_PROVIDER = {
    /**
     * Function used to return the text representation of a taxonomy.
     *
     * The default behavior is to return the label without changes.
     *
     * @param label the label used to represent the taxonomy.
     * @returns {string} the text representation of the taxonomy.
     */
    "getTextValue": function (label) {
        return label;
    },

    /**
     *
     * @param label
     * @return {string}
     */
    "getCSSClass": function (label, element) {
        var labelAsCSSName = label.replace(/[^0-9a-z\-_]/gi, '');

        var cssClass = "ppt-taxo__" + element;

        return cssClass + " " + labelAsCSSName;
    }

};

provider.taxonomy.Provider = provider.taxonomy.DEFAULT_PROVIDER;

/**
 * Define the different type of rendering of a node for a given label.
 * TEXT: default rendering type, the node will be displayed with an ellipse and a text in it.
 * IMAGE: the node is displayed as an image using the image tag in the svg graph.
 * In this case an image path is required.
 * SVG: the node is displayed using a list of svg path, each path can contain its own color.
 */
provider.node.DisplayTypes = Object.freeze({TEXT: 0, IMAGE: 1, SVG: 2, SYMBOL: 3});

/**
 * Get the label provider for the given label.
 * If no provider is defined for the label:
 * First search in parent provider.
 * Then if not found will create one from default provider.
 *
 * @param label to retrieve the corresponding label provider.
 * @returns {object} corresponding label provider.
 */
provider.node.getProvider = function (label) {
    if (label === undefined) {
        logger.error("Node label is undefined, no label provider can be found.");
    } else {
        if (provider.node.Provider.hasOwnProperty(label)) {
            return provider.node.Provider[label];
        } else {
            logger.debug("No direct provider found for label " + label);

            // Search in all children list definitions to find the parent provider.
            for (var p in provider.node.Provider) {
                if (provider.node.Provider.hasOwnProperty(p)) {
                    var nProvider = provider.node.Provider[p];
                    if (nProvider.hasOwnProperty("children")) {
                        if (nProvider["children"].indexOf(label) > -1) {
                            logger.debug("No provider is defined for label (" + label + "), parent (" + p + ") will be used");
                            // A provider containing the required label in its children definition has been found it will be cloned.

                            var newProvider = {"parent": p};
                            for (var pr in nProvider) {
                                if (nProvider.hasOwnProperty(pr) && pr !== "children" && pr !== "parent") {
                                    newProvider[pr] = nProvider[pr];
                                }
                            }

                            provider.node.Provider[label] = newProvider;
                            return provider.node.Provider[label];
                        }
                    }
                }
            }

            logger.debug("No label provider defined for label (" + label + ") default one will be created from provider.node.DEFAULT_PROVIDER");

            provider.node.Provider[label] = {};
            // Clone default provider properties in new provider.
            for (var prop in provider.node.DEFAULT_PROVIDER) {
                if (provider.node.DEFAULT_PROVIDER.hasOwnProperty(prop)) {
                    provider.node.Provider[label][prop] = provider.node.DEFAULT_PROVIDER[prop];
                }
            }
            return provider.node.Provider[label];
        }
    }
};

/**
 * Get the property or function defined in node label provider.
 * If the property is not found search is done in parents.
 * If not found in parent, property defined in provider.node.DEFAULT_PROVIDER is returned.
 * If not found in default provider, defaultValue is set and returned.
 *
 * @param label node label to get the property in its provider.
 * @param name name of the property to retrieve.
 * @returns {*} node property defined in its label provider.
 */
provider.node.getProperty = function (label, name) {
    var nProvider = provider.node.getProvider(label);

    if (!nProvider.hasOwnProperty(name)) {
        var providerIterator = nProvider;

        // Check parents
        var isPropertyFound = false;
        while (providerIterator.hasOwnProperty("parent") && !isPropertyFound) {
            providerIterator = provider.node.getProvider(providerIterator.parent);
            if (providerIterator.hasOwnProperty(name)) {

                // Set attribute in child to optimize next call.
                nProvider[name] = providerIterator[name];
                isPropertyFound = true;
            }
        }

        if (!isPropertyFound) {
            logger.debug("No \"" + name + "\" property found for node label provider (" + label + "), default value will be used");
            if (provider.node.DEFAULT_PROVIDER.hasOwnProperty(name)) {
                nProvider[name] = provider.node.DEFAULT_PROVIDER[name];
            } else {
                logger.debug("No default value for \"" + name + "\" property found for label provider (" + label + ")");
            }
        }
    }
    return nProvider[name];
};

/**
 *
 * @param label
 */
provider.node.getIsAutoLoadValue = function (label) {
    return provider.node.getProperty(label, "isAutoLoadValue");
};

/**
 * Return the "isSearchable" property for the node label provider.
 * Is Searchable defines whether the label can be used as graph query builder root.
 * If true the label can be displayed in the taxonomy filter.
 *
 * @param label
 * @returns boolean
 */
provider.node.getIsSearchable = function (label) {
    return provider.node.getProperty(label, "isSearchable");
};

/**
 * Return the "autoExpandRelations" property for the node label provider.
 * Auto expand relations defines whether the label will automatically add its relations when displayed on graph.
 *
 * @param label
 * @returns boolean
 */
provider.node.getIsAutoExpandRelations = function (label) {
    return provider.node.getProperty(label, "autoExpandRelations");
};

provider.node.getSchema = function (label) {
    return provider.node.getProperty(label, "schema");
};

/**
 * Return the list of attributes defined in node label provider.
 * Parents return attributes are also returned.
 *
 * @param label used to retrieve parent attributes.
 * @returns {Array} list of return attributes for a node.
 */
provider.node.getReturnAttributes = function (label) {
    var nProvider = provider.node.getProvider(label);
    var attributes = {}; // Object is used as a Set to merge possible duplicate in parents

    if (nProvider.hasOwnProperty("returnAttributes")) {
        for (var i = 0; i < nProvider.returnAttributes.length; i++) {
            if (nProvider.returnAttributes[i] === query.NEO4J_INTERNAL_ID) {
                attributes[query.NEO4J_INTERNAL_ID.queryInternalName] = true;
            } else {
                attributes[nProvider.returnAttributes[i]] = true;
            }
        }
    }

    // Add parent attributes
    while (nProvider.hasOwnProperty("parent")) {
        nProvider = provider.node.getProvider(nProvider.parent);
        if (nProvider.hasOwnProperty("returnAttributes")) {
            for (var j = 0; j < nProvider.returnAttributes.length; j++) {
                if (nProvider.returnAttributes[j] === query.NEO4J_INTERNAL_ID) {
                    attributes[query.NEO4J_INTERNAL_ID.queryInternalName] = true;
                } else {
                    attributes[nProvider.returnAttributes[j]] = true;
                }
            }
        }
    }

    // Add default provider attributes if any but not internal id as this id is added only if none has been found.
    if (provider.node.DEFAULT_PROVIDER.hasOwnProperty("returnAttributes")) {
        for (var k = 0; k < provider.node.DEFAULT_PROVIDER.returnAttributes.length; k++) {
            if (provider.node.DEFAULT_PROVIDER.returnAttributes[k] !== query.NEO4J_INTERNAL_ID) {
                attributes[provider.node.DEFAULT_PROVIDER.returnAttributes[k]] = true;
            }
        }
    }

    // Add constraint attribute in the list
    var constraintAttribute = provider.node.getConstraintAttribute(label);
    if (constraintAttribute === query.NEO4J_INTERNAL_ID) {
        attributes[query.NEO4J_INTERNAL_ID.queryInternalName] = true;
    } else {
        attributes[constraintAttribute] = true;
    }


    // Add all in array
    var attrList = [];
    for (var attr in attributes) {
        if (attributes.hasOwnProperty(attr)) {
            if (attr === query.NEO4J_INTERNAL_ID.queryInternalName) {
                attrList.push(query.NEO4J_INTERNAL_ID);
            } else {
                attrList.push(attr);
            }
        }
    }

    // If no attributes have been found internal ID is used
    if (attrList.length <= 0) {
        attrList.push(query.NEO4J_INTERNAL_ID);
    }
    return attrList;
};

/**
 * Return the attribute to use as constraint attribute for a node defined in its label provider.
 *
 * @param label
 * @returns {*}
 */
provider.node.getConstraintAttribute = function (label) {
    return provider.node.getProperty(label, "constraintAttribute");
};

provider.node.getDisplayAttribute = function (label) {
    var displayAttribute = provider.node.getProperty(label, "displayAttribute");

    if (displayAttribute === undefined) {
        var returnAttributes = provider.node.getReturnAttributes(label);
        if (returnAttributes.length > 0) {
            displayAttribute = returnAttributes[0];
        } else {
            displayAttribute = provider.node.getConstraintAttribute(label);
        }
    }

    return displayAttribute
};

/**
 * Return a list of predefined constraint defined in the node label configuration.
 *
 * @param label
 * @returns {*}
 */
provider.node.getPredefinedConstraints = function (label) {
    return provider.node.getProperty(label, "getPredefinedConstraints")();
};

provider.node.filterResultQuery = function (label, initialQuery) {
    return provider.node.getProperty(label, "filterResultQuery")(initialQuery);
};

provider.node.getValueOrderByAttribute = function (label) {
    return provider.node.getProperty(label, "valueOrderByAttribute");
};

provider.node.isValueOrderAscending = function (label) {
    return provider.node.getProperty(label, "isValueOrderAscending");
};

provider.node.getResultOrderByAttribute = function (label) {
    return provider.node.getProperty(label, "resultOrderByAttribute");
};

/**
 *
 * @param label
 */
provider.node.isResultOrderAscending = function (label) {
    return provider.node.getProperty(label, "isResultOrderAscending");
};

/**
 * Return the value of the getTextValue function defined in the label provider corresponding to the parameter node.
 * If no "getTextValue" function is defined in the provider, search is done in parents.
 * If none is found in parent default provider method is used.
 *
 * @param node
 * @param parameter
 */
provider.node.getTextValue = function (node, parameter) {
    return provider.node.getProperty(node.label, "getTextValue")(node, parameter);
};


/**
 * Return the value of the getSemanticValue function defined in the label provider corresponding to the parameter node.
 * The semantic value is a more detailed description of the node used for example in the query viewer.
 * If no "getTextValue" function is defined in the provider, search is done in parents.
 * If none is found in parent default provider method is used.
 *
 * @param node
 * @returns {*}
 */
provider.node.getSemanticValue = function (node) {
    return provider.node.getProperty(node.label, "getSemanticValue")(node);
};

/**
 * Return a list of SVG paths objects, each defined by a "d" property containing the path and "f" property for the color.
 *
 * @param node
 * @returns {*}
 */
provider.node.getSVGPaths = function (node) {
    return provider.node.getProperty(node.label, "getSVGPaths")(node);
};

/**
 * Check in label provider if text must be displayed with images nodes.
 * @param node
 * @returns {*}
 */
provider.node.isTextDisplayed = function (node) {
    return provider.node.getProperty(node.label, "getIsTextDisplayed")(node);
};

/**
 *
 * @param node
 */
provider.node.getSize = function (node) {
    return provider.node.getProperty(node.label, "getSize")(node);
};

/**
 * Return the getColor property.
 *
 * @param node
 * @param style
 * @returns {*}
 */
provider.node.getColor = function (node, style) {
    return provider.node.getProperty(node.label, "getColor")(node, style);
};

/**
 *
 * @param node
 * @param element
 */
provider.node.getCSSClass = function (node, element) {
    return provider.node.getProperty(node.label, "getCSSClass")(node, element);
};

/**
 * Return the getIsGroup property.
 *
 * @param node
 * @returns {*}
 */
provider.node.getIsGroup = function (node) {
    return provider.node.getProperty(node.label, "getIsGroup")(node);
};

/**
 * Return the node display type.
 * can be TEXT, IMAGE, SVG or GROUP.
 *
 * @param node
 * @returns {*}
 */
provider.node.getNodeDisplayType = function (node) {
    return provider.node.getProperty(node.label, "getDisplayType")(node);
};

/**
 * Return the file path of the image defined in the provider.
 *
 * @param node the node to get the image path.
 * @returns {string} the path of the node image.
 */
provider.node.getImagePath = function (node) {
    return provider.node.getProperty(node.label, "getImagePath")(node);
};

/**
 * Return the width size of the node image.
 *
 * @param node the node to get the image width.
 * @returns {int} the image width.
 */
provider.node.getImageWidth = function (node) {
    return provider.node.getProperty(node.label, "getImageWidth")(node);
};

/**
 * Return the height size of the node image.
 *
 * @param node the node to get the image height.
 * @returns {int} the image height.
 */
provider.node.getImageHeight = function (node) {
    return provider.node.getProperty(node.label, "getImageHeight")(node);
};

provider.node.filterNodeValueQuery = function (node, initialQuery) {
    return provider.node.getProperty(node.label, "filterNodeValueQuery")(node, initialQuery);
};

provider.node.filterNodeCountQuery = function (node, initialQuery) {
    return provider.node.getProperty(node.label, "filterNodeCountQuery")(node, initialQuery);
};

provider.node.filterNodeRelationQuery = function (node, initialQuery) {
    return provider.node.getProperty(node.label, "filterNodeRelationQuery")(node, initialQuery);
};

provider.node.getGenerateNodeValueConstraints = function (node) {
    return provider.node.getProperty(node.label, "generateNodeValueConstraints");
};

provider.node.getGenerateNegativeNodeValueConstraints = function (node) {
    return provider.node.getProperty(node.label, "generateNegativeNodeValueConstraints");
};

/**
 * Return the displayResults function defined in label parameter's provider.
 *
 * @param label
 * @returns {*}
 */
provider.node.getDisplayResults = function (label) {
    return provider.node.getProperty(label, "displayResults");
};

/**
 * Label provider used by default if none have been defined for a label.
 * This provider can be changed if needed to customize default behavior.
 * If some properties are not found in user customized providers, default
 * values will be extracted from this provider.
 */
provider.node.DEFAULT_PROVIDER = (
    {
        /**********************************************************************
         * Label specific parameters:
         *
         * These attributes are specific to a node label and will be used for
         * every node having this label.
         **********************************************************************/

        /**
         * Defines whether this label can be used as root element of the graph
         * query builder.
         * This property is also used to determine whether the label can be
         * displayed in the taxonomy filter.
         *
         * The default value is true.
         */
        "isSearchable": true,

        /**
         * Defines whether this label will automatically expend its relations
         * when displayed on graph.
         * If set to true, once displayed additional request will be sent on
         * the database to retrieve its relations.
         *
         * The default value is false.
         */
        "autoExpandRelations": false,

        /**
         * Defines whether this label will automatically load its available
         * data displayed on graph.
         * If set to true, once displayed additional request will be sent on
         * the database to retrieve its possible values.
         *
         * The default value is false.
         */
        "isAutoLoadValue": false,

        /**
         * Defines the list of attribute to return for node of this label.
         * All the attributes listed here will be added in generated cypher
         * queries and available in result list and in node provider's
         * functions.
         *
         * The default value contains only the Neo4j internal id.
         * This id is used by default because it is a convenient way to identify
         * a node when nothing is known about its attributes.
         * But you should really consider using your application attributes
         * instead, it is a bad practice to rely on this attribute.
         */
        "returnAttributes": [query.NEO4J_INTERNAL_ID],

        /**
         * Defines the attribute used to order the value displayed on node.
         *
         * Default value is "count" attribute.
         */
        "valueOrderByAttribute": "count",

        /**
         * Defines whether the value query order by is ascending, if false order
         * by will be descending.
         *
         * Default value is false (descending)
         */
        "isValueOrderAscending": false,

        /**
         * Defines the attributes used to order the results.
         * It can be an attribute name or a list of attribute names.
         *
         * Default value is "null" to disable order by.
         */
        "resultOrderByAttribute": null,

        /**
         * Defines whether the result query order by is ascending, if false
         * order by will be descending.
         * It can be a boolean value or a list of boolean to match the resultOrderByAttribute.
         * If size of isResultOrderAscending < size of resultOrderByAttribute last value is used.
         *
         * Default value is true (ascending)
         */
        "isResultOrderAscending": true,

        /**
         * Defines the attribute of the node to use in query constraint for
         * nodes of this label.
         * This attribute is used in the generated cypher query to build the
         * constraints with selected values.
         *
         * The default value is the Neo4j internal id.
         * This id is used by default because it is a convenient way to
         * identify a node when nothing is known about its attributes.
         * But you should really consider using your application attributes
         * instead, it is a bad practice to rely on this attribute.
         */
        "constraintAttribute": query.NEO4J_INTERNAL_ID,

        /**
         * Defines the attribute of the node to use by default to display the node.
         * This attribute must be present in returnAttributes list.
         *
         * The default value is undefined.
         * If undefined the first attribute of the returnAttributes will be used or
         * constraintAttribute if the list is empty.
         */
        "displayAttribute": undefined,

        /**
         * Return the list of predefined constraints to add for the given label.
         * These constraints will be added in every generated Cypher query.
         *
         * For example if the returned list contain ["$identifier.born > 1976"]
         * for "Person" nodes everywhere in popoto.js the generated Cypher
         * query will add the constraint "WHERE person.born > 1976"
         *
         * @returns {Array}
         */
        "getPredefinedConstraints": function () {
            return [];
        },

        /**
         * Filters the query generated to retrieve the queries.
         *
         * @param initialQuery contains the query as an object structure.
         * @returns {*}
         */
        "filterResultQuery": function (initialQuery) {
            return initialQuery;
        },

        /**********************************************************************
         * Node specific parameters:
         *
         * These attributes are specific to nodes (in graph or query viewer)
         * for a given label.
         * But they can be customized for nodes of the same label.
         * The parameters are defined by a function that will be called with
         * the node as parameter.
         * In this function the node internal attributes can be used to
         * customize the value to return.
         **********************************************************************/

        /**
         * Function returning the display type of a node.
         * This type defines how the node will be drawn in the graph.
         *
         * The result must be one of the following values:
         *
         * provider.node.DisplayTypes.IMAGE
         *  In this case the node will be drawn as an image and "getImagePath"
         *  function is required to return the node image path.
         *
         * provider.node.DisplayTypes.SVG
         *  In this case the node will be drawn as SVG paths and "getSVGPaths"
         *
         * provider.node.DisplayTypes.TEXT
         *  In this case the node will be drawn as a simple circle.
         *
         * Default value is TEXT.
         *
         * @param node the node to extract its type.
         * @returns {number} one value from provider.node.DisplayTypes
         */
        "getDisplayType": function (node) {
            return provider.node.DisplayTypes.TEXT;
        },

        /**
         * Function defining the size of the node in graph.
         *
         * The size define the radius of the circle defining the node.
         * other elements (menu, counts...) will scale on this size.
         *
         * Default value is 50.
         *
         * @param node
         */
        "getSize": function (node) {
            return 50;
        },

        /**
         * Return a color for the node.
         *
         * @param node
         * @returns {*}
         */
        "getColor": function (node) {
            if (node.type === graph.node.NodeTypes.VALUE) {
                return provider.node.getColor(node.parent);
            } else {
                var parentLabel = "";
                if (node.hasOwnProperty("parent")) {
                    parentLabel = node.parent.label
                }

                var incomingRelation = node.parentRel || "";

                var colorId = parentLabel + incomingRelation + node.label;
                return provider.colorScale(colorId);
            }
        },

        /**
         * Generate a CSS class for the node depending on its type.
         *
         * @param node
         * @param element
         * @return {string}
         */
        "getCSSClass": function (node, element) {
            var labelAsCSSName = node.label.replace(/[^0-9a-z\-_]/gi, '');

            var cssClass = "ppt-node__" + element;

            if (node.type === graph.node.NodeTypes.ROOT) {
                cssClass = cssClass + "--root";
            }
            if (node.type === graph.node.NodeTypes.CHOOSE) {
                cssClass = cssClass + "--choose";
            }
            if (node.type === graph.node.NodeTypes.GROUP) {
                cssClass = cssClass + "--group";
            }
            if (node.type === graph.node.NodeTypes.VALUE) {
                cssClass = cssClass + "--value";
            }
            if (node.value !== undefined && node.value.length > 0) {
                cssClass = cssClass + "--value-selected";
            }
            if (node.count === 0) {
                cssClass = cssClass + "--disabled";
            }

            return cssClass + " " + labelAsCSSName;
        },

        /**
         * Function defining whether the node is a group node.
         * In this case no count are displayed and no value can be selected on
         * the node.
         *
         * Default value is false.
         */
        "getIsGroup": function (node) {
            return false;
        },

        /**
         * Function defining whether the node text representation must be
         * displayed on graph.
         * If true the value returned for getTextValue on node will be displayed
         * on graph.
         *
         * This text will be added in addition to the getDisplayType
         * representation.
         * It can be displayed on all type of node display, images, SVG or text.
         *
         * Default value is true
         *
         * @param node the node to display on graph.
         * @returns {boolean} true if text must be displayed on graph for the
         * node.
         */
        "getIsTextDisplayed": function (node) {
            return true;
        },

        /**
         * Function used to return the text representation of a node.
         *
         * The default behavior is to return the label of the node
         * or the value of constraint attribute of the node if it contains
         * value.
         *
         * The returned value is truncated using
         * graph.node.NODE_MAX_CHARS property.
         *
         * @param node the node to represent as text.
         * @param maxLength used to truncate the text.
         * @returns {string} the text representation of the node.
         */
        "getTextValue": function (node, maxLength) {
            var text = "";
            var displayAttr = provider.node.getDisplayAttribute(node.label);
            if (node.type === graph.node.NodeTypes.VALUE) {
                if (displayAttr === query.NEO4J_INTERNAL_ID) {
                    text = "" + node.internalID;
                } else {
                    text = "" + node.attributes[displayAttr];
                }
            } else {
                if (node.value !== undefined && node.value.length > 0) {
                    if (displayAttr === query.NEO4J_INTERNAL_ID) {
                        var separator = "";
                        node.value.forEach(function (value) {
                            text += separator + value.internalID;
                            separator = " or ";
                        });
                    } else {
                        var separator = "";
                        node.value.forEach(function (value) {
                            text += separator + value.attributes[displayAttr];
                            separator = " or ";
                        });
                    }
                } else {
                    text = node.label;
                }
            }

            return text;
        },

        /**
         * Function used to return a descriptive text representation of a link.
         * This representation should be more complete than getTextValue and can
         * contain semantic data.
         * This function is used for example to generate the label in the query
         * viewer.
         *
         * The default behavior is to return the getTextValue not truncated.
         *
         * @param node the node to represent as text.
         * @returns {string} the text semantic representation of the node.
         */
        "getSemanticValue": function (node) {
            var text = "";
            var displayAttr = provider.node.getDisplayAttribute(node.label);
            if (node.type === graph.node.NodeTypes.VALUE) {
                if (displayAttr === query.NEO4J_INTERNAL_ID) {
                    text = "" + node.internalID;
                } else {
                    text = "" + node.attributes[displayAttr];
                }
            } else {
                if (node.value !== undefined && node.value.length > 0) {
                    if (displayAttr === query.NEO4J_INTERNAL_ID) {
                        var separator = "";
                        node.value.forEach(function (value) {
                            text += separator + value.internalID;
                            separator = " or ";
                        });
                    } else {
                        var separator = "";
                        node.value.forEach(function (value) {
                            text += separator + value.attributes[displayAttr];
                            separator = " or ";
                        });
                    }
                } else {
                    text = node.label;
                }
            }
            return text;
        },

        /**
         * Function returning the image file path to use for a node.
         * This function is only used for provider.node.DisplayTypes.IMAGE
         * type nodes.
         *
         * @param node
         * @returns {string}
         */
        "getImagePath": function (node) {
            // if (node.type === graph.node.NodeTypes.VALUE) {
            //     var constraintAttribute = provider.node.getConstraintAttribute(node.label);
            //     return "image/node/value/" + node.label.toLowerCase() + "/" + node.attributes[constraintAttribute] + ".svg";
            // } else {
            return "image/node/" + node.label.toLowerCase() + "/" + node.label.toLowerCase() + ".svg";
            // }
        },

        /**
         * Function returning a array of path objects to display in the node.
         *
         * @param node
         * @returns {*[]}
         */
        "getSVGPaths": function (node) {
            var size = provider.node.getSize(node);
            return [
                {
                    "d": "M 0, 0 m -" + size + ", 0 a " + size + "," + size + " 0 1,0 " + 2 * size + ",0 a " + size + "," + size + " 0 1,0 -" + 2 * size + ",0",
                    "fill": "transparent",
                    "stroke": provider.node.getColor(node),
                    "stroke-width": "2px"
                }
            ];
        },

        /**
         * Function returning the image width of the node.
         * This function is only used for provider.node.DisplayTypes.IMAGE
         * type nodes.
         *
         * @param node
         * @returns {number}
         */
        "getImageWidth": function (node) {
            return provider.node.getSize(node) * 2;
        },

        /**
         * Function returning the image height of the node.
         * This function is only used for provider.node.DisplayTypes.IMAGE
         * type nodes.
         *
         * @param node
         * @returns {number}
         */
        "getImageHeight": function (node) {
            return provider.node.getSize(node) * 2;
        },

        /**
         * Filters the query generated to retrieve the values on a node.
         *
         * @param node
         * @param initialQuery contains the query as an object structure.
         * @returns {*}
         */
        "filterNodeValueQuery": function (node, initialQuery) {
            return initialQuery;
        },
        /**
         * Filters the query generated to retrieve the values on a node.
         *
         * @param node
         * @param initialQuery contains the query as an object structure.
         * @returns {*}
         */
        "filterNodeCountQuery": function (node, initialQuery) {
            return initialQuery;
        },
        /**
         * Filters the query used to retrieve the values on a node.
         *
         * @param node
         * @param initialQuery contains the query as an object structure.
         * @returns {*}
         */
        "filterNodeRelationQuery": function (node, initialQuery) {
            return initialQuery;
        },

        /**
         * Customize, in query, the generated constraint for the node.
         *
         * If undefined use default constraint generation.
         */
        "generateNodeValueConstraints": undefined,

        /**
         * Customize, in query, the generated negative constraint for the node.
         *
         * If undefined use default negative constraint generation.
         */
        "generateNegativeNodeValueConstraints": undefined,

        /**********************************************************************
         * Results specific parameters:
         *
         * These attributes are specific to result display.
         **********************************************************************/

        /**
         * Generate the result entry content using d3.js mechanisms.
         *
         * The parameter of the function is the &lt;p&gt; selected with d3.js
         *
         * The default behavior is to generate a &lt;table&gt; containing all
         * the return attributes in a &lt;th&gt; and their value in a &lt;td&gt;.
         *
         * @param pElmt the &lt;p&gt; element generated in the result list.
         */
        "displayResults": function (pElmt) {
            var result = pElmt.data()[0];
            var returnAttributes = provider.node.getReturnAttributes(result.label);

            returnAttributes.forEach(function (attribute) {
                var div = pElmt.append("div").attr("class", "ppt-result-attribute-div");
                var attributeName = attribute;

                if (query.NEO4J_INTERNAL_ID === attribute) {
                    attributeName = query.NEO4J_INTERNAL_ID.queryInternalName;
                }

                var span = div.append("span");
                span.text(function () {
                    if (attribute === query.NEO4J_INTERNAL_ID) {
                        return "internal ID:"
                    } else {
                        return attribute + ":";
                    }
                });
                if (result.attributes[attributeName] !== undefined) {
                    div.append("span").text(function (result) {
                        return result.attributes[attributeName];
                    });
                }
            });
        }
    });

export default provider
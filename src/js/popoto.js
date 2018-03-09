/**
 * Popoto.js is a JavaScript library built with D3.js providing a graph based search interface generated in HTML and SVG usable on any modern browser.
 * This library generates an interactive graph query builder into any website or web based application to create dynamic queries on Neo4j databases and display the results.
 *
 * Copyright (C) 2014-2018 Frederic Ciminera
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * contact@popotojs.com
 */
popoto = function () {
    var popoto = {
        version: "1.2.rc2"
    };

    /**
     * Main function to call to use Popoto.js.
     * This function will create all the HTML content based on available IDs in the page.
     * popoto.graph.containerId for the graph query builder.
     * popoto.queryviewer.containerId for the query viewer.
     *
     * @param startParam Root label or graph schema to use in the graph query builder.
     */
    popoto.start = function (startParam) {
        popoto.logger.info("Popoto " + popoto.version + " start on " + startParam);

        popoto.graph.mainLabel = startParam;

        if (popoto.rest.CYPHER_URL === undefined) {
            popoto.logger.error("popoto.rest.CYPHER_URL is not set but is required.");
        } else {
            // TODO introduce component generator mechanism instead for future plugin extensions
            popoto.checkHtmlComponents();

            if (popoto.taxonomy.isActive) {
                popoto.taxonomy.createTaxonomyPanel();
            }

            if (popoto.graph.isActive) {
                popoto.graph.createGraphArea();
                popoto.graph.createForceLayout();

                if (typeof startParam === 'string' || startParam instanceof String) {
                    var labelSchema = popoto.provider.node.getSchema(startParam);
                    if (labelSchema !== undefined) {
                        popoto.graph.addSchema(labelSchema);
                    } else {
                        popoto.graph.addRootNode(startParam);
                    }
                } else {
                    popoto.graph.addSchema(startParam);
                }
            }

            if (popoto.queryviewer.isActive) {
                popoto.queryviewer.createQueryArea();
            }

            if (popoto.cypherviewer.isActive) {
                popoto.cypherviewer.createQueryArea();
            }

            popoto.update();
        }
    };

    /**
     * Check in the HTML page the components to generate.
     */
    popoto.checkHtmlComponents = function () {
        var graphHTMLContainer = d3.select("#" + popoto.graph.containerId);
        var taxonomyHTMLContainer = d3.select("#" + popoto.taxonomy.containerId);
        var queryHTMLContainer = d3.select("#" + popoto.queryviewer.containerId);
        var cypherHTMLContainer = d3.select("#" + popoto.cypherviewer.containerId);
        var resultsHTMLContainer = d3.select("#" + popoto.result.containerId);

        if (graphHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.graph.containerId + "\" no graph area will be generated. This ID is defined in popoto.graph.containerId property.");
            popoto.graph.isActive = false;
        } else {
            popoto.graph.isActive = true;
        }

        if (taxonomyHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.taxonomy.containerId + "\" no taxonomy filter will be generated. This ID is defined in popoto.taxonomy.containerId property.");
            popoto.taxonomy.isActive = false;
        } else {
            popoto.taxonomy.isActive = true;
        }

        if (queryHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.queryviewer.containerId + "\" no query viewer will be generated. This ID is defined in popoto.queryviewer.containerId property.");
            popoto.queryviewer.isActive = false;
        } else {
            popoto.queryviewer.isActive = true;
        }

        if (cypherHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.cypherviewer.containerId + "\" no cypher query viewer will be generated. This ID is defined in popoto.cypherviewer.containerId property.");
            popoto.cypherviewer.isActive = false;
        } else {
            popoto.cypherviewer.isActive = true;
        }

        if (resultsHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.result.containerId + "\" no result area will be generated. This ID is defined in popoto.result.containerId property.");
            popoto.result.isActive = false;
        } else {
            popoto.result.isActive = true;
        }
    };

    /**
     * Function to call to update all the generated elements including svg graph, query viewer and generated results.
     */
    popoto.update = function () {
        popoto.updateGraph();

        // Do not update if rootNode is not valid.
        var root = popoto.graph.getRootNode();
        if (!root || root.label === undefined) {
            return;
        }

        if (popoto.queryviewer.isActive) {
            popoto.queryviewer.updateQuery();
        }
        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.updateQuery();
        }
        // Results are updated only if needed.
        // If id found in html page or if result listeners have been added.
        // In this case the query must be executed.
        if (popoto.result.isActive || popoto.result.resultListeners.length > 0 || popoto.result.resultCountListeners.length > 0 || popoto.result.graphResultListeners.length > 0) {
            popoto.result.updateResults();
        }
    };

    /**
     * Function to call to update the graph only.
     */
    popoto.updateGraph = function () {
        if (popoto.graph.isActive) {
            // Starts the D3.js force simulation.
            // This method must be called when the layout is first created, after assigning the nodes and links.
            // In addition, it should be called again whenever the nodes or links change.
            popoto.graph.force.start();
            popoto.graph.link.updateLinks();
            popoto.graph.node.updateNodes();
        }
    };

    // REST ------------------------------------------------------------------------------------------------------------
    popoto.rest = {};

    /**
     * Default REST URL used to call Neo4j server with cypher queries to execute.
     * This property should be updated to access to your own server.
     * @type {string}
     */
    popoto.rest.CYPHER_URL = "http://localhost:7474/db/data/transaction/commit";

    /**
     * Create JQuery ajax POST request to access Neo4j REST API.
     *
     * @param data data object containing Cypher query
     * @returns {*} the JQuery ajax request object.
     */
    popoto.rest.post = function (data) {
        var strData = JSON.stringify(data);
        popoto.logger.info("REST POST:" + strData);

        var settings = {
            type: "POST",
            beforeSend: function (request) {
                if (popoto.rest.AUTHORIZATION) {
                    request.setRequestHeader("Authorization", popoto.rest.AUTHORIZATION);
                }
            },
            contentType: "application/json",
            data: strData
        };

        if (popoto.rest.WITH_CREDENTIALS === true) {
            settings.xhrFields = {
                withCredentials: true
            }
        }

        return $.ajax(popoto.rest.CYPHER_URL, settings);
    };

    popoto.rest.response = {
        parse: function (data) {
            popoto.logger.debug(JSON.stringify((data)));
            var parsedData = [];

            if (data !== undefined && data.hasOwnProperty("results") && data.results.length > 0 && !(data.hasOwnProperty("errors") && data.errors.length > 0)) {
                parsedData = data.results.map(function (queryResults) {
                    var results = [];
                    for (var x = 0; x < queryResults.data.length; x++) {
                        var obj = {};

                        for (var i = 0; i < queryResults.columns.length; i++) {
                            obj[queryResults.columns[i]] = queryResults.data[x].row[i];
                        }

                        results.push(obj);
                    }
                    return results;
                });
            }

            popoto.logger.info(JSON.stringify((parsedData)));
            return parsedData
        }
    };

    // LOGGER -----------------------------------------------------------------------------------------------------------
    popoto.logger = {};
    popoto.logger.LogLevels = Object.freeze({DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4});
    popoto.logger.LEVEL = popoto.logger.LogLevels.NONE;
    popoto.logger.TRACE = false;

    /**
     * Log a message on console depending on configured log levels.
     * Level is define in popoto.logger.LEVEL property.
     * If popoto.logger.TRACE is set to true, the stack trace is also added in log.
     * @param logLevel Level of the message from popoto.logger.LogLevels.
     * @param message Message to log.
     */
    popoto.logger.log = function (logLevel, message) {
        if (console && logLevel >= popoto.logger.LEVEL) {
            if (popoto.logger.TRACE) {
                message = message + "\n" + new Error().stack
            }
            switch (logLevel) {
                case popoto.logger.LogLevels.DEBUG:
                    console.log(message);
                    break;
                case popoto.logger.LogLevels.INFO:
                    console.log(message);
                    break;
                case popoto.logger.LogLevels.WARN:
                    console.warn(message);
                    break;
                case popoto.logger.LogLevels.ERROR:
                    console.error(message);
                    break;
            }
        }
    };

    /**
     * Log a message in DEBUG level.
     * @param message to log.
     */
    popoto.logger.debug = function (message) {
        popoto.logger.log(popoto.logger.LogLevels.DEBUG, message);
    };

    /**
     * Log a message in INFO level.
     * @param message to log.
     */
    popoto.logger.info = function (message) {
        popoto.logger.log(popoto.logger.LogLevels.INFO, message);
    };

    /**
     * Log a message in WARN level.
     * @param message to log.
     */
    popoto.logger.warn = function (message) {
        popoto.logger.log(popoto.logger.LogLevels.WARN, message);
    };

    /**
     * Log a message in ERROR level.
     * @param message to log.
     */
    popoto.logger.error = function (message) {
        popoto.logger.log(popoto.logger.LogLevels.ERROR, message);
    };

    // TAXONOMIES  -----------------------------------------------------------------------------------------------------

    popoto.taxonomy = {};
    popoto.taxonomy.containerId = "popoto-taxonomy";

    /**
     * Create the taxonomy panel HTML elements.
     */
    popoto.taxonomy.createTaxonomyPanel = function () {
        var htmlContainer = d3.select("#" + popoto.taxonomy.containerId);

        var taxoUL = htmlContainer.append("ul")
            .attr("class", "ppt-taxo-ul");

        var data = popoto.taxonomy.generateTaxonomiesData();

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
                return "ppt-icon " + popoto.provider.taxonomy.getCSSClass(d.label, "span-icon");
            })
            .html("&nbsp;");

        taxoli.append("span")
            .attr("class", "ppt-label")
            .text(function (d) {
                return popoto.provider.taxonomy.getTextValue(d.label);
            });

        taxoli.append("span")
            .attr("class", "ppt-count");

        // Add an on click event on the taxonomy to clear the graph and set this label as root
        taxoli.on("click", popoto.taxonomy.onClick);

        popoto.taxonomy.addTaxonomyChildren(taxoli);

        // The count is updated for each labels.
        var flattenData = [];
        data.forEach(function (d) {
            flattenData.push(d);
            if (d.children) {
                popoto.taxonomy.flattenChildren(d, flattenData);
            }
        });

        if (!popoto.graph.DISABLE_COUNT) {
            popoto.taxonomy.updateCount(flattenData);
        }
    };

    /**
     * Recursive function to flatten data content.
     *
     */
    popoto.taxonomy.flattenChildren = function (d, vals) {
        d.children.forEach(function (c) {
            vals.push(c);
            if (c.children) {
                vals.concat(popoto.taxonomy.flattenChildren(c, vals));
            }
        });
    };

    /**
     * Updates the count number on a taxonomy.
     *
     * @param taxonomyData
     */
    popoto.taxonomy.updateCount = function (taxonomyData) {
        var statements = [];

        taxonomyData.forEach(function (taxo) {
            statements.push(
                {
                    "statement": popoto.query.generateTaxonomyCountQuery(taxo.label)
                }
            );
        });

        (function (taxonomies) {
            popoto.logger.info("Count taxonomies ==>");
            popoto.rest.post(
                {
                    "statements": statements
                })
                .done(function (response) {
                    popoto.logger.info("<== Count taxonomies");
                    var parsedData = popoto.rest.response.parse(response);
                    for (var i = 0; i < taxonomies.length; i++) {
                        var count = parsedData[i][0].count;
                        d3.select("#" + taxonomies[i].id)
                            .select(".ppt-count")
                            .text(" (" + count + ")");
                    }
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
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
    popoto.taxonomy.addTaxonomyChildren = function (selection) {
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
                        return "ppt-icon " + popoto.provider.taxonomy.getCSSClass(d.label, "span-icon");
                    })
                    .html("&nbsp;");

                childLi.append("span")
                    .attr("class", "ppt-label")
                    .text(function (d) {
                        return popoto.provider.taxonomy.getTextValue(d.label);
                    });

                childLi.append("span")
                    .attr("class", "ppt-count");

                childLi.on("click", popoto.taxonomy.onClick);

                popoto.taxonomy.addTaxonomyChildren(childLi);
            }

        });
    };

    popoto.taxonomy.onClick = function () {
        d3.event.stopPropagation();

        var label = this.attributes.value.value;

        while (popoto.graph.force.nodes().length > 0) {
            popoto.graph.force.nodes().pop();
        }

        while (popoto.graph.force.links().length > 0) {
            popoto.graph.force.links().pop();
        }

        // Reinitialize internal label generator
        popoto.graph.node.internalLabels = {};

        popoto.update();
        popoto.graph.mainLabel = label;
        if (popoto.provider.node.getSchema(label) !== undefined) {
            popoto.graph.addSchema(popoto.provider.node.getSchema(label));
        } else {
            popoto.graph.addRootNode(label);
        }
        popoto.graph.hasGraphChanged = true;
        popoto.result.hasChanged = true;
        popoto.graph.ignoreCount = false;
        popoto.update();
        popoto.tools.center();
    };

    /**
     * Parse the list of label providers and return a list of data object containing only searchable labels.
     * @returns {Array}
     */
    popoto.taxonomy.generateTaxonomiesData = function () {
        var id = 0;
        var data = [];
        // Retrieve root providers (searchable and without parent)
        for (var label in popoto.provider.node.Provider) {
            if (popoto.provider.node.Provider.hasOwnProperty(label)) {
                if (popoto.provider.node.getProperty(label, "isSearchable") && !popoto.provider.node.Provider[label].parent) {
                    data.push({
                        "label": label,
                        "id": "popoto-lbl-" + id++
                    });
                }
            }
        }

        // Add children data for each provider with children.
        data.forEach(function (d) {
            if (popoto.provider.node.getProvider(d.label).hasOwnProperty("children")) {
                id = popoto.taxonomy.addChildrenData(d, id);
            }
        });

        return data;
    };

    /**
     * Add children providers data.
     * @param parentData
     * @param id
     */
    popoto.taxonomy.addChildrenData = function (parentData, id) {
        parentData.children = [];

        popoto.provider.node.getProvider(parentData.label).children.forEach(function (d) {
            var childProvider = popoto.provider.node.getProvider(d);
            var childData = {
                "label": d,
                "id": "popoto-lbl-" + id++
            };
            if (childProvider.hasOwnProperty("children")) {
                id = popoto.taxonomy.addChildrenData(childData, id);
            }
            if (popoto.provider.node.getProperty(d, "isSearchable")) {
                parentData.children.push(childData);
            }
        });

        return id;
    };

    // TOOLIP -----------------------------------------------------------------------------------------------------------

    popoto.tootip = {};

    // TOOLS -----------------------------------------------------------------------------------------------------------

    popoto.tools = {};
    // TODO introduce plugin mechanism to add tools
    popoto.tools.CENTER_GRAPH = true;
    popoto.tools.RESET_GRAPH = true;
    popoto.tools.SAVE_GRAPH = false;
    popoto.tools.TOGGLE_TAXONOMY = true;
    popoto.tools.TOGGLE_FULL_SCREEN = true;
    popoto.tools.TOGGLE_VIEW_RELATION = true;

    /**
     * Reset the graph to display the root node only.
     */
    popoto.tools.reset = function () {
        while (popoto.graph.force.nodes().length > 0) {
            popoto.graph.force.nodes().pop();
        }

        while (popoto.graph.force.links().length > 0) {
            popoto.graph.force.links().pop();
        }

        // Reinitialize internal label generator
        popoto.graph.node.internalLabels = {};

        popoto.update();
        if (typeof popoto.graph.mainLabel === 'string' || popoto.graph.mainLabel instanceof String) {
            if (popoto.provider.node.getSchema(popoto.graph.mainLabel) !== undefined) {
                popoto.graph.addSchema(popoto.provider.node.getSchema(popoto.graph.mainLabel));
            } else {
                popoto.graph.addRootNode(popoto.graph.mainLabel);
            }
        } else {
            popoto.graph.addSchema(popoto.graph.mainLabel);
        }

        popoto.graph.hasGraphChanged = true;
        popoto.result.hasChanged = true;
        popoto.update();
        popoto.tools.center();
    };

    /**
     * Reset zoom and center the view on svg center.
     */
    popoto.tools.center = function () {
        popoto.graph.zoom.translate([0, 0]).scale(1);
        popoto.graph.svg.transition().attr("transform", "translate(" + popoto.graph.zoom.translate() + ")" + " scale(" + popoto.graph.zoom.scale() + ")");
    };

    /**
     * Show, hide taxonomy panel.
     */
    popoto.tools.toggleTaxonomy = function () {
        var taxo = d3.select("#" + popoto.taxonomy.containerId);
        if (taxo.filter(".disabled").empty()) {
            taxo.classed("disabled", true);
        } else {
            taxo.classed("disabled", false);
        }

        popoto.graph.centerRootNode();
    };

    /**
     * Show, hide relation donuts.
     */
    popoto.tools.toggleViewRelation = function () {
        popoto.graph.DISABLE_RELATION = !popoto.graph.DISABLE_RELATION;
        d3.selectAll(".ppt-g-node-background").classed("hide", popoto.graph.DISABLE_RELATION);
        popoto.graph.tick();
    };

    popoto.tools.toggleFullScreen = function () {

        var elem = document.getElementById(popoto.graph.containerId);

        if (!document.fullscreenElement &&    // alternative standard method
            !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {  // current working methods
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    };
    // GRAPH -----------------------------------------------------------------------------------------------------------

    popoto.graph = {};
    // Counter used internally to generate unique id in graph elements (like nodes and links)
    popoto.graph.idGen = 0;

    /**
     * ID of the HTML component where the graph query builder elements will be generated in.
     * @type {string}
     */
    popoto.graph.containerId = "popoto-graph";
    popoto.graph.hasGraphChanged = true;
    // Defines the min and max level of zoom available in graph query builder.
    popoto.graph.zoom = d3.behavior.zoom().scaleExtent([0.1, 10]);
    popoto.graph.WHEEL_ZOOM_ENABLED = true;
    popoto.graph.TOOL_TAXONOMY = "Show/hide taxonomy panel";
    popoto.graph.TOOL_RELATION = "Show/hide relation";
    popoto.graph.TOOL_CENTER = "Center view";
    popoto.graph.TOOL_FULL_SCREEN = "Full screen";
    popoto.graph.TOOL_RESET = "Reset graph";
    popoto.graph.TOOL_SAVE = "Save graph";
    popoto.graph.USE_DONUT_FORCE = false;
    popoto.graph.USE_VORONOI_LAYOUT = false;
    /**
     * Define the list of listenable events on graph.
     */
    popoto.graph.Events = Object.freeze({
        NODE_ROOT_ADD: "root.node.add",
        NODE_EXPAND_RELATIONSHIP: "node.expandRelationship",
        GRAPH_SAVE: "graph.save",
        GRAPH_RESET: "graph.reset",
        GRAPH_NODE_VALUE_EXPAND: "graph.node.value_expand",
        GRAPH_NODE_VALUE_COLLAPSE: "graph.node.value_collapse",
        GRAPH_NODE_ADD_VALUE: "graph.node.add_value",
        GRAPH_NODE_DATA_LOADED: "graph.node.data_loaded"
    });

    popoto.graph.generateId = function () {
        return popoto.graph.idGen++;
    };

    popoto.graph.listeners = {};

    /**
     * Add a listener to the specified event.
     *
     * @param event name of the event to add the listener.
     * @param listener the listener to add.
     */
    popoto.graph.on = function (event, listener) {
        if (!popoto.graph.listeners.hasOwnProperty(event)) {
            popoto.graph.listeners[event] = [];
        }

        popoto.graph.listeners[event].push(listener);
    };

    /**
     * Notify the listeners.
     *
     * @param event
     * @param parametersArray
     */
    popoto.graph.notifyListeners = function (event, parametersArray) {
        if (popoto.graph.listeners.hasOwnProperty(event)) {
            popoto.graph.listeners[event].forEach(function (listener) {
                listener.apply(event, parametersArray);
            });
        }
    };

    /**
     * Add a listener on graph save event.
     * @param listener
     */
    popoto.graph.onSave = function (listener) {
        popoto.graph.on(popoto.graph.Events.GRAPH_SAVE, listener);
    };

    /**
     * Add a listener on graph reset event.
     * @param listener
     */
    popoto.graph.onReset = function (listener) {
        popoto.graph.on(popoto.graph.Events.GRAPH_RESET, listener);
    };

    /**
     * Set default graph to a predefined value.
     * @param graph
     */
    popoto.graph.setDefaultGraph = function (graph) {
        popoto.graph.mainLabel = graph;
    };

    /**
     * Generates all the HTML and SVG element needed to display the graph query builder.
     * Everything will be generated in the container with id defined by popoto.graph.containerId.
     */
    popoto.graph.createGraphArea = function () {

        var htmlContainer = d3.select("#" + popoto.graph.containerId);

        var toolbar = htmlContainer
            .append("div")
            .attr("class", "ppt-toolbar");

        if (popoto.tools.TOGGLE_VIEW_RELATION) {
            toolbar.append("span")
                .attr("id", "popoto-toggle-relation")
                .attr("class", "ppt-icon ppt-menu relation")
                .attr("title", popoto.graph.TOOL_RELATION)
                .on("click", function () {
                    popoto.tools.toggleViewRelation();
                });
        }

        if (popoto.tools.RESET_GRAPH) {
            toolbar.append("span")
                .attr("id", "popoto-reset-menu")
                .attr("class", "ppt-icon ppt-menu reset")
                .attr("title", popoto.graph.TOOL_RESET)
                .on("click", function () {
                    popoto.graph.notifyListeners(popoto.graph.Events.GRAPH_RESET, []);
                    popoto.tools.reset();
                });
        }

        if (popoto.taxonomy.isActive && popoto.tools.TOGGLE_TAXONOMY) {
            toolbar.append("span")
                .attr("id", "popoto-taxonomy-menu")
                .attr("class", "ppt-icon ppt-menu taxonomy")
                .attr("title", popoto.graph.TOOL_TAXONOMY)
                .on("click", popoto.tools.toggleTaxonomy);
        }

        if (popoto.tools.CENTER_GRAPH) {
            toolbar.append("span")
                .attr("id", "popoto-center-menu")
                .attr("class", "ppt-icon ppt-menu center")
                .attr("title", popoto.graph.TOOL_CENTER)
                .on("click", popoto.tools.center);
        }

        if (popoto.tools.TOGGLE_FULL_SCREEN) {
            toolbar.append("span")
                .attr("id", "popoto-fullscreen-menu")
                .attr("class", "ppt-icon ppt-menu fullscreen")
                .attr("title", popoto.graph.TOOL_FULL_SCREEN)
                .on("click", popoto.tools.toggleFullScreen);
        }

        if (popoto.tools.SAVE_GRAPH) {
            toolbar.append("span")
                .attr("id", "popoto-save-menu")
                .attr("class", "ppt-icon ppt-menu save")
                .attr("title", popoto.graph.TOOL_SAVE)
                .on("click", function () {
                    popoto.graph.notifyListeners(popoto.graph.Events.GRAPH_SAVE, [popoto.graph.getSchema()]);
                });
        }

        var svgTag = htmlContainer.append("svg")
        // .attr("viewBox", "0 0 800 600") TODO to avoid need of windows resize event
            .call(popoto.graph.zoom.on("zoom", popoto.graph.rescale));

        svgTag.on("dblclick.zoom", null)
            .attr("class", "ppt-svg-graph");

        if (!popoto.graph.WHEEL_ZOOM_ENABLED) {
            // Disable mouse wheel events.
            svgTag.on("wheel.zoom", null)
                .on("mousewheel.zoom", null);
        }

        // Objects created inside a <defs> element are not rendered immediately; instead, think of them as templates or macros created for future use.
        popoto.graph.svgdefs = svgTag.append("defs");

        // Cross marker for path with id #cross -X-
        popoto.graph.svgdefs.append("marker")
            .attr({
                "id": "cross",
                "refX": 10,
                "refY": 10,
                "markerWidth": 20,
                "markerHeight": 20,
                "markerUnits": "strokeWidth",
                "orient": "auto"
            })
            .append("path")
            .attr("class", "ppt-marker-cross")
            .attr("d", "M5,5 L15,15 M15,5 L5,15");

        // Triangle marker for paths with id #arrow --|>
        popoto.graph.svgdefs.append("marker")
            .attr({
                "id": "arrow",
                "refX": 9,
                "refY": 3,
                "markerWidth": 10,
                "markerHeight": 10,
                "markerUnits": "strokeWidth",
                "orient": "auto"
            })
            .append("path")
            .attr("class", "ppt-marker-arrow")
            .attr("d", "M0,0 L0,6 L9,3 z");

        // Reversed triangle marker for paths with id #reverse-arrow <|--
        popoto.graph.svgdefs.append("marker")
            .attr({
                "id": "reverse-arrow",
                "refX": 0,
                "refY": 3,
                "markerWidth": 10,
                "markerHeight": 10,
                "markerUnits": "strokeWidth",
                "orient": "auto"
            })
            .append("path")
            .attr("class", "ppt-marker-reverse-arrow")
            .attr("d", "M0,3 L9,6 L9,0 z");

        // Gray scale filter for images.
        var grayscaleFilter = popoto.graph.svgdefs.append("filter")
            .attr("id", "grayscale");

        grayscaleFilter.append("feColorMatrix")
            .attr("type", "saturate")
            .attr("values", "0");

        // to change brightness
        // var feCT = grayscaleFilter
        //     .append("feComponentTransfer");
        //
        // feCT.append("feFuncR")
        //     .attr("type", "linear")
        //     .attr("slope", "0.2");
        //
        // feCT.append("feFuncG")
        //     .attr("type", "linear")
        //     .attr("slope", "0.2");
        //
        // feCT.append("feFuncB")
        //     .attr("type", "linear")
        //     .attr("slope", "0.2");

        // gooey
        var filter = popoto.graph.svgdefs.append("filter").attr("id", "gooey");
        filter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", "10")
            //to fix safari: http://stackoverflow.com/questions/24295043/svg-gaussian-blur-in-safari-unexpectedly-lightens-image
            .attr("color-interpolation-filters", "sRGB")
            .attr("result", "blur");
        filter.append("feColorMatrix")
            .attr("class", "blurValues")
            .attr("in", "blur")
            .attr("mode", "matrix")
            .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -6")
            .attr("result", "gooey");
        filter.append("feBlend")
            .attr("in", "SourceGraphic")
            .attr("in2", "gooey")
            .attr("operator", "atop");


        popoto.graph.svgdefs.append("g")
            .attr("id", "voronoi-clip-path");

        popoto.graph.svg = svgTag.append("svg:g");

        // Create two separated area for links and nodes
        // Links and nodes are separated in a dedicated "g" element
        // and nodes are generated after links to ensure that nodes are always on foreground.
        popoto.graph.svg.append("g").attr("id", popoto.graph.link.gID);
        popoto.graph.svg.append("g").attr("id", popoto.graph.node.gID);

        // This listener is used to center the root node in graph during a window resize.
        // TODO can the listener be limited on the parent container only?
        window.addEventListener('resize', popoto.graph.centerRootNode);
    };

    popoto.graph.centerRootNode = function () {
        popoto.graph.getRootNode().px = popoto.graph.getSVGWidth() / 2;
        popoto.graph.getRootNode().py = popoto.graph.getSVGHeight() / 2;
        popoto.update();
    };

    /**
     * Get the actual width of the SVG element containing the graph query builder.
     * @returns {number}
     */
    popoto.graph.getSVGWidth = function () {
        if (typeof popoto.graph.svg == 'undefined' || popoto.graph.svg.empty()) {
            popoto.logger.debug("popoto.graph.svg is undefined or empty.");
            return 0;
        } else {
            return document.getElementById(popoto.graph.containerId).clientWidth;
        }
    };

    /**
     * Get the actual height of the SVG element containing the graph query builder.
     * @returns {number}
     */
    popoto.graph.getSVGHeight = function () {
        if (typeof popoto.graph.svg == 'undefined' || popoto.graph.svg.empty()) {
            popoto.logger.debug("popoto.graph.svg is undefined or empty.");
            return 0;
        } else {
            return document.getElementById(popoto.graph.containerId).clientHeight;
        }
    };

    /**
     * Function to call on SVG zoom event to update the svg transform attribute.
     */
    popoto.graph.rescale = function () {
        var trans = d3.event.translate,
            scale = d3.event.scale;

        popoto.graph.svg.attr("transform",
            "translate(" + trans + ")"
            + " scale(" + scale + ")");
    };

    /******************************
     * Default parameters used to configure D3.js force layout.
     * These parameter can be modified to change graph behavior.
     ******************************/
    popoto.graph.LINK_STRENGTH = 1;
    popoto.graph.FRICTION = 0.8;
    popoto.graph.CHARGE = -1400;
    popoto.graph.THETA = 0.8;
    popoto.graph.GRAVITY = 0.0;

    /**
     *  Create the D3.js force layout for the graph query builder.
     */
    popoto.graph.createForceLayout = function () {

        popoto.graph.force = d3.layout.force()
            .size([popoto.graph.getSVGWidth(), popoto.graph.getSVGHeight()])
            .linkDistance(popoto.provider.link.getDistance)
            .linkStrength(function (d) {
                if (d.linkStrength) {
                    return d.linkStrength;
                } else {
                    return popoto.graph.LINK_STRENGTH;
                }
            })
            .friction(popoto.graph.FRICTION)
            .charge(function (d) {
                if (d.charge) {
                    return d.charge;
                } else {
                    return popoto.graph.CHARGE;
                }
            })
            .theta(popoto.graph.THETA)
            .gravity(popoto.graph.GRAVITY)
            .on("tick", popoto.graph.tick); // Function called on every position update done by D3.js

        // Disable event propagation on drag to avoid zoom and pan issues
        popoto.graph.force.drag()
            .on("dragstart", function (d) {
                d3.event.sourceEvent.stopPropagation();
            })
            .on("dragend", function (d) {
                d3.event.sourceEvent.stopPropagation();
            });
    };

    /**
     * Adds graph root nodes using the label set as parameter.
     * All the other nodes should have been removed first to avoid inconsistent data.
     *
     * @param label label of the node to add as root.
     */
    popoto.graph.addRootNode = function (label) {
        if (popoto.graph.force.nodes().length > 0) {
            popoto.logger.warn("popoto.graph.addRootNode is called but the graph is not empty.");
        }
        if (popoto.provider.node.getSchema(label) !== undefined) {
            popoto.graph.addSchema(popoto.provider.node.getSchema(label));
        } else {

            var node = {
                "id": popoto.graph.generateId(),
                "type": popoto.graph.node.NodeTypes.ROOT,
                // x and y coordinates are set to the center of the SVG area.
                // These coordinate will never change at runtime except if the window is resized.
                "x": popoto.graph.getSVGWidth() / 2,
                "y": popoto.graph.getSVGHeight() / 2,
                "tx": popoto.graph.getSVGWidth() / 2,
                "ty": popoto.graph.getSVGHeight() / 2,
                "label": label,
                // The node is fixed to always remain in the center of the svg area.
                // This property should not be changed at runtime to avoid issues with the zoom and pan.
                "fixed": true,
                // Label used internally to identify the node.
                // This label is used for example as cypher query identifier.
                "internalLabel": popoto.graph.node.generateInternalLabel(label),
                // List of relationships
                "relationships": [],
                "isAutoLoadValue": popoto.provider.node.getIsAutoLoadValue(label) === true
            };

            popoto.graph.force.nodes().push(node);
            popoto.graph.notifyListeners(popoto.graph.Events.NODE_ROOT_ADD, [node]);

            popoto.graph.node.loadRelationshipData(node, function (relationships) {
                node.relationships = relationships;

                if (popoto.provider.node.getIsAutoExpandRelations(label)) {

                    popoto.graph.ignoreCount = true;
                    popoto.graph.node.expandRelationships(node, function () {

                        popoto.graph.ignoreCount = false;
                        popoto.graph.hasGraphChanged = true;
                        popoto.updateGraph();
                    })
                } else {
                    popoto.graph.hasGraphChanged = true;
                    popoto.updateGraph();
                }
            }, Math.PI / 2)
        }
    };

    /**
     * Adds a complete graph from schema.
     * All the other nodes should have been removed first to avoid inconsistent data.
     *
     * @param graphSchema schema of the graph to add.
     */
    popoto.graph.addSchema = function (graphSchema) {
        if (popoto.graph.force.nodes().length > 0) {
            popoto.logger.warn("popoto.graph.addSchema is called but the graph is not empty.");
        }

        var rootNodeSchema = graphSchema;

        var rootNode = {
            "id": popoto.graph.generateId(),
            "type": popoto.graph.node.NodeTypes.ROOT,
            // x and y coordinates are set to the center of the SVG area.
            // These coordinate will never change at runtime except if the window is resized.
            "x": popoto.graph.getSVGWidth() / 2,
            "y": popoto.graph.getSVGHeight() / 2,
            "tx": popoto.graph.getSVGWidth() / 2,
            "ty": popoto.graph.getSVGHeight() / 2,
            "label": rootNodeSchema.label,
            // The node is fixed to always remain in the center of the svg area.
            // This property should not be changed at runtime to avoid issues with the zoom and pan.
            "fixed": true,
            // Label used internally to identify the node.
            // This label is used for example as cypher query identifier.
            "internalLabel": popoto.graph.node.generateInternalLabel(rootNodeSchema.label),
            // List of relationships
            "relationships": [],
            "isAutoLoadValue": popoto.provider.node.getIsAutoLoadValue(rootNodeSchema.label) === true
        };

        popoto.graph.force.nodes().push(rootNode);
        popoto.graph.notifyListeners(popoto.graph.Events.NODE_ROOT_ADD, [rootNode]);

        if (rootNodeSchema.hasOwnProperty("rel") && rootNodeSchema.rel.length > 0) {
            var directionAngle = (Math.PI / 2);

            rootNode.relationships = popoto.graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(rootNodeSchema.rel).map(function (d) {
                return {
                    id: d.data.label + d.data.target.label,
                    label: d.data.label,
                    target: d.data.target.label,
                    count: 0,
                    startAngle: d.startAngle,
                    endAngle: d.endAngle,
                    directionAngle: (d.startAngle + d.endAngle) / 2
                }
            });
        }

        // if (!isCollapsed && rootNodeSchema.hasOwnProperty("rel")) {
        //     for (var linkIndex = 0; linkIndex < rootNodeSchema.rel.length; linkIndex++) {
        //         popoto.graph.addSchemaRelation(rootNodeSchema.rel[linkIndex], rootNode, linkIndex + 1, rootNodeSchema.rel.length);
        //     }
        // }
    };

    popoto.graph.addSchemaRelation = function (relationSchema, parentNode, linkIndex, parentLinkTotalCount) {
        var targetNodeSchema = relationSchema.target;
        var target = popoto.graph.addSchemaNode(targetNodeSchema, parentNode, linkIndex, parentLinkTotalCount, relationSchema.label);

        var newLink = {
            id: "l" + popoto.graph.generateId(),
            source: parentNode,
            target: target,
            type: popoto.graph.link.LinkTypes.RELATION,
            label: relationSchema.label,
            schema: relationSchema
        };

        popoto.graph.force.links().push(
            newLink
        );
    };

    popoto.graph.addSchemaNode = function (nodeSchema, parentNode, index, parentLinkTotalCount, parentRel) {
        var isGroupNode = popoto.provider.node.getIsGroup(nodeSchema);
        var isCollapsed = nodeSchema.hasOwnProperty("collapsed") && nodeSchema.collapsed === true;

        var parentAngle = popoto.graph.computeParentAngle(parentNode);

        var angleDeg;
        if (parentAngle) {
            angleDeg = (((360 / (parentLinkTotalCount + 1)) * index));
        } else {
            angleDeg = (((360 / (parentLinkTotalCount)) * index));
        }

        var nx = parentNode.x + (200 * Math.cos((angleDeg * (Math.PI / 180)) - parentAngle)),
            ny = parentNode.y + (200 * Math.sin((angleDeg * (Math.PI / 180)) - parentAngle));

        // TODO add force coordinate X X X
        // var tx = nx + ((popoto.provider.link.getDistance(newLink)) * Math.cos(link.directionAngle - Math.PI / 2));
        // var ty = ny + ((popoto.provider.link.getDistance(newLink)) * Math.sin(link.directionAngle - Math.PI / 2));

        var node = {
            "id": popoto.graph.generateId(),
            "parent": parentNode,
            "parentRel": parentRel,
            "type": (isGroupNode) ? popoto.graph.node.NodeTypes.GROUP : popoto.graph.node.NodeTypes.CHOOSE,
            "label": nodeSchema.label,
            "fixed": false,
            "internalLabel": popoto.graph.node.generateInternalLabel(nodeSchema.label),
            "x": nx,
            "y": ny,
            "schema": nodeSchema,
            "isAutoLoadValue": popoto.provider.node.getIsAutoLoadValue(nodeSchema.label) === true,
            "relationships": []
        };

        if (nodeSchema.hasOwnProperty("rel") && nodeSchema.rel.length > 0) {
            var relMap = {};
            var relSegments = [];

            for (var i = 0; i < nodeSchema.rel.length; i++) {
                var rel = nodeSchema.rel[i];
                var id = rel.label + rel.target.label;

                if (!relMap.hasOwnProperty(id)) {
                    relMap[id] = rel;
                    relSegments.push(rel);
                }

            }

            node.relationships = popoto.graph.node.pie(relSegments).map(function (d) {
                return {
                    id: d.data.label + d.data.target.label,
                    count: d.data.count || 0,
                    label: d.data.label,
                    target: d.data.target.label,
                    startAngle: d.startAngle,
                    endAngle: d.endAngle,
                    directionAngle: (d.startAngle + d.endAngle) / 2
                }
            });

        }

        if (nodeSchema.hasOwnProperty("value")) {
            var nodeSchemaValue = [].concat(nodeSchema.value);
            node.value = [];
            nodeSchemaValue.forEach(function (value) {
                node.value.push(
                    {
                        "id": popoto.graph.generateId(),
                        "parent": node,
                        "attributes": value,
                        "type": popoto.graph.node.NodeTypes.VALUE,
                        "label": node.label
                    }
                );
            });
        }

        popoto.graph.force.nodes().push(node);

        if (!isCollapsed && nodeSchema.hasOwnProperty("rel")) {
            for (var linkIndex = 0; linkIndex < nodeSchema.rel.length; linkIndex++) {
                popoto.graph.addSchemaRelation(nodeSchema.rel[linkIndex], node, linkIndex + 1, nodeSchema.rel.length);
            }
        }

        return node;
    };

    /**
     * Get the graph root node.
     * @returns {*}
     */
    popoto.graph.getRootNode = function () {
        if (popoto.graph.force !== undefined) {
            return popoto.graph.force.nodes()[0];
        }
    };

    /**
     * Get the current schema of the graph.
     * @returns {{}}
     */
    popoto.graph.getSchema = function () {

        function isLeaf(node) {
            var links = popoto.graph.force.links();
            if (links.length > 0) {
                links.forEach(function (link) {
                    if (link.source === node) {
                        return false;
                    }
                });
            }
            return true;
        }

        var nodesMap = {};

        var rootNode = popoto.graph.getRootNode();

        nodesMap[rootNode.id] = {
            label: rootNode.label
        };

        if (rootNode.hasOwnProperty("value")) {
            nodesMap[rootNode.id].value = [];
            rootNode.value.forEach(function (value) {
                nodesMap[rootNode.id].value.push(value.attributes)
            });
        }

        var links = popoto.graph.force.links();
        if (links.length > 0) {
            links.forEach(function (link) {
                if (link.type === popoto.graph.link.LinkTypes.RELATION) {
                    var sourceNode = link.source;
                    var targetNode = link.target;

                    if (!nodesMap.hasOwnProperty(sourceNode.id)) {
                        nodesMap[sourceNode.id] = {
                            label: sourceNode.label
                        };
                        if (sourceNode.hasOwnProperty("value")) {
                            nodesMap[sourceNode.id].value = [];
                            sourceNode.value.forEach(function (value) {
                                nodesMap[sourceNode.id].value.push(value.attributes);
                            });
                        }
                    }

                    if (!nodesMap.hasOwnProperty(targetNode.id)) {
                        nodesMap[targetNode.id] = {
                            label: targetNode.label
                        };
                        if (targetNode.hasOwnProperty("value")) {
                            nodesMap[targetNode.id].value = [];
                            targetNode.value.forEach(function (value) {
                                nodesMap[targetNode.id].value.push(value.attributes);
                            });
                        }
                        if (isLeaf(targetNode) && targetNode.hasOwnProperty("relationships") && targetNode.relationships.length > 0) {

                            nodesMap[targetNode.id].rel = [];
                            nodesMap[targetNode.id].collapsed = true;
                            targetNode.relationships.forEach(function (relationship) {
                                var rel = {
                                    label: relationship.label,
                                    target: {label: relationship.target}
                                };

                                nodesMap[targetNode.id].rel.push(rel);
                            });
                        }
                    }

                    if (!nodesMap[sourceNode.id].hasOwnProperty("rel")) {
                        nodesMap[sourceNode.id].rel = [];
                    }

                    var rel = {
                        label: link.label,
                        target: nodesMap[targetNode.id]
                    };

                    nodesMap[sourceNode.id].rel.push(rel);
                }
            });

        }

        return nodesMap[rootNode.id];
    };

    /**
     * Function to call on D3.js force layout tick event.
     * This function will update the position of all links and nodes elements in the graph with the force layout computed coordinate.
     */
    popoto.graph.tick = function (e) {
        var paths = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g");

        // Update link paths
        paths.selectAll(".ppt-link")
            .attr("d", function (d) {
                var parentAngle = popoto.graph.computeParentAngle(d.target);
                var sourceMargin = popoto.provider.node.getSize(d.source);
                var targetMargin = popoto.provider.node.getSize(d.target);

                if (!popoto.graph.DISABLE_RELATION && d.source.hasOwnProperty("relationships") && d.source.relationships.length > 0) {
                    sourceMargin = popoto.graph.node.getDonutOuterRadius(d.source);
                }

                if (!popoto.graph.DISABLE_RELATION && d.target.hasOwnProperty("relationships") && d.target.relationships.length > 0) {
                    targetMargin = popoto.graph.node.getDonutOuterRadius(d.target);
                }

                var targetX = d.target.x + ((targetMargin) * Math.cos(parentAngle)),
                    targetY = d.target.y - ((targetMargin) * Math.sin(parentAngle));

                var sourceX = d.source.x - ((sourceMargin) * Math.cos(parentAngle)),
                    sourceY = d.source.y + ((sourceMargin) * Math.sin(parentAngle));

                // Add an intermediate point in path center
                var middleX = (targetX + sourceX) / 2,
                    middleY = (targetY + sourceY) / 2;

                if (d.source.x <= d.target.x || popoto.graph.ignoreMirroLinkLabels === true) {
                    return "M" + sourceX + " " + sourceY + "L" + middleX + " " + middleY + "L" + targetX + " " + targetY;
                } else {
                    return "M" + targetX + " " + targetY + "L" + middleX + " " + middleY + "L" + sourceX + " " + sourceY;
                }
            })
            .attr("marker-end", function (d) {
                if (popoto.graph.link.SHOW_MARKER && d.source.x <= d.target.x) {
                    return "url(#arrow)";
                } else {
                    return null;
                }
            })
            .attr("marker-start", function (d) {
                if (popoto.graph.link.SHOW_MARKER && d.source.x > d.target.x) {
                    return "url(#reverse-arrow)";
                } else {
                    return null;
                }
            });

        // Workaround to WebKit browsers:
        // Updating a path element by itself does not trigger redraw on dependent elements that reference this path.
        // So, even though we update the path, the referencing textPath element will not be redrawn.
        // To workaround this update bug, the xlink:href attribute to “#path” is updated.
        paths.selectAll(".ppt-textPath")
            .attr("xlink:href", function (d) {
                return "#ppt-path_" + d.id;
            });

        if (popoto.graph.USE_DONUT_FORCE === true) {

            var k = .1 * e.alpha;

            // Push nodes toward their designated focus.
            popoto.graph.force.nodes().forEach(function (n) {
                if (n.tx !== undefined && n.ty !== undefined) {
                    n.y += (n.ty - n.y) * k;
                    n.x += (n.tx - n.x) * k;
                }
            });
        }

        popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g")
            .attr("transform", function (d) {
                return "translate(" + (d.x) + "," + (d.y) + ")";
            });

        if (popoto.graph.USE_VORONOI_LAYOUT === true) {

            var clip = d3.select("#voronoi-clip-path").selectAll('.voroclip')
                .data(popoto.graph.recenterVoronoi(popoto.graph.force.nodes()), function (d) {
                    return d.point.id;
                });

            clip.enter().append('clipPath')
                .attr('id', function (d) {
                    return 'voroclip-' + d.point.id;
                })
                .attr('class', 'voroclip');
            clip.exit().remove();

            clip.selectAll('path').remove();
            clip.append('path')
                .attr('id', function (d) {
                    return 'pvoroclip-' + d.point.id;
                })
                .attr('d', function (d) {
                    return 'M' + d.join(',') + 'Z';
                });
        }
    };

    // LINKS -----------------------------------------------------------------------------------------------------------
    popoto.graph.link = {};
    popoto.graph.link.TEXT_DY = -4;

    /**
     * Define whether or not to display path markers.
     */
    popoto.graph.link.SHOW_MARKER = false;

    // ID of the g element in SVG graph containing all the link elements.
    popoto.graph.link.gID = "popoto-glinks";

    /**
     * Defines the different type of link.
     * RELATION is a relation link between two nodes.
     * VALUE is a link between a generic node and a value.
     */
    popoto.graph.link.LinkTypes = Object.freeze({RELATION: 0, VALUE: 1, SEGMENT: 2});

    /**
     * Function to call to update the links after modification in the model.
     * This function will update the graph with all removed, modified or added links using d3.js mechanisms.
     */
    popoto.graph.link.updateLinks = function () {
        popoto.graph.link.svgLinkElements = popoto.graph.svg.select("#" + popoto.graph.link.gID).selectAll("g");
        popoto.graph.link.updateData();
        popoto.graph.link.removeElements();
        popoto.graph.link.addNewElements();
        popoto.graph.link.updateElements();
    };

    /**
     * Update the links element with data coming from popoto.graph.force.links().
     */
    popoto.graph.link.updateData = function () {
        popoto.graph.link.svgLinkElements = popoto.graph.link.svgLinkElements.data(popoto.graph.force.links(), function (d) {
            return d.id;
        });
    };

    /**
     * Clean links elements removed from the list.
     */
    popoto.graph.link.removeElements = function () {
        popoto.graph.link.svgLinkElements.exit().remove();
    };

    /**
     * Create new elements.
     */
    popoto.graph.link.addNewElements = function () {

        var newLinkElements = popoto.graph.link.svgLinkElements.enter().append("g")
            .attr("class", "ppt-glink")
            .on("click", popoto.graph.link.clickLink)
            .on("mouseover", popoto.graph.link.mouseOverLink)
            .on("mouseout", popoto.graph.link.mouseOutLink);

        newLinkElements.append("path")
            .attr("class", "ppt-link");

        newLinkElements.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", popoto.graph.link.TEXT_DY)
            .append("textPath")
            .attr("class", "ppt-textPath")
            .attr("startOffset", "50%");
    };

    /**
     * Update all the elements (new + modified)
     */
    popoto.graph.link.updateElements = function () {
        popoto.graph.link.svgLinkElements
            .attr("id", function (d) {
                return "ppt-glink_" + d.id;
            });

        popoto.graph.link.svgLinkElements.selectAll(".ppt-link")
            .attr("id", function (d) {
                return "ppt-path_" + d.id
            })
            .attr("stroke", function (d) {
                return popoto.provider.link.getColor(d, "path", "stroke");
            })
            .attr("class", function (link) {
                return "ppt-link " + popoto.provider.link.getCSSClass(link, "path")
            });

        // Due to a bug on webkit browsers (as of 30/01/2014) textPath cannot be selected
        // To workaround this issue the selection is done with its associated css class
        popoto.graph.link.svgLinkElements.selectAll("text")
            .attr("id", function (d) {
                return "ppt-text_" + d.id
            })
            .attr("class", function (link) {
                return popoto.provider.link.getCSSClass(link, "text")
            })
            .attr("fill", function (d) {
                return popoto.provider.link.getColor(d, "text", "fill");
            })
            .selectAll(".ppt-textPath")
            .attr("id", function (d) {
                return "ppt-textpath_" + d.id;
            })
            .attr("class", function (link) {
                return "ppt-textpath " + popoto.provider.link.getCSSClass(link, "text-path")
            })
            .attr("xlink:href", function (d) {
                return "#ppt-path_" + d.id;
            })
            .text(function (d) {
                return popoto.provider.link.getTextValue(d);
            });
    };

    /**
     * Function called when mouse is over the link.
     * This function is used to change the CSS class on hover of the link and query viewer element.
     *
     * TODO try to introduce event instead of directly access query spans here. This could be used in future extensions.
     */
    popoto.graph.link.mouseOverLink = function () {
        d3.select(this)
            .select("path")
            .attr("class", function (link) {
                return "ppt-link " + popoto.provider.link.getCSSClass(link, "path--hover")
            });

        d3.select(this).select("text")
            .attr("class", function (link) {
                return popoto.provider.link.getCSSClass(link, "text--hover")
            });

        var hoveredLink = d3.select(this).data()[0];

        if (popoto.queryviewer.isActive) {
            popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", true);
            popoto.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", true);
        }

        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.link === hoveredLink;
            }).classed("hover", true);
        }
    };

    /**
     * Function called when mouse goes out of the link.
     * This function is used to reinitialize the CSS class of the link and query viewer element.
     */
    popoto.graph.link.mouseOutLink = function () {
        d3.select(this)
            .select("path")
            .attr("class", function (link) {
                return "ppt-link " + popoto.provider.link.getCSSClass(link, "path")
            });

        d3.select(this).select("text")
            .attr("class", function (link) {
                return popoto.provider.link.getCSSClass(link, "text")
            });

        var hoveredLink = d3.select(this).data()[0];

        if (popoto.queryviewer.isActive) {
            popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", false);
            popoto.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", false);
        }

        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.link === hoveredLink;
            }).classed("hover", false);
        }
    };

    // Delete all related nodes from this link
    popoto.graph.link.clickLink = function () {
        var clickedLink = d3.select(this).data()[0];

        if (clickedLink.type !== popoto.graph.link.LinkTypes.VALUE) {
            // Collapse all expanded choose nodes first to avoid having invalid displayed value node if collapsed relation contains a value.
            popoto.graph.node.collapseAllNode();

            var willChangeResults = popoto.graph.node.removeNode(clickedLink.target);

            popoto.graph.hasGraphChanged = true;
            popoto.result.hasChanged = willChangeResults;
            popoto.update();
        }

    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // NODES -----------------------------------------------------------------------------------------------------------

    popoto.graph.node = {};

    // ID of the g element in SVG graph containing all the link elements.
    popoto.graph.node.gID = "popoto-gnodes";

    // Node ellipse size used by default for text nodes.
    popoto.graph.node.DONUTS_MARGIN = 0;
    popoto.graph.node.DONUT_WIDTH = 20;

    popoto.graph.DISABLE_RELATION = false;

    popoto.graph.node.TEXT_Y = 8;

    // Define the max number of character displayed in node.
    popoto.graph.node.NODE_MAX_CHARS = 11;
    popoto.graph.node.NODE_TITLE_MAX_CHARS = 100;

    // Number of nodes displayed per page during value selection.
    popoto.graph.node.PAGE_SIZE = 10;

    // Define if the count should be displayed on nodes.
    popoto.graph.DISABLE_COUNT = false;

    // Count box default size
    popoto.graph.node.CountBox = {x: 16, y: 33, w: 52, h: 19};

    // Store choose node state to avoid multiple node expand at the same time
    popoto.graph.node.chooseWaiting = false;

    popoto.graph.node.getDonutInnerRadius = function (node) {
        return popoto.provider.node.getSize(node) + popoto.graph.node.DONUTS_MARGIN;
    };

    popoto.graph.node.getDonutOuterRadius = function (node) {
        return popoto.provider.node.getSize(node) + popoto.graph.node.DONUTS_MARGIN + popoto.graph.node.DONUT_WIDTH;
    };

    popoto.graph.node.pie = d3.layout.pie()
        .sort(null)
        .value(function (d) {
            return 1;
        });

    /**
     * Defines the list of possible nodes.
     * ROOT: Node used as graph root. It is the target of the query. Only one node of this type should be available in graph.
     * CHOOSE: Nodes defining a generic node label. From these node is is possible to select a value or explore relations.
     * VALUE: Unique node containing a value constraint. Usually replace CHOOSE nodes once a value as been selected.
     * GROUP: Empty node used to group relations. No value can be selected but relations can be explored. These nodes doesn't have count.
     */
    popoto.graph.node.NodeTypes = Object.freeze({ROOT: 0, CHOOSE: 1, VALUE: 2, GROUP: 3});

    // Used to generate unique internal labels used for example as identifier in Cypher query.
    popoto.graph.node.internalLabels = {};

    /**
     * Create a normalized identifier from a node label.
     * Multiple calls with the same node label will generate different unique identifier.
     *
     * @param nodeLabel
     * @returns {string}
     */
    popoto.graph.node.generateInternalLabel = function (nodeLabel) {
        var label = nodeLabel ? nodeLabel.toLowerCase().replace(/ /g, '') : "n";

        if (label in popoto.graph.node.internalLabels) {
            popoto.graph.node.internalLabels[label] = popoto.graph.node.internalLabels[label] + 1;
        } else {
            popoto.graph.node.internalLabels[label] = 0;
            return label;
        }

        return label + popoto.graph.node.internalLabels[label];
    };

    /**
     * Update Nodes SVG elements using D3.js update mechanisms.
     */
    popoto.graph.node.updateNodes = function () {
        if (!popoto.graph.node.svgNodeElements) {
            popoto.graph.node.svgNodeElements = popoto.graph.svg.select("#" + popoto.graph.node.gID).selectAll("g");
        }
        popoto.graph.node.updateData();
        popoto.graph.node.removeElements();
        popoto.graph.node.addNewElements();
        popoto.graph.node.updateElements();
    };

    /**
     * Update node data with changes done in popoto.graph.force.nodes() model.
     */
    popoto.graph.node.updateData = function () {
        popoto.graph.node.svgNodeElements = popoto.graph.node.svgNodeElements.data(popoto.graph.force.nodes(), function (d) {
            return d.id;
        });

        if (popoto.graph.hasGraphChanged) {
            popoto.graph.node.updateAutoLoadValues();

            if (!popoto.graph.DISABLE_COUNT && !popoto.graph.ignoreCount) {
                popoto.graph.node.updateCount();
            }
        }
        popoto.graph.hasGraphChanged = false;
    };

    /**
     * Update nodes and result counts by executing a query for every nodes with the new graph structure.
     */
    popoto.graph.node.updateCount = function () {

        var statements = [];

        var countedNodes = popoto.graph.force.nodes()
            .filter(function (d) {
                return d.type !== popoto.graph.node.NodeTypes.VALUE && d.type !== popoto.graph.node.NodeTypes.GROUP && (!d.hasOwnProperty("isNegative") || !d.isNegative);
            });

        countedNodes.forEach(function (node) {
            var query = popoto.query.generateNodeCountQuery(node);
            statements.push(
                {
                    "statement": query.statement,
                    "parameters": query.parameters
                }
            );
        });

        popoto.logger.info("Count nodes ==>");
        popoto.rest.post(
            {
                "statements": statements
            })
            .done(function (response) {
                popoto.logger.info("<== Count nodes");
                var parsedData = popoto.rest.response.parse(response);

                // TODO throw exception in parser in case of failure?
                // if (parsedData.status === "success") {
                //     popoto.logger.error("Cypher query error:" + JSON.stringify(parsedData.errors));
                //     countedNodes.forEach(function (node) {
                //         node.count = 0;
                //     });
                // }

                for (var i = 0; i < countedNodes.length; i++) {
                    countedNodes[i].count = parsedData[i][0].count;
                }

                // Update result count with root node new count
                if (popoto.result.resultCountListeners.length > 0) {
                    popoto.result.updateResultsCount();
                }

                popoto.graph.node.updateElements();
                popoto.graph.link.updateElements();
            })
            .fail(function (xhr, textStatus, errorThrown) {
                popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
                countedNodes.forEach(function (node) {
                    node.count = 0;
                });
                popoto.graph.node.updateElements();
                popoto.graph.link.updateElements();
            });
    };

    /**
     * Update values for nodes having preloadData property
     */
    popoto.graph.node.updateAutoLoadValues = function () {
        var statements = [];

        var nodesToLoadData = popoto.graph.node.getAutoLoadValueNodes();

        for (var i = 0; i < nodesToLoadData.length; i++) {
            var nodeToQuery = nodesToLoadData[i];
            var query = popoto.query.generateNodeValueQuery(nodeToQuery);
            statements.push(
                {
                    "statement": query.statement,
                    "parameters": query.parameters
                }
            );
        }

        if (statements.length > 0) {
            popoto.logger.info("AutoLoadValue ==>");
            popoto.rest.post(
                {
                    "statements": statements
                })
                .done(function (response) {
                    popoto.logger.info("<== AutoLoadValue");

                    var parsedData = popoto.rest.response.parse(response);

                    for (var i = 0; i < nodesToLoadData.length; i++) {
                        var nodeToQuery = nodesToLoadData[i];
                        var constraintAttr = popoto.provider.node.getConstraintAttribute(nodeToQuery.label);
                        // Here results are parsed and values already selected are filtered out
                        nodeToQuery.data = parsedData[i].filter(function (dataToFilter) {
                            var keepData = true;
                            if (nodeToQuery.hasOwnProperty("value") && nodeToQuery.value.length > 0) {
                                nodeToQuery.value.forEach(function (value) {
                                    if (value.attributes[constraintAttr] === dataToFilter[constraintAttr]) {
                                        keepData = false;
                                    }
                                })
                            }
                            return keepData;
                        });

                        nodeToQuery.page = 1;
                    }

                    popoto.graph.notifyListeners(popoto.graph.Events.GRAPH_NODE_DATA_LOADED, [nodesToLoadData]);
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
                });
        }
    };

    /**
     * Remove old elements.
     * Should be called after updateData.
     */
    popoto.graph.node.removeElements = function () {
        var toRemove = popoto.graph.node.svgNodeElements.exit();

        // Nodes without parent are simply removed.
        toRemove.filter(function (d) {
            return !d.parent;
        }).remove();

        // Nodes with a parent are removed with an animation (nodes are collapsed to their parents before being removed)
        toRemove.filter(function (d) {
            return d.parent;
        }).transition().duration(300).attr("transform", function (d) {
            return "translate(" + d.parent.x + "," + d.parent.y + ")";
        }).remove();
    };

    /**
     * Add all new elements.
     * Only the skeleton of new nodes are added custom data will be added during the element update phase.
     * Should be called after updateData and before updateElements.
     */
    popoto.graph.node.addNewElements = function () {
        var gNewNodeElements = popoto.graph.node.svgNodeElements.enter()
            .append("g")
            .attr("class", "ppt-gnode")
            .on("click", popoto.graph.node.nodeClick)
            .on("mouseover", popoto.graph.node.mouseOverNode)
            // .on("mousemove", popoto.graph.node.mouseMoveNode)
            .on("mouseout", popoto.graph.node.mouseOutNode);

        // Add right click on all nodes except value
        gNewNodeElements.filter(function (d) {
            return d.type !== popoto.graph.node.NodeTypes.VALUE;
        }).on("contextmenu", popoto.graph.node.clearSelection);

        // Disable right click context menu on value nodes
        gNewNodeElements.filter(function (d) {
            return d.type === popoto.graph.node.NodeTypes.VALUE;
        }).on("contextmenu", function () {
            // Disable context menu on
            d3.event.preventDefault();
        });

        var nodeDefs = gNewNodeElements.append("defs");

        // Circle clipPath using node radius size
        nodeDefs.append("clipPath")
            .attr("id", function (node) {
                return "node-view" + node.id;
            })
            .append("circle")
            .attr("cx", 0)
            .attr("cy", 0);

        // Nodes are composed of 3 layouts and skeleton are created here.
        popoto.graph.node.addBackgroundElements(gNewNodeElements);
        popoto.graph.node.addMiddlegroundElements(gNewNodeElements);
        popoto.graph.node.addForegroundElements(gNewNodeElements);
    };

    /**
     * Create the background for a new node element.
     * The background of a node is defined by a circle not visible by default (fill-opacity set to 0) but can be used to highlight a node with animation on this attribute.
     * This circle also define the node zone that can receive events like mouse clicks.
     *
     * @param gNewNodeElements
     */
    popoto.graph.node.addBackgroundElements = function (gNewNodeElements) {
        var background = gNewNodeElements
            .append("g")
            .attr("class", "ppt-g-node-background")
            .classed("hide", popoto.graph.DISABLE_RELATION);

        background.append("g")
            .attr("class", "ppt-donut-labels");
        background.append("g")
            .attr("class", "ppt-donut-segments");
    };

    /**
     * Create the node main elements.
     *
     * @param gNewNodeElements
     */
    popoto.graph.node.addMiddlegroundElements = function (gNewNodeElements) {
        var middle = gNewNodeElements
            .append("g")
            .attr("class", "ppt-g-node-middleground");
    };

    /**
     * Create the node foreground elements.
     * It contains node additional elements, count or tools like navigation arrows.
     *
     * @param gNewNodeElements
     */
    popoto.graph.node.addForegroundElements = function (gNewNodeElements) {
        var foreground = gNewNodeElements
            .append("g")
            .attr("class", "ppt-g-node-foreground");

        // Arrows icons added only for root and choose nodes
        var gArrow = foreground.filter(function (d) {
            return d.type === popoto.graph.node.NodeTypes.ROOT || d.type === popoto.graph.node.NodeTypes.CHOOSE;
        })
            .append("g")
            .attr("class", "ppt-node-foreground-g-arrows");

        var glArrow = gArrow.append("g");
        //glArrow.append("polygon")
        //.attr("points", "-53,-23 -33,-33 -33,-13");
        glArrow.append("circle")
            .attr("class", "ppt-larrow")
            .attr("cx", "-43")
            .attr("cy", "-23")
            .attr("r", "17");

        glArrow.append("path")
            .attr("class", "ppt-arrow")
            .attr("d", "m -44.905361,-23 6.742,-6.742 c 0.81,-0.809 0.81,-2.135 0,-2.944 l -0.737,-0.737 c -0.81,-0.811 -2.135,-0.811 -2.945,0 l -8.835,8.835 c -0.435,0.434 -0.628,1.017 -0.597,1.589 -0.031,0.571 0.162,1.154 0.597,1.588 l 8.835,8.834 c 0.81,0.811 2.135,0.811 2.945,0 l 0.737,-0.737 c 0.81,-0.808 0.81,-2.134 0,-2.943 l -6.742,-6.743 z");

        glArrow.on("click", function (clickedNode) {
            d3.event.stopPropagation(); // To avoid click event on svg element in background

            // On left arrow click page number is decreased and node expanded to display the new page
            if (clickedNode.page > 1) {
                clickedNode.page--;
                popoto.graph.node.collapseNode(clickedNode);
                popoto.graph.node.expandNode(clickedNode);
            }
        });

        var grArrow = gArrow.append("g");
        //grArrow.append("polygon")
        //.attr("points", "53,-23 33,-33 33,-13");

        grArrow.append("circle")
            .attr("class", "ppt-rarrow")
            .attr("cx", "43")
            .attr("cy", "-23")
            .attr("r", "17");

        grArrow.append("path")
            .attr("class", "ppt-arrow")
            .attr("d", "m 51.027875,-24.5875 -8.835,-8.835 c -0.811,-0.811 -2.137,-0.811 -2.945,0 l -0.738,0.737 c -0.81,0.81 -0.81,2.136 0,2.944 l 6.742,6.742 -6.742,6.742 c -0.81,0.81 -0.81,2.136 0,2.943 l 0.737,0.737 c 0.81,0.811 2.136,0.811 2.945,0 l 8.835,-8.836 c 0.435,-0.434 0.628,-1.017 0.597,-1.588 0.032,-0.569 -0.161,-1.152 -0.596,-1.586 z");

        grArrow.on("click", function (clickedNode) {
            d3.event.stopPropagation(); // To avoid click event on svg element in background

            if (clickedNode.page * popoto.graph.node.PAGE_SIZE < clickedNode.count) {
                clickedNode.page++;
                popoto.graph.node.collapseNode(clickedNode);
                popoto.graph.node.expandNode(clickedNode);
            }
        });

        // Count box
        if (!popoto.graph.DISABLE_COUNT) {
            var countForeground = foreground.filter(function (d) {
                return d.type !== popoto.graph.node.NodeTypes.GROUP;
            });

            countForeground
                .append("rect")
                .attr("x", popoto.graph.node.CountBox.x)
                .attr("y", popoto.graph.node.CountBox.y)
                .attr("width", popoto.graph.node.CountBox.w)
                .attr("height", popoto.graph.node.CountBox.h)
                .attr("class", "ppt-count-box");

            countForeground
                .append("text")
                .attr("x", 42)
                .attr("y", 48)
                .attr("text-anchor", "middle")
                .attr("class", "ppt-count-text");
        }

        var ban = foreground.filter(function (d) {
            return d.type === popoto.graph.node.NodeTypes.CHOOSE;
        }).append("g")
            .attr("class", "ppt-g-node-ban")
            .append("path")
            .attr("d", "M89.1 19.2C88 17.7 86.6 16.2 85.2 14.8 83.8 13.4 82.3 12 80.8 10.9 72 3.9 61.3 0 50 0 36.7 0 24.2 5.4 14.8 14.8 5.4 24.2 0 36.7 0 50c0 11.4 3.9 22.1 10.9 30.8 1.2 1.5 2.5 3 3.9 4.4 1.4 1.4 2.9 2.7 4.4 3.9C27.9 96.1 38.6 100 50 100 63.3 100 75.8 94.6 85.2 85.2 94.6 75.8 100 63.3 100 50 100 38.7 96.1 28 89.1 19.2ZM11.9 50c0-10.2 4-19.7 11.1-27C30.3 15.9 39.8 11.9 50 11.9c8.2 0 16 2.6 22.4 7.3L19.3 72.4C14.5 66 11.9 58.2 11.9 50Zm65 27c-7.2 7.1-16.8 11.1-27 11.1-8.2 0-16-2.6-22.4-7.4L80.8 27.6C85.5 34 88.1 41.8 88.1 50c0 10.2-4 19.7-11.1 27z");
    };

    /**
     * Updates all elements.
     */
    popoto.graph.node.updateElements = function () {
        popoto.graph.node.svgNodeElements.attr("id", function (d) {
            return "popoto-gnode_" + d.id;
        });

        if (popoto.graph.USE_VORONOI_LAYOUT) {
            popoto.graph.node.svgNodeElements.attr("clip-path", function (d) {
                return "url(#voroclip-" + d.id + ")";
            });
        }

        popoto.graph.node.svgNodeElements.select("defs")
            .select("clipPath")
            .attr("id", function (node) {
                return "node-view" + node.id;
            }).selectAll("circle")
            .attr("r", function (node) {
                return popoto.provider.node.getSize(node);
            });

        // Display voronoi paths
        // popoto.graph.node.svgNodeElements.selectAll(".gra").data(["unique"]).enter().append("g").attr("class", "gra").append("use");
        // popoto.graph.node.svgNodeElements.selectAll("use").attr("xlink:href",function(d){
        //     console.log("#pvoroclip-"+d3.select(this.parentNode.parentNode).datum().id);
        //     return "#pvoroclip-"+d3.select(this.parentNode.parentNode).datum().id;
        // }).attr("fill","none").attr("stroke","red").attr("stroke-width","1px");

        popoto.graph.node.svgNodeElements.filter(function (n) {
            return n.type !== popoto.graph.node.NodeTypes.ROOT
        }).call(popoto.graph.force.drag);

        popoto.graph.node.updateBackgroundElements();
        popoto.graph.node.updateMiddlegroundElements();
        popoto.graph.node.updateForegroundElements();
    };

    popoto.graph.node.updateBackgroundElements = function () {
        // RELATIONSHIPS
        popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-background").select(".ppt-donut-labels").selectAll("*").remove();
        popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-background").select(".ppt-donut-segments").selectAll("*").remove();

        var gSegment = popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-background").select(".ppt-donut-segments").selectAll(".ppt-segment-container")
            .data(function (d) {
                var relationships = [];
                if (d.hasOwnProperty("relationships")) {
                    relationships = d.relationships;
                }
                return relationships;
            }, function (d) {
                return d.id;
            })
            .enter()
            .append("g")
            .attr("class", ".ppt-segment-container")
            .on("click", popoto.graph.node.segmentClick)
            .on("mouseover", function (d) {
                d3.select(this).select(".ppt-text-arc").classed("hover", true)
            })
            .on("mouseout", function (d) {
                d3.select(this).select(".ppt-text-arc").classed("hover", false)
            });

        gSegment.append("title").attr("class", "ppt-svg-title")
            .text(function (d) {
                return d.label + " " + d.target;
            });

        var gLabel = popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-background").select(".ppt-donut-labels").selectAll(".ppt-segment-container")
            .data(function (node) {
                var relationships = [];
                if (node.hasOwnProperty("relationships")) {
                    relationships = node.relationships;
                }
                return relationships;
            }, function (relationship) {
                return relationship.id;
            })
            .enter()
            .append("g")
            .attr("class", ".ppt-segment-container")
            .on("click", popoto.graph.node.segmentClick)
            .on("mouseover", function (d) {
                d3.select(this).select(".ppt-text-arc").classed("hover", true)
            })
            .on("mouseout", function (d) {
                d3.select(this).select(".ppt-text-arc").classed("hover", false)
            });

        gLabel.append("path")
            .attr("class", "ppt-hidden-arc")
            .attr("id", function (d, i) {
                var node = d3.select(this.parentNode.parentNode).datum();
                return "arc_" + node.id + "_" + i;
            })
            .attr("d", function (relationship) {
                var node = d3.select(this.parentNode.parentNode).datum();

                //A regular expression that captures all in between the start of a string (denoted by ^)
                //and the first capital letter L
                var firstArcSection = /(^.+?)L/;
                var singleArcSection = /(^.+?)M/;

                var intermediateArc = {
                    startAngle: relationship.directionAngle - (Math.PI - 0.1),
                    endAngle: relationship.directionAngle + (Math.PI - 0.1)
                };

                var arcPath = d3.svg.arc()
                    .innerRadius(popoto.graph.node.getDonutInnerRadius(node))
                    .outerRadius(popoto.graph.node.getDonutOuterRadius(node))(intermediateArc);

                //The [1] gives back the expression between the () (thus not the L as well)
                //which is exactly the arc statement
                var res = firstArcSection.exec(arcPath);
                var newArc = "";
                if (res && res.length > 1) {
                    newArc = res[1];
                } else {
                    newArc = singleArcSection.exec(arcPath)[1];
                }

                //Replace all the comma's so that IE can handle it -_-
                //The g after the / is a modifier that "find all matches rather than stopping after the first match"
                newArc = newArc.replace(/,/g, " ");

                return newArc;
            })
            .style("fill", "none")
            .style("stroke", "none");

        gSegment.append("text")
            .attr("text-anchor", "middle")
            .attr("class", function (d) {
                var node = d3.select(this.parentNode.parentNode).datum();
                if (node.hasOwnProperty("count") && node.count === 0) {
                    return "ppt-text-arc disabled";
                } else {
                    return "ppt-text-arc";
                }
            })
            .attr("fill", function (d) {
                var node = d3.select(this.parentNode.parentNode).datum();

                return popoto.provider.link.getColor({
                    label: d.label,
                    type: popoto.graph.link.LinkTypes.SEGMENT,
                    source: node,
                    target: {label: d.target}
                }, "segment", "fill");
            })
            .attr("dy", popoto.graph.link.TEXT_DY)
            .append("textPath")
            .attr("startOffset", "50%")
            .attr("xlink:href", function (d, i) {
                var node = d3.select(this.parentNode.parentNode.parentNode).datum();
                return "#arc_" + node.id + "_" + i;
            })
            .text(function (d) {
                var node = d3.select(this.parentNode.parentNode.parentNode).datum();

                return popoto.provider.link.getTextValue({
                    source: node,
                    target: {label: d.target},
                    label: d.label,
                    type: popoto.graph.link.LinkTypes.SEGMENT
                });
            });

        gSegment.append("path")
            .attr("class", function (d) {
                var node = d3.select(this.parentNode.parentNode).datum();
                if (node.hasOwnProperty("count") && node.count === 0) {
                    return "ppt-segment disabled";
                } else {
                    return "ppt-segment";
                }
            })
            .attr("d", function (d) {
                var node = d3.select(this.parentNode.parentNode).datum();
                return d3.svg.arc()
                    .innerRadius(popoto.graph.node.getDonutInnerRadius(node))
                    .outerRadius(popoto.graph.node.getDonutOuterRadius(node))(d)
            })
            .attr("fill", function (d) {
                var node = d3.select(this.parentNode.parentNode).datum();
                return popoto.provider.link.getColor({
                    label: d.label,
                    type: popoto.graph.link.LinkTypes.RELATION,
                    source: node,
                    target: {label: d.target}
                }, "path", "fill");
            })
            .attr("stroke", function (d) {
                var node = d3.select(this.parentNode.parentNode).datum();

                return popoto.provider.link.getColor({
                    label: d.label,
                    type: popoto.graph.link.LinkTypes.RELATION,
                    source: node,
                    target: {label: d.target}
                }, "path", "stroke");
            })
        ;

    };

    /**
     * Update the middle layer of nodes.
     * TODO refactor node generation to allow future extensions (for example add plugin with new node types...)
     */
    popoto.graph.node.updateMiddlegroundElements = function () {
        var middleG = popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-middleground");

        middleG.attr("clip-path", function (node) {
            return "url(#node-view" + node.id + ")";
        });

        // Clear all content in case node type has changed
        middleG.selectAll("*").remove();


        popoto.graph.node.updateMiddlegroundElementsTooltip(middleG);

        popoto.graph.node.updateMiddlegroundElementsText(middleG.filter(function (d) {
            return popoto.provider.node.getNodeDisplayType(d) === popoto.provider.node.DisplayTypes.TEXT;
        }));

        popoto.graph.node.updateMiddlegroundElementsImage(middleG.filter(function (d) {
            return popoto.provider.node.getNodeDisplayType(d) === popoto.provider.node.DisplayTypes.IMAGE;
        }));

        popoto.graph.node.updateMiddlegroundElementsSymbol(middleG.filter(function (d) {
            return popoto.provider.node.getNodeDisplayType(d) === popoto.provider.node.DisplayTypes.SYMBOL;
        }));

        popoto.graph.node.updateMiddlegroundElementsSVG(middleG.filter(function (d) {
            return popoto.provider.node.getNodeDisplayType(d) === popoto.provider.node.DisplayTypes.SVG;
        }));

        popoto.graph.node.updateMiddlegroundElementsDisplayedText(middleG.filter(function (d) {
            return popoto.provider.node.isTextDisplayed(d);
        }));

    };

    popoto.graph.node.updateMiddlegroundElementsTooltip = function (middleG) {
        // Most browser will generate a tooltip if a title is specified for the SVG element
        // TODO Introduce an SVG tooltip instead?
        middleG.append("title")
            .attr("class", function (node) {
                return popoto.provider.node.getCSSClass(node, "title")
            })
            .text(function (d) {
                return popoto.provider.node.getTextValue(d, popoto.graph.node.NODE_TITLE_MAX_CHARS);
            });

    };

    popoto.graph.node.updateMiddlegroundElementsText = function (gMiddlegroundTextNodes) {
        var circle = gMiddlegroundTextNodes.append("circle").attr("r", function (node) {
            return popoto.provider.node.getSize(node);
        });

        // Set class according to node type
        circle
            .attr("class", function (node) {
                return popoto.provider.node.getCSSClass(node, "circle")
            })
            .attr("fill", function (node) {
                return popoto.provider.node.getColor(node, "circle", "fill");
            })
            .attr("stroke", function (node) {
                return popoto.provider.node.getColor(node, "circle", "stroke");
            });
    };

    popoto.graph.node.updateMiddlegroundElementsImage = function (gMiddlegroundImageNodes) {
        gMiddlegroundImageNodes.append("circle").attr("r", function (node) {
            return popoto.provider.node.getSize(node);
        })
            .attr("class", function (node) {
                return popoto.provider.node.getCSSClass(node, "image-background-circle")
            });

        gMiddlegroundImageNodes.append("image")
            .attr("class", function (node) {
                return popoto.provider.node.getCSSClass(node, "image")
            })
            .attr("width", function (d) {
                return popoto.provider.node.getImageWidth(d);
            })
            .attr("height", function (d) {
                return popoto.provider.node.getImageHeight(d);
            })
            // Center the image on node
            .attr("transform", function (d) {
                return "translate(" + (-popoto.provider.node.getImageWidth(d) / 2) + "," + (-popoto.provider.node.getImageHeight(d) / 2) + ")";
            })
            .attr("xlink:href", function (d) {
                return popoto.provider.node.getImagePath(d);
            });
    };

    popoto.graph.node.updateMiddlegroundElementsSymbol = function (gMiddlegroundSymbolNodes) {
        gMiddlegroundSymbolNodes.append("circle").attr("r", function (node) {
            return popoto.provider.node.getSize(node);
        })
            .attr("class", function (node) {
                return popoto.provider.node.getCSSClass(node, "symbol-background-circle")
            })
            .attr("fill", function (node) {
                return popoto.provider.node.getColor(node, "circle", "fill");
            })
            .attr("stroke", function (node) {
                return popoto.provider.node.getColor(node, "circle", "stroke");
            });

        gMiddlegroundSymbolNodes.append("use")
            .attr("class", function (node) {
                return popoto.provider.node.getCSSClass(node, "symbol")
            })
            .attr("width", function (d) {
                return popoto.provider.node.getImageWidth(d);
            })
            .attr("height", function (d) {
                return popoto.provider.node.getImageHeight(d);
            })
            // Center the image on node
            .attr("transform", function (d) {
                return "translate(" + (-popoto.provider.node.getImageWidth(d) / 2) + "," + (-popoto.provider.node.getImageHeight(d) / 2) + ")";
            })
            .attr("xlink:href", function (d) {
                return popoto.provider.node.getImagePath(d);
            })
            .attr("fill", function (node) {
                return popoto.provider.node.getColor(node, "circle", "fill");
            })
            .attr("stroke", function (node) {
                return popoto.provider.node.getColor(node, "circle", "stroke");
            });
    };

    popoto.graph.node.updateMiddlegroundElementsSVG = function (gMiddlegroundSVGNodes) {
        var SVGmiddleG = gMiddlegroundSVGNodes.append("g");

        var circle = SVGmiddleG.append("circle").attr("r", function (node) {
            return popoto.provider.node.getSize(node);
        }).attr("class", "ppt-svg-node-background");

        var svgMiddlePaths = SVGmiddleG.selectAll("path").data(function (d) {
            return popoto.provider.node.getSVGPaths(d);
        });

        // Update nested data elements
        svgMiddlePaths.exit().remove();
        svgMiddlePaths.enter().append("path");

        SVGmiddleG
            .selectAll("path")
            .attr("class", function (d) {
                var node = d3.select(this.parentNode).datum();
                return popoto.provider.node.getCSSClass(node, "path")
            })
            .each(function (d, i) {
                for (var prop in d) {
                    if (d.hasOwnProperty(prop)) {
                        d3.select(this).attr(prop, d[prop]);
                    }
                }
            })
    };

    popoto.graph.node.updateMiddlegroundElementsDisplayedText = function (middleG) {
        var textDispalyed = middleG.filter(function (d) {
            return popoto.provider.node.isTextDisplayed(d);
        });

        var backRects =
            textDispalyed
                .append("rect")
                .attr("fill", function (node) {
                    return popoto.provider.node.getColor(node, "back-text", "fill");
                })
                .attr("class", function (node) {
                    return popoto.provider.node.getCSSClass(node, "back-text")
                });

        var textMiddle = textDispalyed.append('text')
            .attr('x', 0)
            .attr('y', popoto.graph.node.TEXT_Y)
            .attr('text-anchor', 'middle');
        textMiddle
            .attr('y', popoto.graph.node.TEXT_Y)
            .attr("class", function (node) {
                return popoto.provider.node.getCSSClass(node, "text")
            })
            .on("mouseover", function (d) {
                d3.select(this.parentNode).attr("clip-path", null);
            })
            .on("mouseout", function (d) {
                d3.select(this.parentNode)
                    .attr("clip-path", function (node) {
                        return "url(#node-view" + node.id + ")";
                    });
            })
            .text(function (d) {
                if (popoto.provider.node.isTextDisplayed(d)) {
                    return popoto.provider.node.getTextValue(d);
                } else {
                    return "";
                }
            });

        backRects
            .attr("x", function (d) {
                var bbox = d3.select(this.parentNode).select("text").node().getBBox();
                return bbox.x - 3;
            })
            .attr("y", function (d) {
                var bbox = d3.select(this.parentNode).select("text").node().getBBox();
                return bbox.y;
            })
            .attr("rx", "5")
            .attr("ry", "5")
            .attr("width", function (d) {
                var bbox = d3.select(this.parentNode).select("text").node().getBBox();
                return bbox.width + 6;
            })
            .attr("height", function (d) {
                var bbox = d3.select(this.parentNode).select("text").node().getBBox();
                return bbox.height;
            });
    };

    /**
     * Updates the foreground elements
     */
    popoto.graph.node.updateForegroundElements = function () {

        // Updates browse arrows status
        var gArrows = popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground")
            .selectAll(".ppt-node-foreground-g-arrows");
        gArrows.classed("active", function (d) {
            return d.valueExpanded && d.data && d.data.length > popoto.graph.node.PAGE_SIZE;
        });

        gArrows.selectAll(".ppt-larrow").classed("enabled", function (d) {
            return d.page > 1;
        });

        gArrows.selectAll(".ppt-rarrow").classed("enabled", function (d) {
            if (d.data) {
                var count = d.data.length;
                return d.page * popoto.graph.node.PAGE_SIZE < count;
            } else {
                return false;
            }
        });

        // Update count box class depending on node type
        var gForegrounds = popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground");

        gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
            return d.type !== popoto.graph.node.NodeTypes.CHOOSE;
        }).classed("root", true);

        gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
            return d.type === popoto.graph.node.NodeTypes.CHOOSE;
        }).classed("value", true);

        gForegrounds.selectAll(".ppt-count-box").classed("disabled", function (d) {
            return d.count === 0;
        });

        if (!popoto.graph.DISABLE_COUNT) {
            gForegrounds.selectAll(".ppt-count-text")
                .text(function (d) {
                    if (d.count !== null) {
                        return d.count;
                    } else {
                        return "...";
                    }
                })
                .classed("disabled", function (d) {
                    return d.count === 0;
                });
        }

        popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground").filter(function (node) {
            return node.isNegative === true;
        }).selectAll(".ppt-g-node-ban")
            .attr("transform", function (d) {
                return "translate(" + (-popoto.provider.node.getSize(d)) + "," + (-popoto.provider.node.getSize(d)) + ") " +
                    "scale(" + ((popoto.provider.node.getSize(d) * 2) / 100) + ")"; // 100 is the size of the image drawn with the path
            })
            .attr("stroke-width", function (d) {
                return (2 / ((popoto.provider.node.getSize(d) * 2) / 100)) + "px";
            });


        popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground").selectAll(".ppt-g-node-ban")
            .classed("active", function (node) {
                return node.isNegative === true;
            });
    };

    popoto.graph.node.segmentClick = function (d) {
        d3.event.preventDefault();

        var node = d3.select(this.parentNode.parentNode).datum();

        popoto.graph.ignoreCount = true;

        popoto.graph.addRelationshipData(node, d, function () {
            popoto.graph.ignoreCount = false;
            popoto.graph.hasGraphChanged = true;
            popoto.updateGraph();
        });
    };

    /**
     * Handle the mouse over event on nodes.
     */
    popoto.graph.node.mouseOverNode = function () {
        d3.event.preventDefault();

        // TODO don't work on IE (nodes unstable) find another way to move node in foreground on mouse over?
        // d3.select(this).moveToFront();

        // popoto.tootip.div.style("display", "inline");

        var hoveredNode = d3.select(this).data()[0];

        if (popoto.queryviewer.isActive) {
            // Hover the node in query
            popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", true);
            popoto.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", true);
        }

        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredNode;
            }).classed("hover", true);
        }
    };

    // popoto.graph.node.mouseMoveNode = function () {
    //     d3.event.preventDefault();
    //
    //     var hoveredNode = d3.select(this).data()[0];
    //
    //     popoto.tootip.div
    //         .text(popoto.provider.node.getTextValue(hoveredNode, popoto.graph.node.NODE_TITLE_MAX_CHARS))
    //         .style("left", (d3.event.pageX - 34) + "px")
    //         .style("top", (d3.event.pageY - 12) + "px");
    // };

    /**
     * Handle mouse out event on nodes.
     */
    popoto.graph.node.mouseOutNode = function () {
        d3.event.preventDefault();

        // popoto.tootip.div.style("display", "none");

        var hoveredNode = d3.select(this).data()[0];

        if (popoto.queryviewer.isActive) {
            // Remove hover class on node.
            popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", false);
            popoto.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", false);
        }

        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredNode;
            }).classed("hover", false);
        }
    };

    /**
     * Handle the click event on nodes.
     */
    popoto.graph.node.nodeClick = function () {
        if (!d3.event.defaultPrevented) { // To avoid click on drag end
            var clickedNode = d3.select(this).data()[0]; // Clicked node data
            popoto.logger.debug("nodeClick (" + clickedNode.label + ")");

            if (clickedNode.type === popoto.graph.node.NodeTypes.VALUE) {
                popoto.graph.node.valueNodeClick(clickedNode);
            } else if (clickedNode.type === popoto.graph.node.NodeTypes.CHOOSE || clickedNode.type === popoto.graph.node.NodeTypes.ROOT) {
                if (d3.event.ctrlKey) {
                    if (clickedNode.type === popoto.graph.node.NodeTypes.CHOOSE) {
                        clickedNode.isNegative = !clickedNode.hasOwnProperty("isNegative") || !clickedNode.isNegative;

                        popoto.graph.node.collapseAllNode();

                        if (clickedNode.hasOwnProperty("value") && clickedNode.value.length > 0) {

                        } else {

                            if (clickedNode.isNegative) {
                                // Remove all related nodes
                                for (var i = popoto.graph.force.links().length - 1; i >= 0; i--) {
                                    if (popoto.graph.force.links()[i].source === clickedNode) {
                                        popoto.graph.node.removeNode(popoto.graph.force.links()[i].target);
                                    }
                                }

                                clickedNode.count = 0;
                            }
                        }

                        popoto.result.hasChanged = true;
                        popoto.graph.hasGraphChanged = true;
                        popoto.update();
                    } // negation not supported on root node
                } else {
                    if (clickedNode.valueExpanded) {
                        popoto.graph.node.collapseNode(clickedNode);
                    } else {
                        popoto.graph.node.chooseNodeClick(clickedNode);
                    }
                }
            }
        }
    };

    /**
     * Remove all the value node directly linked to clicked node.
     *
     * @param clickedNode
     */
    popoto.graph.node.collapseNode = function (clickedNode) {
        if (clickedNode.valueExpanded) { // node is collapsed only if it has been expanded first
            popoto.logger.debug("collapseNode (" + clickedNode.label + ")");

            popoto.graph.notifyListeners(popoto.graph.Events.GRAPH_NODE_VALUE_COLLAPSE, [clickedNode]);

            var linksToRemove = popoto.graph.force.links().filter(function (l) {
                return l.source === clickedNode && l.type === popoto.graph.link.LinkTypes.VALUE;
            });

            // Remove children nodes from model
            linksToRemove.forEach(function (l) {
                popoto.graph.force.nodes().splice(popoto.graph.force.nodes().indexOf(l.target), 1);
            });

            // Remove links from model
            for (var i = popoto.graph.force.links().length - 1; i >= 0; i--) {
                if (linksToRemove.indexOf(popoto.graph.force.links()[i]) >= 0) {
                    popoto.graph.force.links().splice(i, 1);
                }
            }

            // Node has been fixed when expanded so we unfix it back here.
            if (clickedNode.type !== popoto.graph.node.NodeTypes.ROOT) {
                clickedNode.fixed = false;
            }

            // Parent node too if not root
            if (clickedNode.parent && clickedNode.parent.type !== popoto.graph.node.NodeTypes.ROOT) {
                clickedNode.parent.fixed = false;
            }

            clickedNode.valueExpanded = false;
            popoto.update();

        } else {
            popoto.logger.debug("collapseNode called on an unexpanded node");
        }
    };

    /**
     * Collapse all nodes with value expanded.
     *
     */
    popoto.graph.node.collapseAllNode = function () {
        popoto.graph.force.nodes().forEach(function (n) {
            if ((n.type === popoto.graph.node.NodeTypes.CHOOSE || n.type === popoto.graph.node.NodeTypes.ROOT) && n.valueExpanded) {
                popoto.graph.node.collapseNode(n);
            }
        });
    };

    /**
     * Function called on a value node click.
     * In this case the value is added in the parent node and all the value nodes are collapsed.
     *
     * @param clickedNode
     */
    popoto.graph.node.valueNodeClick = function (clickedNode) {
        popoto.logger.debug("valueNodeClick (" + clickedNode.label + ")");

        popoto.graph.notifyListeners(popoto.graph.Events.GRAPH_NODE_ADD_VALUE, [clickedNode]);

        if (clickedNode.parent.value === undefined) {
            clickedNode.parent.value = [];
        }
        clickedNode.parent.value.push(clickedNode);
        popoto.result.hasChanged = true;
        popoto.graph.hasGraphChanged = true;

        popoto.graph.node.collapseNode(clickedNode.parent);
    };

    /**
     * Function called on choose node click.
     * In this case a query is executed to get all the possible value
     * @param clickedNode
     * TODO optimize with cached data?
     */
    popoto.graph.node.chooseNodeClick = function (clickedNode) {
        popoto.logger.debug("chooseNodeClick (" + clickedNode.label + ") with waiting state set to " + popoto.graph.node.chooseWaiting);
        if (!popoto.graph.node.chooseWaiting && !clickedNode.immutable && !(clickedNode.count === 0)) {

            // Collapse all expanded nodes first
            popoto.graph.node.collapseAllNode();

            // Set waiting state to true to avoid multiple call on slow query execution
            popoto.graph.node.chooseWaiting = true;

            // Don't run query to get value if node isAutoLoadValue is set to true
            if (clickedNode.data !== undefined && clickedNode.isAutoLoadValue) {
                clickedNode.page = 1;
                popoto.graph.node.expandNode(clickedNode);
                popoto.graph.node.chooseWaiting = false;
            } else {
                popoto.logger.info("Values (" + clickedNode.label + ") ==>");
                var query = popoto.query.generateNodeValueQuery(clickedNode);
                popoto.rest.post(
                    {
                        "statements": [
                            {
                                "statement": query.statement,
                                "parameters": query.parameters
                            }]
                    })
                    .done(function (response) {
                        popoto.logger.info("<== Values (" + clickedNode.label + ")");
                        var parsedData = popoto.rest.response.parse(response);
                        var constraintAttr = popoto.provider.node.getConstraintAttribute(clickedNode.label);

                        clickedNode.data = parsedData[0].filter(function (dataToFilter) {
                            var keepData = true;
                            if (clickedNode.hasOwnProperty("value") && clickedNode.value.length > 0) {
                                clickedNode.value.forEach(function (value) {
                                    if (value.attributes[constraintAttr] === dataToFilter[constraintAttr]) {
                                        keepData = false;
                                    }
                                })
                            }
                            return keepData;
                        });

                        clickedNode.page = 1;
                        popoto.graph.node.expandNode(clickedNode);
                        popoto.graph.node.chooseWaiting = false;
                    })
                    .fail(function (xhr, textStatus, errorThrown) {
                        popoto.graph.node.chooseWaiting = false;
                        popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
                    });
            }
        }
    };

    /**
     * Add in all expanded choose nodes the value containing the specified value for the given attribute.
     * And remove it from the nodes data.
     *
     * @param attribute
     * @param value
     */
    popoto.graph.node.addExpandedValue = function (attribute, value) {

        var isAnyChangeDone = false;

        // For each expanded nodes
        for (var i = popoto.graph.force.nodes().length - 1; i >= 0; i--) {
            if (popoto.graph.force.nodes()[i].valueExpanded) {

                // Look in node data if value can be found in reverse order to be able to remove value without effect on iteration index
                for (var j = popoto.graph.force.nodes()[i].data.length - 1; j >= 0; j--) {
                    if (popoto.graph.force.nodes()[i].data[j][attribute] === value) {
                        isAnyChangeDone = true;

                        // Create field value if needed
                        if (!popoto.graph.force.nodes()[i].hasOwnProperty("value")) {
                            popoto.graph.force.nodes()[i].value = [];
                        }

                        // Add value
                        popoto.graph.force.nodes()[i].value.push({
                            attributes: popoto.graph.force.nodes()[i].data[j]
                        });

                        // Remove data added in value
                        popoto.graph.force.nodes()[i].data.splice(j, 1);
                    }
                }

                // Refresh node
                popoto.graph.node.collapseNode(popoto.graph.force.nodes()[i]);
                popoto.graph.node.expandNode(popoto.graph.force.nodes()[i]);
            }
        }

        if (isAnyChangeDone) {
            popoto.result.hasChanged = true;
            popoto.graph.hasGraphChanged = true;
            popoto.update();
        }
    };

    /**
     * Get all nodes that contains a value.
     *
     * @param label If set return only node of this label.
     * @return {Array} Array of nodes containing at least one value.
     */
    popoto.graph.node.getContainingValue = function (label) {
        var nodesWithValue = [];
        var links = popoto.graph.force.links(), nodes = popoto.graph.force.nodes();

        if (nodes.length > 0) {

            var rootNode = nodes[0];

            // Add root value
            if (rootNode.value !== undefined && rootNode.value.length > 0) {
                if (label === undefined || label === rootNode.label) {
                    nodesWithValue.push(rootNode);
                }
            }

            links.forEach(function (l) {
                var targetNode = l.target;
                if (l.type === popoto.graph.link.LinkTypes.RELATION && targetNode.value !== undefined && targetNode.value.length > 0) {
                    if (label === undefined || label === targetNode.label) {
                        nodesWithValue.push(targetNode);
                    }
                }
            });
        }

        return nodesWithValue;
    };


    /**
     * Add value in all CHOOSE nodes with specified label.
     *
     * @param label nodes where to insert
     * @param value
     */
    popoto.graph.node.addValueForLabel = function (label, value) {

        var isAnyChangeDone = false;

        // Find choose node with label
        for (var i = popoto.graph.force.nodes().length - 1; i >= 0; i--) {
            if (popoto.graph.force.nodes()[i].type === popoto.graph.node.NodeTypes.CHOOSE && popoto.graph.force.nodes()[i].label === label) {

                // Create field value if needed
                if (!popoto.graph.force.nodes()[i].hasOwnProperty("value")) {
                    popoto.graph.force.nodes()[i].value = [];
                }

                // check if value already exists
                var isValueFound = false;
                var constraintAttr = popoto.provider.node.getConstraintAttribute(label);
                popoto.graph.force.nodes()[i].value.forEach(function (val) {
                    if (val.attributes.hasOwnProperty(constraintAttr) && val.attributes[constraintAttr] === value.attributes[constraintAttr]) {
                        isValueFound = true;
                    }
                });

                if (!isValueFound) {
                    // Add value
                    popoto.graph.force.nodes()[i].value.push(value);
                    isAnyChangeDone = true;
                }
            }
        }

        return isAnyChangeDone;
    };

    /**
     * Add a value in a node with the given id and the value of the first attribute if found in its data.
     *
     * @param nodeIds a list of node ids where to add the value.
     * @param displayAttributeValue the value to find in data and to add if found
     */
    popoto.graph.node.addValue = function (nodeIds, displayAttributeValue) {

        var isAnyChangeDone = false;

        // Find choose node with label
        for (var i = 0; i < popoto.graph.force.nodes().length; i++) {
            var node = popoto.graph.force.nodes()[i];
            if (nodeIds.indexOf(node.id) >= 0) {

                // Create field value in node if needed
                if (!node.hasOwnProperty("value")) {
                    node.value = [];
                }

                var displayAttr = popoto.provider.node.getReturnAttributes(node.label)[0];

                // Find data for this node and add value
                node.data.forEach(function (d) {
                    if (d.hasOwnProperty(displayAttr) && d[displayAttr] === displayAttributeValue) {
                        isAnyChangeDone = true;
                        node.value.push({attributes: d})
                    }
                });
            }
        }

        if (isAnyChangeDone) {
            popoto.result.hasChanged = true;
            popoto.graph.hasGraphChanged = true;
            popoto.update();
        }
    };

    /**
     * Remove a value from a node.
     * If the value is not found nothing is done.
     *
     * @param node
     * @param value
     */
    popoto.graph.node.removeValue = function (node, value) {
        var isAnyChangeDone = false;

        // Remove values having same constraintAttributeValue
        for (var j = node.value.length - 1; j >= 0; j--) {
            if (node.value[j] === value) {
                popoto.graph.node.collapseNode(node);
                node.value.splice(j, 1);

                // Add values back in data
                // Not needed as node is collapsed and if clicked data will be reloaded
                // for (var k = 0; k < removedValues.length; k++) {
                //     node.data.push(removedValues[k].attributes);
                // }
                isAnyChangeDone = true;
            }
        }
        return isAnyChangeDone
    };

    /**
     * Get the value in the provided nodeId for a specific value id.
     *
     * @param nodeId
     * @param constraintAttributeValue
     */
    popoto.graph.node.getValue = function (nodeId, constraintAttributeValue) {
        for (var i = 0; i < popoto.graph.force.nodes().length; i++) {
            var node = popoto.graph.force.nodes()[i];

            if (node.id === nodeId) {
                var constraintAttribute = popoto.provider.node.getConstraintAttribute(node.label);

                for (var j = node.value.length - 1; j >= 0; j--) {
                    if (node.value[j].attributes[constraintAttribute] === constraintAttributeValue) {
                        return node.value[j]
                    }
                }
            }
        }
    };

    /**
     * Remove in all expanded nodes the value containing the specified value for the given attribute.
     * And move it back to nodes data.
     *
     * @param attribute
     * @param value
     */
    popoto.graph.node.removeExpandedValue = function (attribute, value) {

        var isAnyChangeDone = false;

        // For each expanded nodes in reverse order as some values can be removed
        for (var i = popoto.graph.force.nodes().length - 1; i >= 0; i--) {
            if (popoto.graph.force.nodes()[i].valueExpanded) {

                var removedValues = [];

                // Remove values
                for (var j = popoto.graph.force.nodes()[i].value.length - 1; j >= 0; j--) {
                    if (popoto.graph.force.nodes()[i].value[j].attributes[attribute] === value) {
                        isAnyChangeDone = true;

                        removedValues = removedValues.concat(popoto.graph.force.nodes()[i].value.splice(j, 1));
                    }
                }

                //And add them back in data
                for (var k = 0; k < removedValues.length; k++) {
                    popoto.graph.force.nodes()[i].data.push(removedValues[k].attributes);
                }

                // Refresh node
                popoto.graph.node.collapseNode(popoto.graph.force.nodes()[i]);
                popoto.graph.node.expandNode(popoto.graph.force.nodes()[i]);
            }
        }

        if (isAnyChangeDone) {
            popoto.result.hasChanged = true;
            popoto.graph.hasGraphChanged = true;
            popoto.update();
        }
    };

    /**
     * Return all nodes with isAutoLoadValue property set to true.
     */
    popoto.graph.node.getAutoLoadValueNodes = function () {
        return popoto.graph.force.nodes()
            .filter(function (d) {
                return d.hasOwnProperty("isAutoLoadValue") && d.isAutoLoadValue === true && !(d.isNegative === true);
            });
    };

    /**
     * Add a list of related value if not found.
     * A value is defined with the following structure
     * {
     *   id,
     *   rel,
     *   label
     * }
     *
     * @param node
     * @param values
     */
    popoto.graph.node.addRelatedValues = function (node, values, isNegative) {
        var valuesToAdd = popoto.graph.node.filterExistingValues(node, values);

        if (valuesToAdd.length <= 0) {
            return;
        }
        var parameters = {};
        var count = 0;
        var constraints = valuesToAdd.map(function (v) {
            var constraintAttr = popoto.provider.node.getConstraintAttribute(v.label);
            var param = "p" + count++;
            parameters[param] = v.id;
            return "( type(r) = \"" + v.rel + "\" AND v." + constraintAttr + " = $" + param + " AND \"" + v.label + "\" IN labels(v) )";
        });

        var statements = [
            {
                "statement": "MATCH (n:`" + node.label + "`)-[r]-(v) WHERE " + constraints.join(" OR ") + " RETURN DISTINCT {rel:type(r), value:v, label:labels(v)} AS val",
                "parameters": parameters,
                "resultDataContents": ["row"]
            }
        ];

        popoto.logger.info("addRelatedValues ==>");
        popoto.rest.post(
            {
                "statements": statements
            })
            .done(function (response) {
                popoto.logger.info("<== addRelatedValues");

                var parsedData = popoto.rest.response.parse(response);
                var count = 0;
                parsedData[0].forEach(function (d) {
                    var value = {
                        "id": popoto.graph.generateId(),
                        "parent": node,
                        "attributes": d.val.value,
                        "type": popoto.graph.node.NodeTypes.VALUE,
                        "label": d.val.label[0]
                    };

                    popoto.graph.ignoreCount = true;

                    var nodeRelationships = node.relationships;
                    var nodeRels = nodeRelationships.filter(function (r) {
                        return r.label === d.val.rel && r.target === d.val.label[0]
                    });

                    var nodeRel = {label: d.val.rel, target: d.val.label[0]};
                    if (nodeRels.length > 0) {
                        nodeRel = nodeRels[0];
                    }

                    popoto.graph.addRelationshipData(node, nodeRel, function () {
                        count++;

                        if (count === parsedData.length) {
                            popoto.graph.ignoreCount = false;
                            popoto.graph.hasGraphChanged = true;
                            popoto.result.hasChanged = true;
                            popoto.update();
                        }
                    }, [value], isNegative);
                });
            })
            .fail(function (xhr, textStatus, errorThrown) {
                console.error(xhr, textStatus, errorThrown);
            });
    };

    /**
     * Add a list of related value prefixed by a path of nodes.
     * A value is defined with the following structure
     * {
     *   id,
     *   rel,
     *   label
     * }
     *
     * @param node
     * @param relPath
     * @param values
     * @param isNegative
     */
    popoto.graph.node.addRelatedBranch = function (node, relPath, values, isNegative) {
        if (relPath.length > 0) {
            var rel = relPath[0];
            relPath = relPath.slice(1);

            var relationships = node.relationships.filter(function (r) {
                return r.label === rel.type && r.target === rel.target;
            });

            if (relationships.length > 0) {
                popoto.graph.addRelationshipData(node, relationships[0], function (createdNode) {
                    popoto.graph.node.addRelatedBranch(createdNode, relPath, values, isNegative);
                });
            }
        } else {
            popoto.graph.node.addRelatedValues(node, values, isNegative)
        }
    };

    /**
     * A value is defined with the following structure
     * {
     *   id,
     *   rel,
     *   label
     * }
     *
     * @param node
     * @param values
     */
    popoto.graph.node.filterExistingValues = function (node, values) {
        var notFoundValues = [];
        var possibleValueNodes = popoto.graph.force.nodes().filter(function (n) {
            return n.parent === node && n.hasOwnProperty("value") && n.value.length > 0;
        });

        values.forEach(function (v) {
            var found = false;
            var constraintAttr = popoto.provider.node.getConstraintAttribute(v.label);

            possibleValueNodes.forEach(function (n) {
                if (n.label === v.label) {
                    n.value.forEach(function (nv) {
                        if (nv.attributes[constraintAttr] === v.id) {
                            found = true;
                        }
                    });
                }
            });

            if (!found) {
                notFoundValues.push(v)
            }
        });

        return notFoundValues;
    };

    /**
     * Compute the angle in radian between the node and its parent.
     * TODO: clean or add comments to explain the code...
     *
     * @param node node to compute angle.
     * @returns {number} angle in radian.
     */
    popoto.graph.computeParentAngle = function (node) {
        var angleRadian = 0;
        var r = 100;
        if (node.parent) {
            var xp = node.parent.x;
            var yp = node.parent.y;
            var x0 = node.x;
            var y0 = node.y;
            var dist = Math.sqrt(Math.pow(xp - x0, 2) + Math.pow(yp - y0, 2));

            var k = r / (dist - r);
            var xc = (x0 + (k * xp)) / (1 + k);

            var val = (xc - x0) / r;
            if (val < -1) {
                val = -1;
            }
            if (val > 1) {
                val = 1;
            }

            angleRadian = Math.acos(val);

            if (yp > y0) {
                angleRadian = 2 * Math.PI - angleRadian;
            }
        }
        return angleRadian;
    };

    /**
     * Function called to expand a node containing values.
     * This function will create the value nodes with the clicked node internal data.
     * Only nodes corresponding to the current page index will be generated.
     *
     * @param clickedNode
     */
    popoto.graph.node.expandNode = function (clickedNode) {

        popoto.graph.notifyListeners(popoto.graph.Events.GRAPH_NODE_VALUE_EXPAND, [clickedNode]);

        // Get subset of node corresponding to the current node page and page size
        var lIndex = clickedNode.page * popoto.graph.node.PAGE_SIZE;
        var sIndex = lIndex - popoto.graph.node.PAGE_SIZE;

        var dataToAdd = clickedNode.data.slice(sIndex, lIndex);
        var parentAngle = popoto.graph.computeParentAngle(clickedNode);

        // Then each node are created and dispatched around the clicked node using computed coordinates.
        var i = 1;
        dataToAdd.forEach(function (d) {
            var angleDeg;
            if (clickedNode.parent) {
                angleDeg = (((360 / (dataToAdd.length + 1)) * i));
            } else {
                angleDeg = (((360 / (dataToAdd.length)) * i));
            }

            var nx = clickedNode.x + (100 * Math.cos((angleDeg * (Math.PI / 180)) - parentAngle)),
                ny = clickedNode.y + (100 * Math.sin((angleDeg * (Math.PI / 180)) - parentAngle));

            var node = {
                "id": popoto.graph.generateId(),
                "parent": clickedNode,
                "attributes": d,
                "type": popoto.graph.node.NodeTypes.VALUE,
                "label": clickedNode.label,
                "count": d.count,
                "x": nx,
                "y": ny,
                "internalID": d[popoto.query.NEO4J_INTERNAL_ID.queryInternalName]
            };

            popoto.graph.force.nodes().push(node);

            popoto.graph.force.links().push(
                {
                    id: "l" + popoto.graph.generateId(),
                    source: clickedNode,
                    target: node,
                    type: popoto.graph.link.LinkTypes.VALUE
                }
            );

            i++;
        });

        // Pin clicked node and its parent to avoid the graph to move for selection, only new value nodes will blossom around the clicked node.
        clickedNode.fixed = true;
        if (clickedNode.parent && clickedNode.parent.type !== popoto.graph.node.NodeTypes.ROOT) {
            clickedNode.parent.fixed = true;
        }
        // Change node state
        clickedNode.valueExpanded = true;
        popoto.update();
    };

    /**
     * Fetches the list of relationships of a node and store them in the relationships property.
     *
     * @param node the node to fetch the relationships.
     * @param callback
     * @param directionAngle
     */
    popoto.graph.node.loadRelationshipData = function (node, callback, directionAngle) {
        var schema = popoto.provider.node.getSchema(node.label);

        if (schema !== undefined) {
            if (schema.hasOwnProperty("rel") && schema.rel.length > 0) {
                callback(popoto.graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(schema.rel).map(function (d) {
                    var data = {
                        id: d.data.label + d.data.target.label,
                        label: d.data.label,
                        target: d.data.target.label,
                        count: 0,
                        startAngle: d.startAngle,
                        endAngle: d.endAngle,
                        directionAngle: (d.startAngle + d.endAngle) / 2
                    };

                    if (d.data.isReverse === true) {
                        data.isReverse = true;
                    }

                    return data;
                }));
            } else {
                callback([]);
            }
        } else {
            var query = popoto.query.generateNodeRelationQuery(node);

            popoto.logger.info("Relations (" + node.label + ") ==>");
            popoto.rest.post(
                {
                    "statements": [
                        {
                            "statement": query.statement,
                            "parameters": query.parameters
                        }]
                })
                .done(function (response) {
                    popoto.logger.info("<== Relations (" + node.label + ")");
                    var parsedData = popoto.rest.response.parse(response);

                    // Filter data to eventually remove relations if a filter has been defined in config.
                    var filteredData = parsedData[0].filter(function (d) {
                        return popoto.query.filterRelation(d);
                    });

                    filteredData = popoto.graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(filteredData).map(function (d) {
                        return {
                            id: d.data.label + d.data.target,
                            label: d.data.label,
                            target: d.data.target,
                            count: d.data.count,
                            startAngle: d.startAngle,
                            endAngle: d.endAngle,
                            directionAngle: (d.startAngle + d.endAngle) / 2
                        }
                    });

                    callback(filteredData);
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
                    callback([]);
                });
        }
    };

    /**
     * Expands all the relationships available in node.
     *
     * @param node
     * @param callback
     */
    popoto.graph.node.expandRelationships = function (node, callback) {
        var callbackCount = 0;

        if (node.hasOwnProperty("relationships") && node.relationships.length > 0) {

            for (var i = 0; i < node.relationships.length; i++) {
                popoto.graph.addRelationshipData(node, node.relationships[i], function () {
                    callbackCount++;

                    if (callbackCount === node.relationships.length) {
                        callback();
                    }
                })
            }
        } else {
            callback();
        }
    };

    /**
     *
     * @param node
     * @param link
     * @param callback
     * @param values
     * @param isNegative
     */
    popoto.graph.addRelationshipData = function (node, link, callback, values, isNegative) {
        var targetNode = {
            "id": "" + popoto.graph.generateId(),
            "parent": node,
            "parentRel": link.label,
            "type": popoto.graph.node.NodeTypes.CHOOSE,
            "label": link.target,
            "fixed": false,
            "internalLabel": popoto.graph.node.generateInternalLabel(link.target),
            "relationships": []
        };

        if (link.isReverse === true) {
            targetNode.isParentRelReverse = true;
        }

        if (values !== undefined && values.length > 0) {
            targetNode.value = values;
        }
        if (isNegative !== undefined && isNegative === true) {
            targetNode.isNegative = true;
        }

        var newLink = {
            id: "l" + popoto.graph.generateId(),
            source: node,
            target: targetNode,
            type: popoto.graph.link.LinkTypes.RELATION,
            label: link.label
        };

        targetNode.x = node.x + ((popoto.provider.link.getDistance(newLink) * 2 / 3) * Math.cos(link.directionAngle - Math.PI / 2)) + Math.random() * 10;
        targetNode.y = node.y + ((popoto.provider.link.getDistance(newLink) * 2 / 3) * Math.sin(link.directionAngle - Math.PI / 2)) + Math.random() * 10;

        targetNode.tx = node.tx + ((popoto.provider.link.getDistance(newLink)) * Math.cos(link.directionAngle - Math.PI / 2));
        targetNode.ty = node.ty + ((popoto.provider.link.getDistance(newLink)) * Math.sin(link.directionAngle - Math.PI / 2));

        popoto.graph.force.nodes().push(targetNode);
        popoto.graph.force.links().push(newLink);

        popoto.graph.hasGraphChanged = true;
        popoto.updateGraph();

        popoto.graph.node.loadRelationshipData(targetNode, function (relationships) {
                targetNode.relationships = relationships;

                popoto.graph.hasGraphChanged = true;
                popoto.updateGraph();

                if (popoto.provider.node.getIsAutoExpandRelations(targetNode.label)) {
                    popoto.graph.node.expandRelationships(targetNode, function () {
                        callback(targetNode);
                    })
                } else {
                    callback(targetNode)
                }
            },
            link.directionAngle
        );


    };

    /**
     * Remove a node and its relationships (recursively) from the graph.
     *
     * @param node the node to remove.
     */
    popoto.graph.node.removeNode = function (node) {
        var willChangeResults = node.hasOwnProperty("value") && node.value.length > 0;

        var linksToRemove = popoto.graph.force.links().filter(function (l) {
            return l.source === node;
        });

        // Remove children nodes from model
        linksToRemove.forEach(function (l) {
            var rc = popoto.graph.node.removeNode(l.target);
            willChangeResults = willChangeResults || rc;
        });

        // Remove links from model
        for (var i = popoto.graph.force.links().length - 1; i >= 0; i--) {
            if (popoto.graph.force.links()[i].target === node) {
                popoto.graph.force.links().splice(i, 1);
            }
        }

        popoto.graph.force.nodes().splice(popoto.graph.force.nodes().indexOf(node), 1);

        return willChangeResults;
    };

    /**
     * Function to add on node event to clear the selection.
     * Call to this function on a node will remove the selected value and trigger a graph update.
     */
    popoto.graph.node.clearSelection = function () {
        // Prevent default event like right click  opening menu.
        d3.event.preventDefault();

        // Get clicked node.
        var clickedNode = d3.select(this).data()[0];

        // Collapse all expanded choose nodes first
        popoto.graph.node.collapseAllNode();

        if (clickedNode.value !== undefined && clickedNode.value.length > 0 && !clickedNode.immutable) {
            // Remove last value of chosen node
            clickedNode.value.pop();

            if (clickedNode.isNegative === true) {
                if (clickedNode.value.length === 0) {
                    // Remove all related nodes

                    for (var i = popoto.graph.force.links().length - 1; i >= 0; i--) {
                        if (popoto.graph.force.links()[i].source === clickedNode) {
                            popoto.graph.node.removeNode(popoto.graph.force.links()[i].target);
                        }
                    }

                    clickedNode.count = 0;
                }
            }

            popoto.result.hasChanged = true;
            popoto.graph.hasGraphChanged = true;
            popoto.update();
        }
    };

// QUERY VIEWER -----------------------------------------------------------------------------------------------------
    popoto.queryviewer = {};
    popoto.queryviewer.containerId = "popoto-query";
    popoto.queryviewer.QUERY_STARTER = "I'm looking for";
    popoto.queryviewer.CHOOSE_LABEL = "choose";

    /**
     * Create the query viewer area.
     *
     */
    popoto.queryviewer.createQueryArea = function () {
        var id = "#" + popoto.queryviewer.containerId;

        popoto.queryviewer.queryConstraintSpanElements = d3.select(id).append("p").attr("class", "ppt-query-constraint-elements").selectAll(".queryConstraintSpan");
        popoto.queryviewer.querySpanElements = d3.select(id).append("p").attr("class", "ppt-query-elements").selectAll(".querySpan");
    };

    /**
     * Update all the elements displayed on the query viewer based on current graph.
     */
    popoto.queryviewer.updateQuery = function () {

        // Remove all query span elements
        popoto.queryviewer.queryConstraintSpanElements = popoto.queryviewer.queryConstraintSpanElements.data([]);
        popoto.queryviewer.querySpanElements = popoto.queryviewer.querySpanElements.data([]);

        popoto.queryviewer.queryConstraintSpanElements.exit().remove();
        popoto.queryviewer.querySpanElements.exit().remove();

        // Update data
        popoto.queryviewer.queryConstraintSpanElements = popoto.queryviewer.queryConstraintSpanElements.data(popoto.queryviewer.generateConstraintData(popoto.graph.force.links(), popoto.graph.force.nodes()));
        popoto.queryviewer.querySpanElements = popoto.queryviewer.querySpanElements.data(popoto.queryviewer.generateData(popoto.graph.force.links(), popoto.graph.force.nodes()));

        // Remove old span (not needed as all have been cleaned before)
        // popoto.queryviewer.querySpanElements.exit().remove();

        // Add new span
        popoto.queryviewer.queryConstraintSpanElements.enter().append("span")
            .on("contextmenu", popoto.queryviewer.rightClickSpan)
            .on("click", popoto.queryviewer.clickSpan)
            .on("mouseover", popoto.queryviewer.mouseOverSpan)
            .on("mouseout", popoto.queryviewer.mouseOutSpan);

        popoto.queryviewer.querySpanElements.enter().append("span")
            .on("contextmenu", popoto.queryviewer.rightClickSpan)
            .on("click", popoto.queryviewer.clickSpan)
            .on("mouseover", popoto.queryviewer.mouseOverSpan)
            .on("mouseout", popoto.queryviewer.mouseOutSpan);

        // Update all span
        popoto.queryviewer.queryConstraintSpanElements
            .attr("id", function (d) {
                return d.id
            })
            .attr("class", function (d) {
                if (d.isLink) {
                    return "ppt-span-link";
                } else {
                    if (d.type === popoto.graph.node.NodeTypes.ROOT) {
                        return "ppt-span-root";
                    } else if (d.type === popoto.graph.node.NodeTypes.CHOOSE) {
                        if (d.ref.value !== undefined && d.ref.value.length > 0) {
                            return "ppt-span-value";
                        } else {
                            return "ppt-span-choose";
                        }
                    } else if (d.type === popoto.graph.node.NodeTypes.VALUE) {
                        return "ppt-span-value";
                    } else if (d.type === popoto.graph.node.NodeTypes.GROUP) {
                        return "ppt-span-group";
                    } else {
                        return "ppt-span";
                    }
                }
            })
            .text(function (d) {
                return d.term + " ";
            });

        popoto.queryviewer.querySpanElements
            .attr("id", function (d) {
                return d.id
            })
            .attr("class", function (d) {
                if (d.isLink) {
                    return "ppt-span-link";
                } else {
                    if (d.type === popoto.graph.node.NodeTypes.ROOT) {
                        return "ppt-span-root";
                    } else if (d.type === popoto.graph.node.NodeTypes.CHOOSE) {
                        if (d.ref.value !== undefined && d.ref.value.length > 0) {
                            return "ppt-span-value";
                        } else {
                            return "ppt-span-choose";
                        }
                    } else if (d.type === popoto.graph.node.NodeTypes.VALUE) {
                        return "ppt-span-value";
                    } else if (d.type === popoto.graph.node.NodeTypes.GROUP) {
                        return "ppt-span-group";
                    } else {
                        return "ppt-span";
                    }
                }
            })
            .text(function (d) {
                return d.term + " ";
            });
    };

    popoto.queryviewer.generateConstraintData = function (links, nodes) {
        var elmts = [], id = 0;

        // Add query starter
        elmts.push(
            {id: id++, term: popoto.queryviewer.QUERY_STARTER}
        );

        // Add the root node as query term
        if (nodes.length > 0) {
            elmts.push(
                {id: id++, type: nodes[0].type, term: popoto.provider.node.getSemanticValue(nodes[0]), ref: nodes[0]}
            );
        }

        // Add a span for each link and its target node
        links.forEach(function (l) {

            var sourceNode = l.source;
            var targetNode = l.target;
            if (l.type === popoto.graph.link.LinkTypes.RELATION && targetNode.type !== popoto.graph.node.NodeTypes.GROUP && targetNode.value !== undefined && targetNode.value.length > 0) {
                if (sourceNode.type === popoto.graph.node.NodeTypes.GROUP) {
                    elmts.push(
                        {
                            id: id++,
                            type: sourceNode.type,
                            term: popoto.provider.node.getSemanticValue(sourceNode),
                            ref: sourceNode
                        }
                    );
                }

                elmts.push({id: id++, isLink: true, term: popoto.provider.link.getSemanticValue(l), ref: l});

                if (targetNode.type !== popoto.graph.node.NodeTypes.GROUP) {
                    if (targetNode.value !== undefined && targetNode.value.length > 0) {
                        elmts.push(
                            {
                                id: id++,
                                type: targetNode.type,
                                term: popoto.provider.node.getSemanticValue(targetNode),
                                ref: targetNode
                            }
                        );
                    } else {
                        elmts.push(
                            {
                                id: id++,
                                type: targetNode.type,
                                term: "<" + popoto.queryviewer.CHOOSE_LABEL + " " + popoto.provider.node.getSemanticValue(targetNode) + ">",
                                ref: targetNode
                            }
                        );
                    }
                }
            }
        });

        return elmts;
    };

    // TODO add option nodes in generated query when no value is available
    popoto.queryviewer.generateData = function (links, nodes) {
        var elmts = [], options = [], id = 0;

        // Add a span for each link and its target node
        links.forEach(function (l) {

            var sourceNode = l.source;
            var targetNode = l.target;

            if (targetNode.type === popoto.graph.node.NodeTypes.GROUP) {
                options.push(
                    {
                        id: id++,
                        type: targetNode.type,
                        term: popoto.provider.node.getSemanticValue(targetNode),
                        ref: targetNode
                    }
                );
            }

            if (l.type === popoto.graph.link.LinkTypes.RELATION && targetNode.type !== popoto.graph.node.NodeTypes.GROUP && (targetNode.value === undefined || targetNode.value.length === 0)) {
                if (sourceNode.type === popoto.graph.node.NodeTypes.GROUP) {
                    elmts.push(
                        {
                            id: id++,
                            type: sourceNode.type,
                            term: popoto.provider.node.getSemanticValue(sourceNode),
                            ref: sourceNode
                        }
                    );
                }

                elmts.push({id: id++, isLink: true, term: popoto.provider.link.getSemanticValue(l), ref: l});

                if (targetNode.type !== popoto.graph.node.NodeTypes.GROUP) {
                    elmts.push(
                        {
                            id: id++,
                            type: targetNode.type,
                            term: "<" + popoto.queryviewer.CHOOSE_LABEL + " " + popoto.provider.node.getSemanticValue(targetNode) + ">",
                            ref: targetNode
                        }
                    );
                }
            }
        });

        return elmts.concat(options);
    };

    /**
     *
     */
    popoto.queryviewer.mouseOverSpan = function () {
        d3.select(this).classed("hover", function (d) {
            return d.ref;
        });

        var hoveredSpan = d3.select(this).data()[0];

        if (hoveredSpan.ref) {
            var linkElmt = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            linkElmt.select("path").classed("ppt-link-hover", true);
            linkElmt.select("text").classed("ppt-link-hover", true);

            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });

            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

            if (popoto.cypherviewer.isActive) {
                popoto.cypherviewer.querySpanElements.filter(function (d) {
                    return d.node === hoveredSpan.ref || d.link === hoveredSpan.ref;
                }).classed("hover", true);
            }
        }
    };

    popoto.queryviewer.rightClickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (!clickedSpan.isLink && clickedSpan.ref) {
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.ref;
            });

            nodeElmt.on("contextmenu").call(nodeElmt.node(), clickedSpan.ref);
        }
    };

    popoto.queryviewer.clickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (!clickedSpan.isLink && clickedSpan.ref) {
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.ref;
            });

            nodeElmt.on("click").call(nodeElmt.node(), clickedSpan.ref);
        }
    };

    /**
     *
     */
    popoto.queryviewer.mouseOutSpan = function () {
        d3.select(this).classed("hover", false);

        var hoveredSpan = d3.select(this).data()[0];

        if (hoveredSpan.ref) {
            var linkElmt = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            linkElmt.select("path").classed("ppt-link-hover", false);
            linkElmt.select("text").classed("ppt-link-hover", false);

            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

            if (popoto.cypherviewer.isActive) {
                popoto.cypherviewer.querySpanElements.filter(function (d) {
                    return d.node === hoveredSpan.ref || d.link === hoveredSpan.ref;
                }).classed("hover", false);
            }
        }
    };

// CYPHER VIEWER -----------------------------------------------------------------------------------------------------

    popoto.cypherviewer = {};
    popoto.cypherviewer.containerId = "popoto-cypher";
    popoto.cypherviewer.MATCH = "MATCH";
    popoto.cypherviewer.RETURN = "RETURN";
    popoto.cypherviewer.WHERE = "WHERE";
    popoto.cypherviewer.QueryElementTypes = Object.freeze({
        KEYWORD: 0,
        NODE: 1,
        SEPARATOR: 2,
        SOURCE: 3,
        LINK: 4,
        TARGET: 5,
        RETURN: 6,
        WHERE: 7
    });

    /**
     * Create the Cypher viewer area.
     *
     */
    popoto.cypherviewer.createQueryArea = function () {
        var id = "#" + popoto.cypherviewer.containerId;

        popoto.cypherviewer.querySpanElements = d3.select(id).append("p").attr("class", "ppt-query-constraint-elements").selectAll(".queryConstraintSpan");
    };

    /**
     * Update all the elements displayed on the cypher viewer based on current graph.
     */
    popoto.cypherviewer.updateQuery = function () {

        // Remove all query span elements
        popoto.cypherviewer.querySpanElements = popoto.cypherviewer.querySpanElements.data([]);

        popoto.cypherviewer.querySpanElements.exit().remove();

        // Update data
        popoto.cypherviewer.querySpanElements = popoto.cypherviewer.querySpanElements.data(popoto.cypherviewer.generateData(popoto.graph.force.links(), popoto.graph.force.nodes()));

        // Remove old span (not needed as all have been cleaned before)
        // popoto.queryviewer.querySpanElements.exit().remove();

        // Add new span
        popoto.cypherviewer.querySpanElements.enter().append("span")
            .attr("id", function (d) {
                return "cypher-" + d.id;
            })
            .on("mouseover", popoto.cypherviewer.mouseOverSpan)
            .on("mouseout", popoto.cypherviewer.mouseOutSpan)
            .on("contextmenu", popoto.cypherviewer.rightClickSpan)
            .on("click", popoto.cypherviewer.clickSpan);

        // Update all spans:
        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.KEYWORD;
        })
            .attr("class", "ppt-span")
            .text(function (d) {
                return " " + d.value + " ";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.SEPARATOR;
        })
            .attr("class", "ppt-span")
            .text(function (d) {
                return d.value + " ";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.NODE;
        })
            .attr("class", function (d) {
                if (d.node.value !== undefined && d.node.value.length > 0) {
                    return "ppt-span-root-value";
                } else {
                    return "ppt-span-root";
                }
            })
            .text(function (d) {
                return "(" + d.node.internalLabel + ":`" + d.node.label + "`)";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.SOURCE;
        })
            .attr("class", function (d) {
                if (d.node === popoto.graph.getRootNode()) {
                    if (d.node.value !== undefined && d.node.value.length > 0) {
                        return "ppt-span-root-value";
                    } else {
                        return "ppt-span-root";
                    }
                } else {
                    if (d.node.value !== undefined && d.node.value.length > 0) {
                        return "ppt-span-value";
                    } else {
                        return "ppt-span-choose";
                    }
                }
            })
            .text(function (d) {
                var sourceNode = d.node;
                return "(" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.LINK;
        })
            .attr("class", "ppt-span-link")
            .text(function (d) {
                if (d.link.target.isParentRelReverse === true) {
                    return "<-[:`" + d.link.label + "`]-";
                } else {
                    return "-[:`" + d.link.label + "`]-" + (popoto.query.USE_RELATION_DIRECTION ? ">" : "");
                }
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.TARGET;
        })
            .attr("class", function (d) {
                if (d.node.value !== undefined && d.node.value.length > 0) {
                    return "ppt-span-value";
                } else {
                    return "ppt-span-choose";
                }
            })
            .text(function (d) {
                return "(" + d.node.internalLabel + ":`" + d.node.label + "`)";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.WHERE;
        })
            .attr("class", function (d) {
                if (d.node === popoto.graph.getRootNode()) {
                    return "ppt-span-root-value";
                } else {
                    return "ppt-span-value";
                }
            })
            .text(function (d) {
                var node = d.node;
                if (node.isNegative === true) {
                    if (!node.hasOwnProperty("value") || node.value.length <= 0) {
                        return "(NOT (" + d.link.source.internalLabel + ":`" + d.link.source.label + "`)-[:`" + d.link.label + "`]->(:`" + d.link.target.label + "`))";
                    } else {
                        var clauses = [];
                        var constAttr = popoto.provider.node.getConstraintAttribute(node.label);
                        node.value.forEach(function (value) {
                            clauses.push(
                                "(NOT (" + d.link.source.internalLabel + ":`" + d.link.source.label + "`)-[:`" + d.link.label + "`]->(:`" + d.link.target.label + "`{" + constAttr + ":" + value.attributes[constAttr] + "}))"
                            );
                        });

                        return clauses.join(" AND ");
                    }
                } else {
                    var constraintAttr = popoto.provider.node.getConstraintAttribute(node.label);

                    var text = "";
                    var separator = "";

                    if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        text += node.internalLabel + ".id";
                    } else {
                        text += node.internalLabel + "." + constraintAttr;
                    }

                    if (node.hasOwnProperty("value") && node.value.length > 1) {
                        text += " IN [";
                    } else {
                        text += " = ";
                    }

                    node.value.forEach(function (value) {
                        text += separator;
                        separator = ", ";
                        if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                            text += value.internalID;
                        } else {
                            var constraintValue = value.attributes[constraintAttr];
                            if (typeof constraintValue === "boolean" || typeof constraintValue === "number") {
                                text += constraintValue;
                            } else {
                                text += "\"" + constraintValue + "\"";
                            }
                        }
                    });

                    if (node.value.length > 1) {
                        text += "]";
                    }

                    return "(" + text + ")";
                }
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.RETURN;
        })
            .attr("class", function (d) {
                if (d.node.value !== undefined && d.node.value.length > 0) {
                    return "ppt-span-root-value";
                } else {
                    return "ppt-span-root";
                }
            })
            .text(function (d) {
                return d.node.internalLabel;
            });

    };

    /**
     * Generate the data from graph to use in cypher query viewer.
     * The returned data is a list of elements representing the current query.
     * Example:
     *
     * MATCH
     * (person:`Person`),
     * (person:`Person`)-[:`FOLLOWS`]->(person1:`Person`{`name`:\"Jessica Thompson\"}),
     * (person1:`Person`)-[:`REVIEWED`]->(movie5:`Movie`{`title`:\"The Replacements\"})
     * RETURN person
     *
     * @param links
     * @returns {Array}
     */
    popoto.cypherviewer.generateData = function (links) {
        var elmts = [], id = 0;
        var rootNode = popoto.graph.getRootNode();
        var relevantLinks = popoto.query.getRelevantLinks(rootNode, rootNode, links);
        var negativeLinks = relevantLinks.filter(function (rl) {
            return rl.target.isNegative === true && (!rl.target.hasOwnProperty("value") || rl.target.value.length <= 0)
        });

        elmts.push(
            {
                id: id++,
                type: popoto.cypherviewer.QueryElementTypes.KEYWORD,
                value: popoto.cypherviewer.MATCH
            }
        );

        if (rootNode) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.NODE,
                    node: rootNode
                }
            );
        }

        if (relevantLinks.length > 0 && relevantLinks.length > negativeLinks.length) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.SEPARATOR,
                    value: ","
                }
            );
        }

        for (var i = 0; i < relevantLinks.length; i++) {
            var relevantLink = relevantLinks[i];

            if (relevantLink.target.isNegative === true && (!relevantLink.target.hasOwnProperty("value") || relevantLink.target.value.length <= 0)) {
                // element not added here but in WHERE
            } else {
                elmts.push(
                    {
                        id: id++,
                        type: popoto.cypherviewer.QueryElementTypes.SOURCE,
                        node: relevantLink.source
                    }
                );

                elmts.push(
                    {
                        id: id++,
                        type: popoto.cypherviewer.QueryElementTypes.LINK,
                        link: relevantLink
                    }
                );

                elmts.push(
                    {
                        id: id++,
                        type: popoto.cypherviewer.QueryElementTypes.TARGET,
                        node: relevantLink.target
                    }
                );

                // Add separator except for last element
                if (i < (relevantLinks.length - 1)) {
                    elmts.push(
                        {
                            id: id++,
                            type: popoto.cypherviewer.QueryElementTypes.SEPARATOR,
                            value: ","
                        }
                    );
                }
            }
        }

        if ((rootNode && rootNode.value !== undefined && rootNode.value.length > 0) || (relevantLinks.length > 0)) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.KEYWORD,
                    value: popoto.cypherviewer.WHERE
                }
            );
        }

        if (rootNode && rootNode.value !== undefined && rootNode.value.length > 0) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.WHERE,
                    node: rootNode
                }
            );

            if (relevantLinks.length > 0) {
                elmts.push(
                    {
                        id: id++,
                        type: popoto.cypherviewer.QueryElementTypes.SEPARATOR,
                        value: " AND "
                    }
                );
            }
        }

        var needSeparator = false;
        for (var i = 0; i < relevantLinks.length; i++) {
            var relevantLink = relevantLinks[i];
            if (relevantLink.target.isNegative === true) {
                if (needSeparator) {
                    elmts.push(
                        {
                            id: id++,
                            type: popoto.cypherviewer.QueryElementTypes.SEPARATOR,
                            value: " AND "
                        }
                    );
                }
                elmts.push(
                    {
                        id: id++,
                        type: popoto.cypherviewer.QueryElementTypes.WHERE,
                        node: relevantLink.target,
                        link: relevantLink
                    }
                );
                needSeparator = true;
            } else {
                if (relevantLink.target.value !== undefined && relevantLink.target.value.length > 0) {

                    if (needSeparator) {
                        elmts.push(
                            {
                                id: id++,
                                type: popoto.cypherviewer.QueryElementTypes.SEPARATOR,
                                value: " AND "
                            }
                        );
                    }

                    elmts.push(
                        {
                            id: id++,
                            type: popoto.cypherviewer.QueryElementTypes.WHERE,
                            node: relevantLink.target
                        }
                    );

                    needSeparator = true;
                }
            }
        }

        elmts.push(
            {
                id: id++,
                type: popoto.cypherviewer.QueryElementTypes.KEYWORD,
                value: popoto.cypherviewer.RETURN
            }
        );

        if (rootNode) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.RETURN,
                    node: rootNode
                }
            );
        }

        return elmts;
    };

    /**
     *
     */
    popoto.cypherviewer.mouseOverSpan = function () {
        var hoveredSpan = d3.select(this).data()[0];
        if (hoveredSpan.node) {
            // Hover all spans with same node data
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredSpan.node;
            }).classed("hover", true);

            // Highlight node in graph
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.node;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

            // Highlight query viewer
            if (popoto.queryviewer.isActive) {
                popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", true);

                popoto.queryviewer.querySpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", true);
            }
        } else if (hoveredSpan.link) {
            d3.select(this).classed("hover", true);

            // Highlight link in graph
            var linkElmt = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.link;
            });
            linkElmt.select("path").classed("ppt-link-hover", true);
            linkElmt.select("text").classed("ppt-link-hover", true);
        }
    };

    popoto.cypherviewer.mouseOutSpan = function () {
        var hoveredSpan = d3.select(this).data()[0];
        if (hoveredSpan.node) {
            // Remove hover on all spans with same node data
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredSpan.node;
            }).classed("hover", false);

            // Remove highlight on node in graph
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.node;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

            if (popoto.queryviewer.isActive) {
                popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", false);

                popoto.queryviewer.querySpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", false);
            }
        } else if (hoveredSpan.link) {
            d3.select(this).classed("hover", false);

            // Remove highlight on link in graph
            var linkElmt = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.link;
            });
            linkElmt.select("path").classed("ppt-link-hover", false);
            linkElmt.select("text").classed("ppt-link-hover", false);
        }
    };

    popoto.cypherviewer.clickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (clickedSpan.node) {
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.node;
            });

            nodeElmt.on("click").call(nodeElmt.node(), clickedSpan.node);
        }
    };

    popoto.cypherviewer.rightClickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (clickedSpan.node) {
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.node;
            });

            nodeElmt.on("contextmenu").call(nodeElmt.node(), clickedSpan.node);
        }
    };

// QUERY ------------------------------------------------------------------------------------------------------------
    popoto.query = {};
    /**
     * Define the number of results displayed in result list.
     */
    popoto.query.MAX_RESULTS_COUNT = 100;
    // popoto.query.RESULTS_PAGE_NUMBER = 1;
    popoto.query.VALUE_QUERY_LIMIT = 100;
    popoto.query.USE_PARENT_RELATION = false;
    popoto.query.USE_RELATION_DIRECTION = true;
    popoto.query.COLLECT_RELATIONS_WITH_VALUES = false;
    popoto.query.prefilter = "";

    /**
     * Immutable constant object to identify Neo4j internal ID
     */
    popoto.query.NEO4J_INTERNAL_ID = Object.freeze({queryInternalName: "NEO4JID"});

    /**
     * Function used to filter returned relations
     * return false if the result should be filtered out.
     *
     * @param d relation returned object
     * @returns {boolean}
     */
    popoto.query.filterRelation = function (d) {
        return true;
    };

    /**
     * Generate the query to count nodes of a label.
     * If the label is defined as distinct in configuration the query will count only distinct values on constraint attribute.
     */
    popoto.query.generateTaxonomyCountQuery = function (label) {
        var constraintAttr = popoto.provider.node.getConstraintAttribute(label);

        var whereElements = [];

        var predefinedConstraints = popoto.provider.node.getPredefinedConstraints(label);
        predefinedConstraints.forEach(function (predefinedConstraint) {
            whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), "n"));
        });

        if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
            return "MATCH (n:`" + label + "`)" + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN count(DISTINCT ID(n)) as count"
        } else {
            return "MATCH (n:`" + label + "`)" + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN count(DISTINCT n." + constraintAttr + ") as count"
        }
    };

    /**
     * Generate Cypher query match and where elements from root node, selected node and a set of the graph links.
     *
     * @param rootNode root node in the graph.
     * @param selectedNode graph target node.
     * @param links list of links subset of the graph.
     * @returns {{matchElements: Array, whereElements: Array}}  list of match and where elements.
     * @param isConstraintNeeded (used only for relation query)
     */
    popoto.query.generateQueryElements = function (rootNode, selectedNode, links, isConstraintNeeded) {
        var matchElements = [];
        var whereElements = [];
        var relationElements = [];
        var returnElements = [];
        var parameters = {};

        var rootPredefinedConstraints = popoto.provider.node.getPredefinedConstraints(rootNode.label);

        rootPredefinedConstraints.forEach(function (predefinedConstraint) {
            whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), rootNode.internalLabel));
        });

        matchElements.push("(" + rootNode.internalLabel + ":`" + rootNode.label + "`)");

        // Generate root node match element
        if (isConstraintNeeded || rootNode.immutable) {
            var rootValueConstraints = popoto.query.generateNodeValueConstraints(rootNode);
            whereElements = whereElements.concat(rootValueConstraints.whereElements);
            for (var param in rootValueConstraints.parameters) {
                if (rootValueConstraints.parameters.hasOwnProperty(param)) {
                    parameters[param] = rootValueConstraints.parameters[param];
                }
            }
        }

        var relId = 0;

        // Generate match elements for each links
        links.forEach(function (l) {
            var sourceNode = l.source;
            var targetNode = l.target;

            var rel = "->";

            if (!popoto.query.USE_RELATION_DIRECTION || targetNode.isParentRelReverse === true) {
                rel = "-";
            }

            var relIdentifier = "r" + relId++;
            relationElements.push(relIdentifier);
            var predefinedConstraints = popoto.provider.node.getPredefinedConstraints(targetNode.label);

            predefinedConstraints.forEach(function (predefinedConstraint) {
                whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), targetNode.internalLabel));
            });

            if (targetNode !== selectedNode && targetNode.isNegative === true) {
                if (targetNode.value !== undefined && targetNode.value.length > 0) {
                    var count = 0;

                    targetNode.value.forEach(function (v) {
                        var constraintAttr = popoto.provider.node.getConstraintAttribute(v.label);
                        var param;
                        if (count === 0) {
                            param = targetNode.internalLabel + "_" + constraintAttr;
                            count++;
                        } else {
                            param = targetNode.internalLabel + "_" + constraintAttr + count++;
                        }

                        whereElements.push("(NOT (" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[:`" + l.label + "`]" + rel + "(:`" + targetNode.label + "`{" + constraintAttr + ":$" + param + "}) )");
                    });
                } else {
                    whereElements.push("(NOT (" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[:`" + l.label + "`]" + rel + "(:`" + targetNode.label + "`) )");
                }
            } else {
                if (popoto.query.COLLECT_RELATIONS_WITH_VALUES && targetNode === selectedNode) {
                    returnElements.push("COLLECT(" + relIdentifier + ") AS incomingRels");
                }

                matchElements.push("(" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[" + relIdentifier + ":`" + l.label + "`]" + rel + "(" + targetNode.internalLabel + ":`" + targetNode.label + "`)");
            }


            if (targetNode !== selectedNode && (isConstraintNeeded || targetNode.immutable)) {
                var nodeValueConstraints = popoto.query.generateNodeValueConstraints(targetNode);
                whereElements = whereElements.concat(nodeValueConstraints.whereElements);
                for (var param in nodeValueConstraints.parameters) {
                    if (nodeValueConstraints.parameters.hasOwnProperty(param)) {
                        parameters[param] = nodeValueConstraints.parameters[param];
                    }
                }
            }
        });

        return {
            "matchElements": matchElements,
            "whereElements": whereElements,
            "relationElements": relationElements,
            "returnElements": returnElements,
            "parameters": parameters
        };
    };

    /**
     * Generate the where and parameter statements for the nodes with value
     *
     * @param node
     */
    popoto.query.generateNodeValueConstraints = function (node) {
        var parameters = {}, whereElements = [];
        if (node.value !== undefined && node.value.length > 0) {
            var constraintAttr = popoto.provider.node.getConstraintAttribute(node.label);
            var paramName = node.internalLabel + "_" + constraintAttr;

            if (node.value.length > 1) { // Generate IN constraint
                if (node.isNegative === undefined || !node.isNegative) {
                    parameters[paramName] = [];

                    node.value.forEach(function (value) {
                        var constraintValue;
                        if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                            constraintValue = value.internalID
                        } else {
                            constraintValue = value.attributes[constraintAttr];
                        }

                        parameters[paramName].push(constraintValue);
                    });

                    if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        whereElements.push("ID(" + node.internalLabel + ") IN " + "{`" + paramName + "`}");
                    } else {
                        whereElements.push(node.internalLabel + "." + constraintAttr + " IN " + "{`" + paramName + "`}");
                    }
                } else {
                    var count = 0;

                    node.value.forEach(function (value) {
                        var constraintValue;
                        if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                            constraintValue = value.internalID
                        } else {
                            constraintValue = value.attributes[constraintAttr];
                        }
                        if (count === 0) {
                            parameters[paramName] = constraintValue;
                            count++;
                        } else {
                            parameters[paramName + count++] = constraintValue;
                        }
                    });
                }

            } else { // Generate = constraint
                if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                    parameters[paramName] = node.value[0].internalID;
                } else {
                    parameters[paramName] = node.value[0].attributes[constraintAttr];
                }

                if (node.isNegative === undefined || !node.isNegative) {
                    var operator = "=";

                    if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        whereElements.push("ID(" + node.internalLabel + ") " + operator + " " + "{`" + paramName + "`}");
                    } else {
                        whereElements.push(node.internalLabel + "." + constraintAttr + " " + operator + " " + "{`" + paramName + "`}");
                    }
                }
            }
        }

        return {
            parameters: parameters,
            whereElements: whereElements
        }
    };

    /**
     * Filter links to get only paths from root to leaf containing a value or being the selectedNode.
     * All other paths in the graph containing no value are ignored.
     *
     * @param rootNode root node of the graph.
     * @param targetNode node in the graph target of the query.
     * @param initialLinks list of links repreasenting the graph to filter.
     * @returns {Array} list of relevant links.
     */
    popoto.query.getRelevantLinks = function (rootNode, targetNode, initialLinks) {

        var links = initialLinks.slice();
        var filteredLinks = [];
        var finalLinks = [];

        // Filter all links to keep only those containing a value or being the selected node.
        links.forEach(function (l) {
            if ((l.target.value !== undefined && l.target.value.length > 0) || l.target === targetNode || l.target.isNegative) {
                filteredLinks.push(l);
            }
        });

        // All the filtered links are removed from initial links list.
        filteredLinks.forEach(function (l) {
            links.splice(links.indexOf(l), 1);
        });

        // Then all the intermediate links up to the root node are added to get only the relevant links.
        filteredLinks.forEach(function (fl) {
            var sourceNode = fl.source;
            var search = true;

            while (search) {
                var intermediateLink = null;
                links.forEach(function (l) {
                    if (l.target === sourceNode) {
                        intermediateLink = l;
                    }
                });

                if (intermediateLink === null) { // no intermediate links needed
                    search = false
                } else {
                    if (intermediateLink.source === rootNode) {
                        finalLinks.push(intermediateLink);
                        links.splice(links.indexOf(intermediateLink), 1);
                        search = false;
                    } else {
                        finalLinks.push(intermediateLink);
                        links.splice(links.indexOf(intermediateLink), 1);
                        sourceNode = intermediateLink.source;
                    }
                }
            }
        });

        return filteredLinks.concat(finalLinks);
    };

    /**
     * Get the list of link defining the complete path from node to root.
     * All other links are ignored.
     *
     * @param node The node where to start in the graph.
     * @param links
     */
    popoto.query.getLinksToRoot = function (node, links) {
        var pathLinks = [];
        var targetNode = node;

        while (targetNode !== popoto.graph.getRootNode()) {
            var nodeLink;

            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                if (link.target === targetNode) {
                    nodeLink = link;
                    break;
                }
            }

            if (nodeLink) {
                pathLinks.push(nodeLink);
                targetNode = nodeLink.source;
            }
        }

        return pathLinks;
    };

    /**
     * Generate a Cypher query to retrieve the results matching the current graph.
     *
     * @param isGraph
     * @returns {{statement: string, parameters: (*|{})}}
     */
    popoto.query.generateResultQuery = function (isGraph) {
        var rootNode = popoto.graph.getRootNode();
        var queryElements = popoto.query.generateQueryElements(rootNode, rootNode, popoto.query.getRelevantLinks(rootNode, rootNode, popoto.graph.force.links()), true);
        var queryMatchElements = queryElements.matchElements,
            queryWhereElements = queryElements.whereElements,
            queryRelationElements = queryElements.relationElements,
            queryReturnElements = [],
            queryEndElements = [],
            queryParameters = queryElements.parameters;

        // Sort results by specified attribute
        var resultOrderByAttribute = popoto.provider.node.getResultOrderByAttribute(rootNode.label);
        if (resultOrderByAttribute) {
            var order = popoto.provider.node.isResultOrderAscending(rootNode.label) ? "ASC" : "DESC";
            queryEndElements.push("ORDER BY " + resultOrderByAttribute + " " + order);
        }

        queryEndElements.push("LIMIT " + popoto.query.MAX_RESULTS_COUNT);

        var resultAttributes = popoto.provider.node.getReturnAttributes(rootNode.label);

        if (!isGraph) {
            for (var i = 0; i < resultAttributes.length; i++) {
                var attribute = resultAttributes[i];
                if (attribute === popoto.query.NEO4J_INTERNAL_ID) {
                    queryReturnElements.push("ID(" + rootNode.internalLabel + ") AS " + popoto.query.NEO4J_INTERNAL_ID.queryInternalName);
                } else {
                    queryReturnElements.push(rootNode.internalLabel + "." + attribute + " AS " + attribute);
                }
            }
        } else {
            // Only return relations
            queryReturnElements.push(rootNode.internalLabel);
            queryRelationElements.forEach(
                function (el) {
                    queryReturnElements.push(el);
                }
            );
        }

        var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN DISTINCT " + queryReturnElements.join(", ") + " " + queryEndElements.join(" ");

        // Filter the query if defined in config
        var queryStructure = popoto.provider.node.filterResultQuery(rootNode.label, {
            statement: queryStatement,
            matchElements: queryMatchElements,
            whereElements: queryWhereElements,
            withElements: [],
            returnElements: queryReturnElements,
            endElements: queryEndElements,
            parameters: queryParameters
        });

        queryStructure.statement = popoto.query.prefilter + queryStructure.statement;

        return queryStructure;
    };

    /**
     * Generate a cypher query to the get the node count, set as parameter matching the current graph.
     *
     * @param countedNode the counted node
     * @returns {string} the node count cypher query
     */
    popoto.query.generateNodeCountQuery = function (countedNode) {

        var queryElements = popoto.query.generateQueryElements(popoto.graph.getRootNode(), countedNode, popoto.query.getRelevantLinks(popoto.graph.getRootNode(), countedNode, popoto.graph.force.links()), true);
        var queryMatchElements = queryElements.matchElements,
            queryWhereElements = queryElements.whereElements,
            queryReturnElements = [],
            queryEndElements = [],
            queryParameters = queryElements.parameters;

        var countAttr = popoto.provider.node.getConstraintAttribute(countedNode.label);

        if (countAttr === popoto.query.NEO4J_INTERNAL_ID) {
            queryReturnElements.push("count(DISTINCT ID(" + countedNode.internalLabel + ")) as count");
        } else {
            queryReturnElements.push("count(DISTINCT " + countedNode.internalLabel + "." + countAttr + ") as count");
        }

        var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ");

        // Filter the query if defined in config
        var queryStructure = popoto.provider.node.filterNodeCountQuery(countedNode, {
            statement: queryStatement,
            matchElements: queryMatchElements,
            whereElements: queryWhereElements,
            returnElements: queryReturnElements,
            endElements: queryEndElements,
            parameters: queryParameters
        });

        return {
            statement: popoto.query.prefilter + queryStructure.statement,
            parameters: queryStructure.parameters
        };
    };

    /**
     * Generate a Cypher query from the graph model to get all the possible values for the targetNode element.
     *
     * @param targetNode node in the graph to get the values.
     * @returns {string} the query to execute to get all the values of targetNode corresponding to the graph.
     */
    popoto.query.generateNodeValueQuery = function (targetNode) {

        var rootNode = popoto.graph.getRootNode();
        var queryElements = popoto.query.generateQueryElements(rootNode, targetNode, popoto.query.getRelevantLinks(rootNode, targetNode, popoto.graph.force.links()), true);
        var queryMatchElements = queryElements.matchElements,
            queryWhereElements = queryElements.whereElements,
            queryReturnElements = [],
            queryEndElements = [],
            queryParameters = queryElements.parameters;

        // Sort results by specified attribute
        var valueOrderByAttribute = popoto.provider.node.getValueOrderByAttribute(targetNode.label);
        if (valueOrderByAttribute) {
            var order = popoto.provider.node.isValueOrderAscending(targetNode.label) ? "ASC" : "DESC";
            queryEndElements.push("ORDER BY " + valueOrderByAttribute + " " + order);
        }

        queryEndElements.push("LIMIT " + popoto.query.VALUE_QUERY_LIMIT);

        var resultAttributes = popoto.provider.node.getReturnAttributes(targetNode.label);
        var constraintAttribute = popoto.provider.node.getConstraintAttribute(targetNode.label);

        for (var i = 0; i < resultAttributes.length; i++) {
            if (resultAttributes[i] === popoto.query.NEO4J_INTERNAL_ID) {
                queryReturnElements.push("ID(" + targetNode.internalLabel + ") AS " + popoto.query.NEO4J_INTERNAL_ID.queryInternalName);
            } else {
                queryReturnElements.push(targetNode.internalLabel + "." + resultAttributes[i] + " AS " + resultAttributes[i]);
            }
        }

        // Add count return attribute on root node
        var rootConstraintAttr = popoto.provider.node.getConstraintAttribute(rootNode.label);

        if (rootConstraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
            queryReturnElements.push("count(DISTINCT ID(" + rootNode.internalLabel + ")) AS count");
        } else {
            queryReturnElements.push("count(DISTINCT " + rootNode.internalLabel + "." + rootConstraintAttr + ") AS count");
        }

        if (popoto.query.COLLECT_RELATIONS_WITH_VALUES) {
            queryElements.returnElements.forEach(function (re) {
                queryReturnElements.push(re);
            });
        }

        var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ") + " " + queryEndElements.join(" ");

        // Filter the query if defined in config
        var queryStructure = popoto.provider.node.filterNodeValueQuery(targetNode, {
            statement: queryStatement,
            matchElements: queryMatchElements,
            whereElements: queryWhereElements,
            returnElements: queryReturnElements,
            endElements: queryEndElements,
            parameters: queryParameters
        });

        return {
            statement: popoto.query.prefilter + queryStructure.statement,
            parameters: queryStructure.parameters
        };

    };

    /**
     * Generate a Cypher query to retrieve all the relation available for a given node.
     *
     * @param targetNode
     * @returns {string}
     */
    popoto.query.generateNodeRelationQuery = function (targetNode) {

        var linksToRoot = popoto.query.getLinksToRoot(targetNode, popoto.graph.force.links());
        var queryElements = popoto.query.generateQueryElements(popoto.graph.getRootNode(), targetNode, linksToRoot, false);
        var queryMatchElements = queryElements.matchElements,
            queryWhereElements = queryElements.whereElements,
            queryReturnElements = [],
            queryEndElements = [],
            queryParameters = queryElements.parameters;

        var rel = popoto.query.USE_RELATION_DIRECTION ? "->" : "-";

        queryMatchElements.push("(" + targetNode.internalLabel + ":`" + targetNode.label + "`)-[r]" + rel + "(x)");
        queryReturnElements.push("type(r) AS label");
        if (popoto.query.USE_PARENT_RELATION) {
            queryReturnElements.push("head(labels(x)) AS target");
        } else {
            queryReturnElements.push("last(labels(x)) AS target");
        }
        queryReturnElements.push("count(r) AS count");
        queryEndElements.push("ORDER BY count(r) DESC");

        var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ") + " " + queryEndElements.join(" ");
        // Filter the query if defined in config
        var queryStructure = popoto.provider.node.filterNodeRelationQuery(targetNode, {
            statement: queryStatement,
            matchElements: queryMatchElements,
            whereElements: queryWhereElements,
            returnElements: queryReturnElements,
            endElements: queryEndElements,
            parameters: queryParameters
        });

        return {
            statement: popoto.query.prefilter + queryStructure.statement,
            parameters: queryStructure.parameters
        };

    };

    ///////////////////////////////////////////////////////////////////
    // Results

    popoto.result = {};
    popoto.result.containerId = "popoto-results";
    popoto.result.hasChanged = true;
    popoto.result.resultCountListeners = [];
    popoto.result.resultListeners = [];
    popoto.result.graphResultListeners = [];
    popoto.result.RESULTS_PAGE_SIZE = 10;

    /**
     * Register a listener to the result count event.
     * This listener will be called on evry result change with total result count.
     */
    popoto.result.onTotalResultCount = function (listener) {
        popoto.result.resultCountListeners.push(listener);
    };

    popoto.result.onResultReceived = function (listener) {
        popoto.result.resultListeners.push(listener);
    };

    popoto.result.onGraphResultReceived = function (listener) {
        popoto.result.graphResultListeners.push(listener);
    };

    /**
     * Parse REST returned Graph data and generate a list of nodes and edges.
     *
     * @param data
     * @returns {{nodes: Array, edges: Array}}
     */
    popoto.result.parseGraphResultData = function (data) {

        var nodes = {}, edges = {};

        data.results[1].data.forEach(function (row) {
            row.graph.nodes.forEach(function (n) {
                if (!nodes.hasOwnProperty(n.id)) {
                    nodes[n.id] = n;
                }
            });

            row.graph.relationships.forEach(function (r) {
                if (!edges.hasOwnProperty(r.id)) {
                    edges[r.id] = r;
                }
            });
        });

        var nodesArray = [], edgesArray = [];

        for (var n in nodes) {
            if (nodes.hasOwnProperty(n)) {
                nodesArray.push(nodes[n]);
            }
        }

        for (var e in edges) {
            if (edges.hasOwnProperty(e)) {
                edgesArray.push(edges[e])
            }
        }

        return {nodes: nodesArray, edges: edgesArray};
    };

    popoto.result.updateResults = function () {
        if (popoto.result.hasChanged) {
            var query = popoto.query.generateResultQuery();
            popoto.result.lastGeneratedQuery = query;

            var postData = {
                "statements": [
                    {
                        "statement": query.statement,
                        "parameters": query.parameters,
                        "resultDataContents": ["row"]
                    }
                ]
            };

            // Add Graph result query if listener found
            if (popoto.result.graphResultListeners.length > 0) {
                var graphQuery = popoto.query.generateResultQuery(true);
                popoto.result.lastGeneratedQuery = graphQuery;

                postData.statements.push(
                    {
                        "statement": graphQuery.statement,
                        "parameters": graphQuery.parameters,
                        "resultDataContents": ["graph"]
                    });
            }

            popoto.logger.info("Results ==>");

            popoto.rest.post(postData)
                .done(function (response) {
                    popoto.logger.info("<== Results");

                    var parsedData = popoto.rest.response.parse(response);

                    var resultObjects = parsedData[0].map(function (d, i) {
                        return {
                            "resultIndex": i,
                            "label": popoto.graph.getRootNode().label,
                            "attributes": d
                        };
                    });

                    popoto.result.lastResults = resultObjects;

                    // Notify listeners
                    popoto.result.resultListeners.forEach(function (listener) {
                        listener(resultObjects);
                    });

                    if (popoto.result.graphResultListeners.length > 0) {
                        var graphResultObjects = popoto.result.parseGraphResultData(response);
                        popoto.result.graphResultListeners.forEach(function (listener) {
                            listener(graphResultObjects);
                        });
                    }

                    // Update displayed results only if needed ()
                    if (popoto.result.isActive) {
                        // Clear all results
                        var results = d3.select("#" + popoto.result.containerId).selectAll(".ppt-result").data([]);
                        results.exit().remove();
                        // Update data
                        results = d3.select("#" + popoto.result.containerId).selectAll(".ppt-result").data(resultObjects.slice(0, popoto.result.RESULTS_PAGE_SIZE), function (d) {
                            return d.resultIndex;
                        });

                        // Add new elements
                        var pElmt = results.enter()
                            .append("div")
                            .attr("class", "ppt-result")
                            .attr("id", function (d) {
                                return "popoto-result-" + d.resultIndex;
                            });

                        // Generate results with providers
                        pElmt.each(function (d) {
                            popoto.provider.node.getDisplayResults(d.label)(d3.select(this));
                        });
                    }

                    popoto.result.hasChanged = false;
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);

                    // Notify listeners
                    popoto.result.resultListeners.forEach(function (listener) {
                        listener([]);
                    });

                });
        }
    };

    popoto.result.updateResultsCount = function () {
        // Update result counts with root node count
        if (popoto.result.resultCountListeners.length > 0) {
            popoto.result.resultCountListeners.forEach(function (listener) {
                listener(popoto.graph.getRootNode().count);
            });
        }
    };

    popoto.result.generatePreQuery = function () {
        var p = {"ids": []};

        popoto.result.lastResults.forEach(function (d) {
            p.ids.push(d.attributes.id)
        });

        return {
            query: "MATCH (d) WHERE d.id IN $ids WITH d",
            param: p
        };
    };


    ///////////////////////////////////////////////////////////////////
    // VORONOI

    popoto.graph.voronoi = d3.geom.voronoi()
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        });

    popoto.graph.recenterVoronoi = function (nodes) {
        var shapes = [];

        var voronois = popoto.graph.voronoi(nodes.map(function (d) {
            d.x = d.x || 0;
            d.y = d.y || 0;
            return d
        }));

        voronois.forEach(function (d) {
            if (!d.length) {
                return;
            }

            var n = [];
            d.forEach(function (c) {
                n.push([c[0] - d.point.x, c[1] - d.point.y]);
            });
            n.point = d.point;
            shapes.push(n);
        });
        return shapes;
    };

    ///////////////////////////////////////////////////////////////////
    // PROVIDER

    popoto.provider = {};
    /**
     * Default color scale generator.
     * Used in getColor link and node providers.
     */
    popoto.provider.colorScale = d3.scale.category20();
    popoto.provider.link = {};
    popoto.provider.link.Provider = {};
    popoto.provider.taxonomy = {};
    popoto.provider.taxonomy.Provider = {};
    popoto.provider.node = {};
    popoto.provider.node.Provider = {};

    //------------------------------------------------
    // LINKS

    /**
     *  Get the text representation of a link.
     *
     * @param link the link to get the text representation.
     * @returns {string} the text representation of the link.
     */
    popoto.provider.link.getTextValue = function (link) {
        if (popoto.provider.link.Provider.hasOwnProperty("getTextValue")) {
            return popoto.provider.link.Provider.getTextValue(link);
        } else {
            if (popoto.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getTextValue")) {
                return popoto.provider.link.DEFAULT_PROVIDER.getTextValue(link);
            } else {
                popoto.logger.error("No provider defined for link getTextValue");
            }
        }
    };

    popoto.provider.link.getColor = function (link, element, attribute) {
        if (popoto.provider.link.Provider.hasOwnProperty("getColor")) {
            return popoto.provider.link.Provider.getColor(link, element, attribute);
        } else {
            if (popoto.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getColor")) {
                return popoto.provider.link.DEFAULT_PROVIDER.getColor(link, element, attribute);
            } else {
                popoto.logger.error("No provider defined for getColor");
            }
        }
    };

    popoto.provider.link.getCSSClass = function (link, element) {
        if (popoto.provider.link.Provider.hasOwnProperty("getCSSClass")) {
            return popoto.provider.link.Provider.getCSSClass(link, element);
        } else {
            if (popoto.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getCSSClass")) {
                return popoto.provider.link.DEFAULT_PROVIDER.getCSSClass(link, element);
            } else {
                popoto.logger.error("No provider defined for getCSSClass");
            }
        }
    };

    popoto.provider.link.getDistance = function (link) {
        if (popoto.provider.link.Provider.hasOwnProperty("getDistance")) {
            return popoto.provider.link.Provider.getDistance(link);
        } else {
            if (popoto.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getDistance")) {
                return popoto.provider.link.DEFAULT_PROVIDER.getDistance(link);
            } else {
                popoto.logger.error("No provider defined for getDistance");
            }
        }
    };

    /**
     *  Get the semantic text representation of a link.
     *
     * @param link the link to get the semantic text representation.
     * @returns {string} the semantic text representation of the link.
     */
    popoto.provider.link.getSemanticValue = function (link) {
        if (popoto.provider.link.Provider.hasOwnProperty("getSemanticValue")) {
            return popoto.provider.link.Provider.getSemanticValue(link);
        } else {
            if (popoto.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getSemanticValue")) {
                return popoto.provider.link.DEFAULT_PROVIDER.getSemanticValue(link);
            } else {
                popoto.logger.error("No provider defined for getSemanticValue");
            }
        }
    };

    popoto.provider.colorLuminance = function (hex, lum) {

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
    popoto.provider.link.DEFAULT_PROVIDER = {
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
            if (link.type === popoto.graph.link.LinkTypes.VALUE) {
                // Links between node and list of values.

                if (popoto.provider.node.isTextDisplayed(link.target)) {
                    // Don't display text on link if text is displayed on target node.
                    return "";
                } else {
                    // No text is displayed on target node then the text is displayed on link.
                    return popoto.provider.node.getTextValue(link.target);
                }

            } else {
                var targetName = "";
                if (link.type === popoto.graph.link.LinkTypes.SEGMENT) {
                    targetName = " " + popoto.provider.node.getTextValue(link.target);
                }
                return link.label + targetName;
            }
        },


        /**
         *
         * @param link
         */
        "getDistance": function (link) {
            if (link.type === popoto.graph.link.LinkTypes.VALUE) {
                return (13 / 8) * (popoto.provider.node.getSize(link.source) + popoto.provider.node.getSize(link.target));
            } else {
                return (20 / 8) * (popoto.provider.node.getSize(link.source) + popoto.provider.node.getSize(link.target));
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
            if (link.type === popoto.graph.link.LinkTypes.VALUE) {
                return "#525863";
            } else {
                var colorId = link.source.label + link.label + link.target.label;

                var color = popoto.provider.colorScale(colorId);
                if (attribute === "stroke") {
                    return popoto.provider.colorLuminance(color, -0.2);
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

            if (link.type === popoto.graph.link.LinkTypes.VALUE) {
                cssClass = cssClass + "--value";
            } else {
                var labelAsCSSName = "ppt-" + link.label.replace(/[^0-9a-z\-_]/gi, '');
                if (link.type === popoto.graph.link.LinkTypes.RELATION) {
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
            return popoto.provider.link.getTextValue(link);
        }
    };

    popoto.provider.link.Provider = popoto.provider.link.DEFAULT_PROVIDER;

    //------------------------------------------------
    // TAXONOMY

    /**
     *  Get the text representation of a taxonomy.
     *
     * @param label the label used for the taxonomy.
     * @returns {string} the text representation of the taxonomy.
     */
    popoto.provider.taxonomy.getTextValue = function (label) {
        if (popoto.provider.taxonomy.Provider.hasOwnProperty("getTextValue")) {
            return popoto.provider.taxonomy.Provider.getTextValue(label);
        } else {
            if (popoto.provider.taxonomy.DEFAULT_PROVIDER.hasOwnProperty("getTextValue")) {
                return popoto.provider.taxonomy.DEFAULT_PROVIDER.getTextValue(label);
            } else {
                popoto.logger.error("No provider defined for taxonomy getTextValue");
            }
        }
    };

    /**
     *
     * @param label
     * @param element
     * @return {*}
     */
    popoto.provider.taxonomy.getCSSClass = function (label, element) {
        if (popoto.provider.taxonomy.Provider.hasOwnProperty("getCSSClass")) {
            return popoto.provider.taxonomy.Provider.getCSSClass(label, element);
        } else {
            if (popoto.provider.taxonomy.DEFAULT_PROVIDER.hasOwnProperty("getCSSClass")) {
                return popoto.provider.taxonomy.DEFAULT_PROVIDER.getCSSClass(label, element);
            } else {
                popoto.logger.error("No provider defined for taxonomy getCSSClass");
            }
        }
    };

    /**
     * Label provider used by default if none have been defined for a label.
     * This provider can be changed if needed to customize default behavior.
     * If some properties are not found in user customized providers, default values will be extracted from this provider.
     */
    popoto.provider.taxonomy.DEFAULT_PROVIDER = {
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

    popoto.provider.taxonomy.Provider = popoto.provider.taxonomy.DEFAULT_PROVIDER;

    /**
     * Define the different type of rendering of a node for a given label.
     * TEXT: default rendering type, the node will be displayed with an ellipse and a text in it.
     * IMAGE: the node is displayed as an image using the image tag in the svg graph.
     * In this case an image path is required.
     * SVG: the node is displayed using a list of svg path, each path can contain its own color.
     */
    popoto.provider.node.DisplayTypes = Object.freeze({TEXT: 0, IMAGE: 1, SVG: 2, SYMBOL: 3});

    /**
     * Get the label provider for the given label.
     * If no provider is defined for the label:
     * First search in parent provider.
     * Then if not found will create one from default provider.
     *
     * @param label to retrieve the corresponding label provider.
     * @returns {object} corresponding label provider.
     */
    popoto.provider.node.getProvider = function (label) {
        if (label === undefined) {
            popoto.logger.error("Node label is undefined, no label provider can be found.");
        } else {
            if (popoto.provider.node.Provider.hasOwnProperty(label)) {
                return popoto.provider.node.Provider[label];
            } else {
                popoto.logger.debug("No direct provider found for label " + label);

                // Search in all children list definitions to find the parent provider.
                for (var p in popoto.provider.node.Provider) {
                    if (popoto.provider.node.Provider.hasOwnProperty(p)) {
                        var provider = popoto.provider.node.Provider[p];
                        if (provider.hasOwnProperty("children")) {
                            if (provider["children"].indexOf(label) > -1) {
                                popoto.logger.debug("No provider is defined for label (" + label + "), parent (" + p + ") will be used");
                                // A provider containing the required label in its children definition has been found it will be cloned.

                                var newProvider = {"parent": p};
                                for (var pr in provider) {
                                    if (provider.hasOwnProperty(pr) && pr !== "children" && pr !== "parent") {
                                        newProvider[pr] = provider[pr];
                                    }
                                }

                                popoto.provider.node.Provider[label] = newProvider;
                                return popoto.provider.node.Provider[label];
                            }
                        }
                    }
                }

                popoto.logger.debug("No label provider defined for label (" + label + ") default one will be created from popoto.provider.node.DEFAULT_PROVIDER");

                popoto.provider.node.Provider[label] = {};
                // Clone default provider properties in new provider.
                for (var prop in popoto.provider.node.DEFAULT_PROVIDER) {
                    if (popoto.provider.node.DEFAULT_PROVIDER.hasOwnProperty(prop)) {
                        popoto.provider.node.Provider[label][prop] = popoto.provider.node.DEFAULT_PROVIDER[prop];
                    }
                }
                return popoto.provider.node.Provider[label];
            }
        }
    };

    /**
     * Get the property or function defined in node label provider.
     * If the property is not found search is done in parents.
     * If not found in parent, property defined in popoto.provider.node.DEFAULT_PROVIDER is returned.
     * If not found in default provider, defaultValue is set and returned.
     *
     * @param label node label to get the property in its provider.
     * @param name name of the property to retrieve.
     * @returns {*} node property defined in its label provider.
     */
    popoto.provider.node.getProperty = function (label, name) {
        var provider = popoto.provider.node.getProvider(label);

        if (!provider.hasOwnProperty(name)) {
            var providerIterator = provider;

            // Check parents
            var isPropertyFound = false;
            while (providerIterator.hasOwnProperty("parent") && !isPropertyFound) {
                providerIterator = popoto.provider.node.getProvider(providerIterator.parent);
                if (providerIterator.hasOwnProperty(name)) {

                    // Set attribute in child to optimize next call.
                    provider[name] = providerIterator[name];
                    isPropertyFound = true;
                }
            }

            if (!isPropertyFound) {
                popoto.logger.debug("No \"" + name + "\" property found for node label provider (" + label + "), default value will be used");
                if (popoto.provider.node.DEFAULT_PROVIDER.hasOwnProperty(name)) {
                    provider[name] = popoto.provider.node.DEFAULT_PROVIDER[name];
                } else {
                    popoto.logger.debug("No default value for \"" + name + "\" property found for label provider (" + label + ")");
                }
            }
        }
        return provider[name];
    };

    /**
     *
     * @param label
     */
    popoto.provider.node.getIsAutoLoadValue = function (label) {
        return popoto.provider.node.getProperty(label, "isAutoLoadValue");
    };

    /**
     * Return the "isSearchable" property for the node label provider.
     * Is Searchable defines whether the label can be used as graph query builder root.
     * If true the label can be displayed in the taxonomy filter.
     *
     * @param label
     * @returns boolean
     */
    popoto.provider.node.getIsSearchable = function (label) {
        return popoto.provider.node.getProperty(label, "isSearchable");
    };

    /**
     * Return the "autoExpandRelations" property for the node label provider.
     * Auto expand relations defines whether the label will automatically add its relations when displayed on graph.
     *
     * @param label
     * @returns boolean
     */
    popoto.provider.node.getIsAutoExpandRelations = function (label) {
        return popoto.provider.node.getProperty(label, "autoExpandRelations");
    };

    popoto.provider.node.getSchema = function (label) {
        return popoto.provider.node.getProperty(label, "schema");
    };

    /**
     * Return the list of attributes defined in node label provider.
     * Parents return attributes are also returned.
     *
     * @param label used to retrieve parent attributes.
     * @returns {Array} list of return attributes for a node.
     */
    popoto.provider.node.getReturnAttributes = function (label) {
        var provider = popoto.provider.node.getProvider(label);
        var attributes = {}; // Object is used as a Set to merge possible duplicate in parents

        if (provider.hasOwnProperty("returnAttributes")) {
            for (var i = 0; i < provider.returnAttributes.length; i++) {
                if (provider.returnAttributes[i] === popoto.query.NEO4J_INTERNAL_ID) {
                    attributes[popoto.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
                } else {
                    attributes[provider.returnAttributes[i]] = true;
                }
            }
        }

        // Add parent attributes
        while (provider.hasOwnProperty("parent")) {
            provider = popoto.provider.node.getProvider(provider.parent);
            if (provider.hasOwnProperty("returnAttributes")) {
                for (var j = 0; j < provider.returnAttributes.length; j++) {
                    if (provider.returnAttributes[j] === popoto.query.NEO4J_INTERNAL_ID) {
                        attributes[popoto.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
                    } else {
                        attributes[provider.returnAttributes[j]] = true;
                    }
                }
            }
        }

        // Add default provider attributes if any but not internal id as this id is added only if none has been found.
        if (popoto.provider.node.DEFAULT_PROVIDER.hasOwnProperty("returnAttributes")) {
            for (var k = 0; k < popoto.provider.node.DEFAULT_PROVIDER.returnAttributes.length; k++) {
                if (popoto.provider.node.DEFAULT_PROVIDER.returnAttributes[k] !== popoto.query.NEO4J_INTERNAL_ID) {
                    attributes[popoto.provider.node.DEFAULT_PROVIDER.returnAttributes[k]] = true;
                }
            }
        }

        // Add constraint attribute in the list
        var constraintAttribute = popoto.provider.node.getConstraintAttribute(label);
        if (constraintAttribute === popoto.query.NEO4J_INTERNAL_ID) {
            attributes[popoto.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
        } else {
            attributes[constraintAttribute] = true;
        }


        // Add all in array
        var attrList = [];
        for (var attr in attributes) {
            if (attributes.hasOwnProperty(attr)) {
                if (attr === popoto.query.NEO4J_INTERNAL_ID.queryInternalName) {
                    attrList.push(popoto.query.NEO4J_INTERNAL_ID);
                } else {
                    attrList.push(attr);
                }
            }
        }

        // If no attributes have been found internal ID is used
        if (attrList.length <= 0) {
            attrList.push(popoto.query.NEO4J_INTERNAL_ID);
        }
        return attrList;
    };

    /**
     * Return the attribute to use as constraint attribute for a node defined in its label provider.
     *
     * @param label
     * @returns {*}
     */
    popoto.provider.node.getConstraintAttribute = function (label) {
        return popoto.provider.node.getProperty(label, "constraintAttribute");
    };

    popoto.provider.node.getDisplayAttribute = function (label) {
        var displayAttribute = popoto.provider.node.getProperty(label, "displayAttribute");

        if (displayAttribute === undefined) {
            var returnAttributes = popoto.provider.node.getReturnAttributes(label);
            if (returnAttributes.length > 0) {
                displayAttribute = returnAttributes[0];
            } else {
                displayAttribute = popoto.provider.node.getConstraintAttribute(label);
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
    popoto.provider.node.getPredefinedConstraints = function (label) {
        return popoto.provider.node.getProperty(label, "getPredefinedConstraints")();
    };

    popoto.provider.node.filterResultQuery = function (label, initialQuery) {
        return popoto.provider.node.getProperty(label, "filterResultQuery")(initialQuery);
    };

    popoto.provider.node.getValueOrderByAttribute = function (label) {
        return popoto.provider.node.getProperty(label, "valueOrderByAttribute");
    };

    popoto.provider.node.isValueOrderAscending = function (label) {
        return popoto.provider.node.getProperty(label, "isValueOrderAscending");
    };

    popoto.provider.node.getResultOrderByAttribute = function (label) {
        return popoto.provider.node.getProperty(label, "resultOrderByAttribute");
    };

    /**
     *
     * @param label
     */
    popoto.provider.node.isResultOrderAscending = function (label) {
        return popoto.provider.node.getProperty(label, "isResultOrderAscending");
    };

    /**
     * Return the value of the getTextValue function defined in the label provider corresponding to the parameter node.
     * If no "getTextValue" function is defined in the provider, search is done in parents.
     * If none is found in parent default provider method is used.
     *
     * @param node
     * @param parameter
     */
    popoto.provider.node.getTextValue = function (node, parameter) {
        return popoto.provider.node.getProperty(node.label, "getTextValue")(node, parameter);
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
    popoto.provider.node.getSemanticValue = function (node) {
        return popoto.provider.node.getProperty(node.label, "getSemanticValue")(node);
    };

    /**
     * Return a list of SVG paths objects, each defined by a "d" property containing the path and "f" property for the color.
     *
     * @param node
     * @returns {*}
     */
    popoto.provider.node.getSVGPaths = function (node) {
        return popoto.provider.node.getProperty(node.label, "getSVGPaths")(node);
    };

    /**
     * Check in label provider if text must be displayed with images nodes.
     * @param node
     * @returns {*}
     */
    popoto.provider.node.isTextDisplayed = function (node) {
        return popoto.provider.node.getProperty(node.label, "getIsTextDisplayed")(node);
    };

    /**
     *
     * @param node
     */
    popoto.provider.node.getSize = function (node) {
        return popoto.provider.node.getProperty(node.label, "getSize")(node);
    };

    /**
     * Return the getColor property.
     *
     * @param node
     * @param style
     * @returns {*}
     */
    popoto.provider.node.getColor = function (node, style) {
        return popoto.provider.node.getProperty(node.label, "getColor")(node, style);
    };

    /**
     *
     * @param node
     * @param element
     */
    popoto.provider.node.getCSSClass = function (node, element) {
        return popoto.provider.node.getProperty(node.label, "getCSSClass")(node, element);
    };

    /**
     * Return the getIsGroup property.
     *
     * @param node
     * @returns {*}
     */
    popoto.provider.node.getIsGroup = function (node) {
        return popoto.provider.node.getProperty(node.label, "getIsGroup")(node);
    };

    /**
     * Return the node display type.
     * can be TEXT, IMAGE, SVG or GROUP.
     *
     * @param node
     * @returns {*}
     */
    popoto.provider.node.getNodeDisplayType = function (node) {
        return popoto.provider.node.getProperty(node.label, "getDisplayType")(node);
    };

    /**
     * Return the file path of the image defined in the provider.
     *
     * @param node the node to get the image path.
     * @returns {string} the path of the node image.
     */
    popoto.provider.node.getImagePath = function (node) {
        return popoto.provider.node.getProperty(node.label, "getImagePath")(node);
    };

    /**
     * Return the width size of the node image.
     *
     * @param node the node to get the image width.
     * @returns {int} the image width.
     */
    popoto.provider.node.getImageWidth = function (node) {
        return popoto.provider.node.getProperty(node.label, "getImageWidth")(node);
    };

    /**
     * Return the height size of the node image.
     *
     * @param node the node to get the image height.
     * @returns {int} the image height.
     */
    popoto.provider.node.getImageHeight = function (node) {
        return popoto.provider.node.getProperty(node.label, "getImageHeight")(node);
    };

    popoto.provider.node.filterNodeValueQuery = function (node, initialQuery) {
        return popoto.provider.node.getProperty(node.label, "filterNodeValueQuery")(node, initialQuery);
    };

    popoto.provider.node.filterNodeCountQuery = function (node, initialQuery) {
        return popoto.provider.node.getProperty(node.label, "filterNodeCountQuery")(node, initialQuery);
    };

    popoto.provider.node.filterNodeRelationQuery = function (node, initialQuery) {
        return popoto.provider.node.getProperty(node.label, "filterNodeRelationQuery")(node, initialQuery);
    };

    /**
     * Return the displayResults function defined in label parameter's provider.
     *
     * @param label
     * @returns {*}
     */
    popoto.provider.node.getDisplayResults = function (label) {
        return popoto.provider.node.getProperty(label, "displayResults");
    };

    /**
     * Label provider used by default if none have been defined for a label.
     * This provider can be changed if needed to customize default behavior.
     * If some properties are not found in user customized providers, default
     * values will be extracted from this provider.
     */
    popoto.provider.node.DEFAULT_PROVIDER = (
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
            "returnAttributes": [popoto.query.NEO4J_INTERNAL_ID],

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
             * Defines the attribute used to order the results.
             *
             * Default value is "null" to disable order by.
             */
            "resultOrderByAttribute": null,

            /**
             * Defines whether the result query order by is ascending, if false
             * order by will be descending.
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
            "constraintAttribute": popoto.query.NEO4J_INTERNAL_ID,

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
             * popoto.provider.node.DisplayTypes.IMAGE
             *  In this case the node will be drawn as an image and "getImagePath"
             *  function is required to return the node image path.
             *
             * popoto.provider.node.DisplayTypes.SVG
             *  In this case the node will be drawn as SVG paths and "getSVGPaths"
             *
             * popoto.provider.node.DisplayTypes.TEXT
             *  In this case the node will be drawn as a simple circle.
             *
             * Default value is TEXT.
             *
             * @param node the node to extract its type.
             * @returns {number} one value from popoto.provider.node.DisplayTypes
             */
            "getDisplayType": function (node) {
                return popoto.provider.node.DisplayTypes.TEXT;
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
                if (node.type === popoto.graph.node.NodeTypes.VALUE) {
                    return popoto.provider.node.getColor(node.parent);
                } else {
                    var parentLabel = "";
                    if (node.hasOwnProperty("parent")) {
                        parentLabel = node.parent.label
                    }

                    var incomingRelation = node.parentRel || "";

                    var colorId = parentLabel + incomingRelation + node.label;
                    return popoto.provider.colorScale(colorId);
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

                if (node.type === popoto.graph.node.NodeTypes.ROOT) {
                    cssClass = cssClass + "--root";
                }
                if (node.type === popoto.graph.node.NodeTypes.CHOOSE) {
                    cssClass = cssClass + "--choose";
                }
                if (node.type === popoto.graph.node.NodeTypes.GROUP) {
                    cssClass = cssClass + "--group";
                }
                if (node.type === popoto.graph.node.NodeTypes.VALUE) {
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
             * popoto.graph.node.NODE_MAX_CHARS property.
             *
             * @param node the node to represent as text.
             * @param maxLength used to truncate the text.
             * @returns {string} the text representation of the node.
             */
            "getTextValue": function (node, maxLength) {
                var text = "";
                var displayAttr = popoto.provider.node.getDisplayAttribute(node.label);
                if (node.type === popoto.graph.node.NodeTypes.VALUE) {
                    if (displayAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        text = "" + node.internalID;
                    } else {
                        text = "" + node.attributes[displayAttr];
                    }
                } else {
                    if (node.value !== undefined && node.value.length > 0) {
                        if (displayAttr === popoto.query.NEO4J_INTERNAL_ID) {
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
                var displayAttr = popoto.provider.node.getDisplayAttribute(node.label);
                if (node.type === popoto.graph.node.NodeTypes.VALUE) {
                    if (displayAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        text = "" + node.internalID;
                    } else {
                        text = "" + node.attributes[displayAttr];
                    }
                } else {
                    if (node.value !== undefined && node.value.length > 0) {
                        if (displayAttr === popoto.query.NEO4J_INTERNAL_ID) {
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
             * This function is only used for popoto.provider.node.DisplayTypes.IMAGE
             * type nodes.
             *
             * @param node
             * @returns {string}
             */
            "getImagePath": function (node) {
                // if (node.type === popoto.graph.node.NodeTypes.VALUE) {
                //     var constraintAttribute = popoto.provider.node.getConstraintAttribute(node.label);
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
                var size = popoto.provider.node.getSize(node);
                return [
                    {
                        "d": "M 0, 0 m -" + size + ", 0 a " + size + "," + size + " 0 1,0 " + 2 * size + ",0 a " + size + "," + size + " 0 1,0 -" + 2 * size + ",0",
                        "fill": "transparent",
                        "stroke": popoto.provider.node.getColor(node),
                        "stroke-width": "2px"
                    }
                ];
            },

            /**
             * Function returning the image width of the node.
             * This function is only used for popoto.provider.node.DisplayTypes.IMAGE
             * type nodes.
             *
             * @param node
             * @returns {number}
             */
            "getImageWidth": function (node) {
                return popoto.provider.node.getSize(node) * 2;
            },

            /**
             * Function returning the image height of the node.
             * This function is only used for popoto.provider.node.DisplayTypes.IMAGE
             * type nodes.
             *
             * @param node
             * @returns {number}
             */
            "getImageHeight": function (node) {
                return popoto.provider.node.getSize(node) * 2;
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

                var returnAttributes = popoto.provider.node.getReturnAttributes(result.label);

                var table = pElmt.append("table").attr("class", "ppt-result-table");

                returnAttributes.forEach(function (attribute) {
                    var attributeName = attribute;

                    if (popoto.query.NEO4J_INTERNAL_ID === attribute) {
                        attributeName = popoto.query.NEO4J_INTERNAL_ID.queryInternalName;
                    }

                    var tr = table.append("tr");
                    tr.append("th").text(function () {
                        if (attribute === popoto.query.NEO4J_INTERNAL_ID) {
                            return "internal ID:"
                        } else {
                            return attribute + ":";
                        }
                    });
                    if (result.attributes[attributeName] !== undefined) {
                        tr.append("td").text(function (result) {
                            return result.attributes[attributeName];
                        });
                    }
                });
            }

        });

    return popoto;
}();
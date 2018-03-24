import {version} from "./dist/package";
import {jQuery} from "jquery";
import * as d3 from "d3";

export default function create(config) {

    var instance = {
        version: version
    };

    /**
     * Main function to call to use Popoto.js.
     * This function will create all the HTML content based on available IDs in the page.
     * instance.graph.containerId for the graph query builder.
     * instance.queryviewer.containerId for the query viewer.
     *
     * @param startParam Root label or graph schema to use in the graph query builder.
     */
    instance.start = function (startParam) {
        instance.logger.info("Popoto " + instance.version + " start on " + startParam);

        instance.graph.mainLabel = startParam;

        if (instance.rest.CYPHER_URL === undefined) {
            instance.logger.error("instance.rest.CYPHER_URL is not set but is required.");
        } else {
            // TODO introduce component generator mechanism instead for future plugin extensions
            instance.checkHtmlComponents();

            if (instance.taxonomy.isActive) {
                instance.taxonomy.createTaxonomyPanel();
            }

            if (instance.graph.isActive) {
                instance.graph.createGraphArea();
                instance.graph.createForceLayout();

                if (typeof startParam === 'string' || startParam instanceof String) {
                    var labelSchema = instance.provider.node.getSchema(startParam);
                    if (labelSchema !== undefined) {
                        instance.graph.addSchema(labelSchema);
                    } else {
                        instance.graph.addRootNode(startParam);
                    }
                } else {
                    instance.graph.addSchema(startParam);
                }
            }

            if (instance.queryviewer.isActive) {
                instance.queryviewer.createQueryArea();
            }

            if (instance.cypherviewer.isActive) {
                instance.cypherviewer.createQueryArea();
            }

            instance.update();
        }
    };

    /**
     * Check in the HTML page the components to generate.
     */
    instance.checkHtmlComponents = function () {
        var graphHTMLContainer = d3.select("#" + instance.graph.containerId);
        var taxonomyHTMLContainer = d3.select("#" + instance.taxonomy.containerId);
        var queryHTMLContainer = d3.select("#" + instance.queryviewer.containerId);
        var cypherHTMLContainer = d3.select("#" + instance.cypherviewer.containerId);
        var resultsHTMLContainer = d3.select("#" + instance.result.containerId);

        if (graphHTMLContainer.empty()) {
            instance.logger.debug("The page doesn't contain a container with ID = \"" + instance.graph.containerId + "\" no graph area will be generated. This ID is defined in instance.graph.containerId property.");
            instance.graph.isActive = false;
        } else {
            instance.graph.isActive = true;
        }

        if (taxonomyHTMLContainer.empty()) {
            instance.logger.debug("The page doesn't contain a container with ID = \"" + instance.taxonomy.containerId + "\" no taxonomy filter will be generated. This ID is defined in instance.taxonomy.containerId property.");
            instance.taxonomy.isActive = false;
        } else {
            instance.taxonomy.isActive = true;
        }

        if (queryHTMLContainer.empty()) {
            instance.logger.debug("The page doesn't contain a container with ID = \"" + instance.queryviewer.containerId + "\" no query viewer will be generated. This ID is defined in instance.queryviewer.containerId property.");
            instance.queryviewer.isActive = false;
        } else {
            instance.queryviewer.isActive = true;
        }

        if (cypherHTMLContainer.empty()) {
            instance.logger.debug("The page doesn't contain a container with ID = \"" + instance.cypherviewer.containerId + "\" no cypher query viewer will be generated. This ID is defined in instance.cypherviewer.containerId property.");
            instance.cypherviewer.isActive = false;
        } else {
            instance.cypherviewer.isActive = true;
        }

        if (resultsHTMLContainer.empty()) {
            instance.logger.debug("The page doesn't contain a container with ID = \"" + instance.result.containerId + "\" no result area will be generated. This ID is defined in instance.result.containerId property.");
            instance.result.isActive = false;
        } else {
            instance.result.isActive = true;
        }
    };

    /**
     * Function to call to update all the generated elements including svg graph, query viewer and generated results.
     */
    instance.update = function () {
        instance.updateGraph();

        // Do not update if rootNode is not valid.
        var root = instance.graph.getRootNode();
        if (!root || root.label === undefined) {
            return;
        }

        if (instance.queryviewer.isActive) {
            instance.queryviewer.updateQuery();
        }
        if (instance.cypherviewer.isActive) {
            instance.cypherviewer.updateQuery();
        }
        // Results are updated only if needed.
        // If id found in html page or if result listeners have been added.
        // In this case the query must be executed.
        if (instance.result.isActive || instance.result.resultListeners.length > 0 || instance.result.resultCountListeners.length > 0 || instance.result.graphResultListeners.length > 0) {
            instance.result.updateResults();
        }
    };

    /**
     * Function to call to update the graph only.
     */
    instance.updateGraph = function () {
        if (instance.graph.isActive) {
            // Starts the D3.js force simulation.
            // This method must be called when the layout is first created, after assigning the nodes and links.
            // In addition, it should be called again whenever the nodes or links change.
            instance.graph.force.start();
            instance.graph.link.updateLinks();
            instance.graph.node.updateNodes();
        }
    };

    // REST ------------------------------------------------------------------------------------------------------------
    instance.rest = {};

    /**
     * Default REST URL used to call Neo4j server with cypher queries to execute.
     * This property should be updated to access to your own server.
     * @type {string}
     */
    instance.rest.CYPHER_URL = "http://localhost:7474/db/data/transaction/commit";

    /**
     * Create JQuery ajax POST request to access Neo4j REST API.
     *
     * @param data data object containing Cypher query.
     * @param url url where to post the data, default to instance.rest.CYPHER_URL property.
     * @returns {*} the JQuery ajax request object.
     */
    instance.rest.post = function (data, url) {
        var strData = JSON.stringify(data);
        instance.logger.info("REST POST:" + strData);

        var settings = {
            type: "POST",
            beforeSend: function (request) {
                if (instance.rest.AUTHORIZATION) {
                    request.setRequestHeader("Authorization", instance.rest.AUTHORIZATION);
                }
            },
            contentType: "application/json"
        };

        if (data !== undefined) {
            settings.data = strData;
        }

        if (instance.rest.WITH_CREDENTIALS === true) {
            settings.xhrFields = {
                withCredentials: true
            }
        }

        var postURL = instance.rest.CYPHER_URL;

        if (url !== undefined) {
            postURL = url;
        }

        return $.ajax(postURL, settings);
    };

    instance.rest.response = {
        parse: function (data) {
            instance.logger.debug(JSON.stringify((data)));
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

            instance.logger.info(JSON.stringify((parsedData)));
            return parsedData
        }
    };

    // LOGGER -----------------------------------------------------------------------------------------------------------
    instance.logger = {};
    instance.logger.LogLevels = Object.freeze({DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4});
    instance.logger.LEVEL = instance.logger.LogLevels.NONE;
    instance.logger.TRACE = false;

    /**
     * Log a message on console depending on configured log levels.
     * Level is define in instance.logger.LEVEL property.
     * If instance.logger.TRACE is set to true, the stack trace is also added in log.
     * @param logLevel Level of the message from instance.logger.LogLevels.
     * @param message Message to log.
     */
    instance.logger.log = function (logLevel, message) {
        if (console && logLevel >= instance.logger.LEVEL) {
            if (instance.logger.TRACE) {
                message = message + "\n" + new Error().stack
            }
            switch (logLevel) {
                case instance.logger.LogLevels.DEBUG:
                    console.log(message);
                    break;
                case instance.logger.LogLevels.INFO:
                    console.log(message);
                    break;
                case instance.logger.LogLevels.WARN:
                    console.warn(message);
                    break;
                case instance.logger.LogLevels.ERROR:
                    console.error(message);
                    break;
            }
        }
    };

    /**
     * Log a message in DEBUG level.
     * @param message to log.
     */
    instance.logger.debug = function (message) {
        instance.logger.log(instance.logger.LogLevels.DEBUG, message);
    };

    /**
     * Log a message in INFO level.
     * @param message to log.
     */
    instance.logger.info = function (message) {
        instance.logger.log(instance.logger.LogLevels.INFO, message);
    };

    /**
     * Log a message in WARN level.
     * @param message to log.
     */
    instance.logger.warn = function (message) {
        instance.logger.log(instance.logger.LogLevels.WARN, message);
    };

    /**
     * Log a message in ERROR level.
     * @param message to log.
     */
    instance.logger.error = function (message) {
        instance.logger.log(instance.logger.LogLevels.ERROR, message);
    };

    // TAXONOMIES  -----------------------------------------------------------------------------------------------------

    instance.taxonomy = {};
    instance.taxonomy.containerId = "instance-taxonomy";

    /**
     * Create the taxonomy panel HTML elements.
     */
    instance.taxonomy.createTaxonomyPanel = function () {
        var htmlContainer = d3.select("#" + instance.taxonomy.containerId);

        var taxoUL = htmlContainer.append("ul")
            .attr("class", "ppt-taxo-ul");

        var data = instance.taxonomy.generateTaxonomiesData();

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
                return "ppt-icon " + instance.provider.taxonomy.getCSSClass(d.label, "span-icon");
            })
            .html("&nbsp;");

        taxoli.append("span")
            .attr("class", "ppt-label")
            .text(function (d) {
                return instance.provider.taxonomy.getTextValue(d.label);
            });

        taxoli.append("span")
            .attr("class", "ppt-count");

        // Add an on click event on the taxonomy to clear the graph and set this label as root
        taxoli.on("click", instance.taxonomy.onClick);

        instance.taxonomy.addTaxonomyChildren(taxoli);

        // The count is updated for each labels.
        var flattenData = [];
        data.forEach(function (d) {
            flattenData.push(d);
            if (d.children) {
                instance.taxonomy.flattenChildren(d, flattenData);
            }
        });

        if (!instance.graph.DISABLE_COUNT) {
            instance.taxonomy.updateCount(flattenData);
        }
    };

    /**
     * Recursive function to flatten data content.
     *
     */
    instance.taxonomy.flattenChildren = function (d, vals) {
        d.children.forEach(function (c) {
            vals.push(c);
            if (c.children) {
                vals.concat(instance.taxonomy.flattenChildren(c, vals));
            }
        });
    };

    /**
     * Updates the count number on a taxonomy.
     *
     * @param taxonomyData
     */
    instance.taxonomy.updateCount = function (taxonomyData) {
        var statements = [];

        taxonomyData.forEach(function (taxo) {
            statements.push(
                {
                    "statement": instance.query.generateTaxonomyCountQuery(taxo.label)
                }
            );
        });

        (function (taxonomies) {
            instance.logger.info("Count taxonomies ==>");
            instance.rest.post(
                {
                    "statements": statements
                })
                .done(function (response) {
                    instance.logger.info("<== Count taxonomies");
                    var parsedData = instance.rest.response.parse(response);
                    for (var i = 0; i < taxonomies.length; i++) {
                        var count = parsedData[i][0].count;
                        d3.select("#" + taxonomies[i].id)
                            .select(".ppt-count")
                            .text(" (" + count + ")");
                    }
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    instance.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + instance.rest.CYPHER_URL + "\" defined in \"instance.rest.CYPHER_URL\" property: " + errorThrown);
                    d3.select("#instance-taxonomy")
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
    instance.taxonomy.addTaxonomyChildren = function (selection) {
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
                        return "ppt-icon " + instance.provider.taxonomy.getCSSClass(d.label, "span-icon");
                    })
                    .html("&nbsp;");

                childLi.append("span")
                    .attr("class", "ppt-label")
                    .text(function (d) {
                        return instance.provider.taxonomy.getTextValue(d.label);
                    });

                childLi.append("span")
                    .attr("class", "ppt-count");

                childLi.on("click", instance.taxonomy.onClick);

                instance.taxonomy.addTaxonomyChildren(childLi);
            }

        });
    };

    instance.taxonomy.onClick = function () {
        d3.event.stopPropagation();

        var label = this.attributes.value.value;

        while (instance.graph.force.nodes().length > 0) {
            instance.graph.force.nodes().pop();
        }

        while (instance.graph.force.links().length > 0) {
            instance.graph.force.links().pop();
        }

        // Reinitialize internal label generator
        instance.graph.node.internalLabels = {};

        instance.update();
        instance.graph.mainLabel = label;
        if (instance.provider.node.getSchema(label) !== undefined) {
            instance.graph.addSchema(instance.provider.node.getSchema(label));
        } else {
            instance.graph.addRootNode(label);
        }
        instance.graph.hasGraphChanged = true;
        instance.result.hasChanged = true;
        instance.graph.ignoreCount = false;
        instance.update();
        instance.tools.center();
    };

    /**
     * Parse the list of label providers and return a list of data object containing only searchable labels.
     * @returns {Array}
     */
    instance.taxonomy.generateTaxonomiesData = function () {
        var id = 0;
        var data = [];
        // Retrieve root providers (searchable and without parent)
        for (var label in instance.provider.node.Provider) {
            if (instance.provider.node.Provider.hasOwnProperty(label)) {
                if (instance.provider.node.getProperty(label, "isSearchable") && !instance.provider.node.Provider[label].parent) {
                    data.push({
                        "label": label,
                        "id": "instance-lbl-" + id++
                    });
                }
            }
        }

        // Add children data for each provider with children.
        data.forEach(function (d) {
            if (instance.provider.node.getProvider(d.label).hasOwnProperty("children")) {
                id = instance.taxonomy.addChildrenData(d, id);
            }
        });

        return data;
    };

    /**
     * Add children providers data.
     * @param parentData
     * @param id
     */
    instance.taxonomy.addChildrenData = function (parentData, id) {
        parentData.children = [];

        instance.provider.node.getProvider(parentData.label).children.forEach(function (d) {
            var childProvider = instance.provider.node.getProvider(d);
            var childData = {
                "label": d,
                "id": "instance-lbl-" + id++
            };
            if (childProvider.hasOwnProperty("children")) {
                id = instance.taxonomy.addChildrenData(childData, id);
            }
            if (instance.provider.node.getProperty(d, "isSearchable")) {
                parentData.children.push(childData);
            }
        });

        return id;
    };

    // TOOLIP -----------------------------------------------------------------------------------------------------------

    instance.tootip = {};

    // TOOLS -----------------------------------------------------------------------------------------------------------

    instance.tools = {};
    // TODO introduce plugin mechanism to add tools
    instance.tools.CENTER_GRAPH = true;
    instance.tools.RESET_GRAPH = true;
    instance.tools.SAVE_GRAPH = false;
    instance.tools.TOGGLE_TAXONOMY = true;
    instance.tools.TOGGLE_FULL_SCREEN = true;
    instance.tools.TOGGLE_VIEW_RELATION = true;

    /**
     * Reset the graph to display the root node only.
     */
    instance.tools.reset = function () {
        while (instance.graph.force.nodes().length > 0) {
            instance.graph.force.nodes().pop();
        }

        while (instance.graph.force.links().length > 0) {
            instance.graph.force.links().pop();
        }

        // Reinitialize internal label generator
        instance.graph.node.internalLabels = {};

        instance.update();
        if (typeof instance.graph.mainLabel === 'string' || instance.graph.mainLabel instanceof String) {
            if (instance.provider.node.getSchema(instance.graph.mainLabel) !== undefined) {
                instance.graph.addSchema(instance.provider.node.getSchema(instance.graph.mainLabel));
            } else {
                instance.graph.addRootNode(instance.graph.mainLabel);
            }
        } else {
            instance.graph.addSchema(instance.graph.mainLabel);
        }

        instance.graph.hasGraphChanged = true;
        instance.result.hasChanged = true;
        instance.update();
        instance.tools.center();
    };

    /**
     * Reset zoom and center the view on svg center.
     */
    instance.tools.center = function () {
        instance.graph.zoom.translate([0, 0]).scale(1);
        instance.graph.svg.transition().attr("transform", "translate(" + instance.graph.zoom.translate() + ")" + " scale(" + instance.graph.zoom.scale() + ")");
    };

    /**
     * Show, hide taxonomy panel.
     */
    instance.tools.toggleTaxonomy = function () {
        var taxo = d3.select("#" + instance.taxonomy.containerId);
        if (taxo.filter(".disabled").empty()) {
            taxo.classed("disabled", true);
        } else {
            taxo.classed("disabled", false);
        }

        instance.graph.centerRootNode();
    };

    /**
     * Show, hide relation donuts.
     */
    instance.tools.toggleViewRelation = function () {
        instance.graph.DISABLE_RELATION = !instance.graph.DISABLE_RELATION;
        d3.selectAll(".ppt-g-node-background").classed("hide", instance.graph.DISABLE_RELATION);
        instance.graph.tick();
    };

    instance.tools.toggleFullScreen = function () {

        var elem = document.getElementById(instance.graph.containerId);

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

    instance.graph = {};
    // Counter used internally to generate unique id in graph elements (like nodes and links)
    instance.graph.idGen = 0;

    /**
     * ID of the HTML component where the graph query builder elements will be generated in.
     * @type {string}
     */
    instance.graph.containerId = "instance-graph";
    instance.graph.hasGraphChanged = true;
    // Defines the min and max level of zoom available in graph query builder.
    instance.graph.zoom = d3.behavior.zoom().scaleExtent([0.1, 10]);
    instance.graph.WHEEL_ZOOM_ENABLED = true;
    instance.graph.TOOL_TAXONOMY = "Show/hide taxonomy panel";
    instance.graph.TOOL_RELATION = "Show/hide relation";
    instance.graph.TOOL_CENTER = "Center view";
    instance.graph.TOOL_FULL_SCREEN = "Full screen";
    instance.graph.TOOL_RESET = "Reset graph";
    instance.graph.TOOL_SAVE = "Save graph";
    instance.graph.USE_DONUT_FORCE = false;
    instance.graph.USE_VORONOI_LAYOUT = false;
    /**
     * Define the list of listenable events on graph.
     */
    instance.graph.Events = Object.freeze({
        NODE_ROOT_ADD: "root.node.add",
        NODE_EXPAND_RELATIONSHIP: "node.expandRelationship",
        GRAPH_SAVE: "graph.save",
        GRAPH_RESET: "graph.reset",
        GRAPH_NODE_VALUE_EXPAND: "graph.node.value_expand",
        GRAPH_NODE_VALUE_COLLAPSE: "graph.node.value_collapse",
        GRAPH_NODE_ADD_VALUE: "graph.node.add_value",
        GRAPH_NODE_DATA_LOADED: "graph.node.data_loaded"
    });

    instance.graph.generateId = function () {
        return instance.graph.idGen++;
    };

    instance.graph.listeners = {};

    /**
     * Add a listener to the specified event.
     *
     * @param event name of the event to add the listener.
     * @param listener the listener to add.
     */
    instance.graph.on = function (event, listener) {
        if (!instance.graph.listeners.hasOwnProperty(event)) {
            instance.graph.listeners[event] = [];
        }

        instance.graph.listeners[event].push(listener);
    };

    /**
     * Notify the listeners.
     *
     * @param event
     * @param parametersArray
     */
    instance.graph.notifyListeners = function (event, parametersArray) {
        if (instance.graph.listeners.hasOwnProperty(event)) {
            instance.graph.listeners[event].forEach(function (listener) {
                listener.apply(event, parametersArray);
            });
        }
    };

    /**
     * Add a listener on graph save event.
     * @param listener
     */
    instance.graph.onSave = function (listener) {
        instance.graph.on(instance.graph.Events.GRAPH_SAVE, listener);
    };

    /**
     * Add a listener on graph reset event.
     * @param listener
     */
    instance.graph.onReset = function (listener) {
        instance.graph.on(instance.graph.Events.GRAPH_RESET, listener);
    };

    /**
     * Set default graph to a predefined value.
     * @param graph
     */
    instance.graph.setDefaultGraph = function (graph) {
        instance.graph.mainLabel = graph;
    };

    /**
     * Generates all the HTML and SVG element needed to display the graph query builder.
     * Everything will be generated in the container with id defined by instance.graph.containerId.
     */
    instance.graph.createGraphArea = function () {

        var htmlContainer = d3.select("#" + instance.graph.containerId);

        var toolbar = htmlContainer
            .append("div")
            .attr("class", "ppt-toolbar");

        if (instance.tools.TOGGLE_VIEW_RELATION) {
            toolbar.append("span")
                .attr("id", "instance-toggle-relation")
                .attr("class", "ppt-icon ppt-menu relation")
                .attr("title", instance.graph.TOOL_RELATION)
                .on("click", function () {
                    instance.tools.toggleViewRelation();
                });
        }

        if (instance.tools.RESET_GRAPH) {
            toolbar.append("span")
                .attr("id", "instance-reset-menu")
                .attr("class", "ppt-icon ppt-menu reset")
                .attr("title", instance.graph.TOOL_RESET)
                .on("click", function () {
                    instance.graph.notifyListeners(instance.graph.Events.GRAPH_RESET, []);
                    instance.tools.reset();
                });
        }

        if (instance.taxonomy.isActive && instance.tools.TOGGLE_TAXONOMY) {
            toolbar.append("span")
                .attr("id", "instance-taxonomy-menu")
                .attr("class", "ppt-icon ppt-menu taxonomy")
                .attr("title", instance.graph.TOOL_TAXONOMY)
                .on("click", instance.tools.toggleTaxonomy);
        }

        if (instance.tools.CENTER_GRAPH) {
            toolbar.append("span")
                .attr("id", "instance-center-menu")
                .attr("class", "ppt-icon ppt-menu center")
                .attr("title", instance.graph.TOOL_CENTER)
                .on("click", instance.tools.center);
        }

        if (instance.tools.TOGGLE_FULL_SCREEN) {
            toolbar.append("span")
                .attr("id", "instance-fullscreen-menu")
                .attr("class", "ppt-icon ppt-menu fullscreen")
                .attr("title", instance.graph.TOOL_FULL_SCREEN)
                .on("click", instance.tools.toggleFullScreen);
        }

        if (instance.tools.SAVE_GRAPH) {
            toolbar.append("span")
                .attr("id", "instance-save-menu")
                .attr("class", "ppt-icon ppt-menu save")
                .attr("title", instance.graph.TOOL_SAVE)
                .on("click", function () {
                    instance.graph.notifyListeners(instance.graph.Events.GRAPH_SAVE, [instance.graph.getSchema()]);
                });
        }

        var svgTag = htmlContainer.append("svg")
        // .attr("viewBox", "0 0 800 600") TODO to avoid need of windows resize event
            .call(instance.graph.zoom.on("zoom", instance.graph.rescale));

        svgTag.on("dblclick.zoom", null)
            .attr("class", "ppt-svg-graph");

        if (!instance.graph.WHEEL_ZOOM_ENABLED) {
            // Disable mouse wheel events.
            svgTag.on("wheel.zoom", null)
                .on("mousewheel.zoom", null);
        }

        // Objects created inside a <defs> element are not rendered immediately; instead, think of them as templates or macros created for future use.
        instance.graph.svgdefs = svgTag.append("defs");

        // Cross marker for path with id #cross -X-
        instance.graph.svgdefs.append("marker")
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
        instance.graph.svgdefs.append("marker")
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
        instance.graph.svgdefs.append("marker")
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
        var grayscaleFilter = instance.graph.svgdefs.append("filter")
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
        var filter = instance.graph.svgdefs.append("filter").attr("id", "gooey");
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


        instance.graph.svgdefs.append("g")
            .attr("id", "voronoi-clip-path");

        instance.graph.svg = svgTag.append("svg:g");

        // Create two separated area for links and nodes
        // Links and nodes are separated in a dedicated "g" element
        // and nodes are generated after links to ensure that nodes are always on foreground.
        instance.graph.svg.append("g").attr("id", instance.graph.link.gID);
        instance.graph.svg.append("g").attr("id", instance.graph.node.gID);

        // This listener is used to center the root node in graph during a window resize.
        // TODO can the listener be limited on the parent container only?
        window.addEventListener('resize', instance.graph.centerRootNode);
    };

    instance.graph.centerRootNode = function () {
        instance.graph.getRootNode().px = instance.graph.getSVGWidth() / 2;
        instance.graph.getRootNode().py = instance.graph.getSVGHeight() / 2;
        instance.update();
    };

    /**
     * Get the actual width of the SVG element containing the graph query builder.
     * @returns {number}
     */
    instance.graph.getSVGWidth = function () {
        if (typeof instance.graph.svg == 'undefined' || instance.graph.svg.empty()) {
            instance.logger.debug("instance.graph.svg is undefined or empty.");
            return 0;
        } else {
            return document.getElementById(instance.graph.containerId).clientWidth;
        }
    };

    /**
     * Get the actual height of the SVG element containing the graph query builder.
     * @returns {number}
     */
    instance.graph.getSVGHeight = function () {
        if (typeof instance.graph.svg == 'undefined' || instance.graph.svg.empty()) {
            instance.logger.debug("instance.graph.svg is undefined or empty.");
            return 0;
        } else {
            return document.getElementById(instance.graph.containerId).clientHeight;
        }
    };

    /**
     * Function to call on SVG zoom event to update the svg transform attribute.
     */
    instance.graph.rescale = function () {
        var trans = d3.event.translate,
            scale = d3.event.scale;

        instance.graph.svg.attr("transform",
            "translate(" + trans + ")"
            + " scale(" + scale + ")");
    };

    /******************************
     * Default parameters used to configure D3.js force layout.
     * These parameter can be modified to change graph behavior.
     ******************************/
    instance.graph.LINK_STRENGTH = 1;
    instance.graph.FRICTION = 0.8;
    instance.graph.CHARGE = -1400;
    instance.graph.THETA = 0.8;
    instance.graph.GRAVITY = 0.0;

    /**
     *  Create the D3.js force layout for the graph query builder.
     */
    instance.graph.createForceLayout = function () {

        instance.graph.force = d3.layout.force()
            .size([instance.graph.getSVGWidth(), instance.graph.getSVGHeight()])
            .linkDistance(instance.provider.link.getDistance)
            .linkStrength(function (d) {
                if (d.linkStrength) {
                    return d.linkStrength;
                } else {
                    return instance.graph.LINK_STRENGTH;
                }
            })
            .friction(instance.graph.FRICTION)
            .charge(function (d) {
                if (d.charge) {
                    return d.charge;
                } else {
                    return instance.graph.CHARGE;
                }
            })
            .theta(instance.graph.THETA)
            .gravity(instance.graph.GRAVITY)
            .on("tick", instance.graph.tick); // Function called on every position update done by D3.js

        // Disable event propagation on drag to avoid zoom and pan issues
        instance.graph.force.drag()
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
    instance.graph.addRootNode = function (label) {
        if (instance.graph.force.nodes().length > 0) {
            instance.logger.warn("instance.graph.addRootNode is called but the graph is not empty.");
        }
        if (instance.provider.node.getSchema(label) !== undefined) {
            instance.graph.addSchema(instance.provider.node.getSchema(label));
        } else {

            var node = {
                "id": instance.graph.generateId(),
                "type": instance.graph.node.NodeTypes.ROOT,
                // x and y coordinates are set to the center of the SVG area.
                // These coordinate will never change at runtime except if the window is resized.
                "x": instance.graph.getSVGWidth() / 2,
                "y": instance.graph.getSVGHeight() / 2,
                "tx": instance.graph.getSVGWidth() / 2,
                "ty": instance.graph.getSVGHeight() / 2,
                "label": label,
                // The node is fixed to always remain in the center of the svg area.
                // This property should not be changed at runtime to avoid issues with the zoom and pan.
                "fixed": true,
                // Label used internally to identify the node.
                // This label is used for example as cypher query identifier.
                "internalLabel": instance.graph.node.generateInternalLabel(label),
                // List of relationships
                "relationships": [],
                "isAutoLoadValue": instance.provider.node.getIsAutoLoadValue(label) === true
            };

            instance.graph.force.nodes().push(node);
            instance.graph.notifyListeners(instance.graph.Events.NODE_ROOT_ADD, [node]);

            instance.graph.node.loadRelationshipData(node, function (relationships) {
                node.relationships = relationships;

                if (instance.provider.node.getIsAutoExpandRelations(label)) {

                    instance.graph.ignoreCount = true;
                    instance.graph.node.expandRelationships(node, function () {

                        instance.graph.ignoreCount = false;
                        instance.graph.hasGraphChanged = true;
                        instance.updateGraph();
                    })
                } else {
                    instance.graph.hasGraphChanged = true;
                    instance.updateGraph();
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
    instance.graph.addSchema = function (graphSchema) {
        if (instance.graph.force.nodes().length > 0) {
            instance.logger.warn("instance.graph.addSchema is called but the graph is not empty.");
        }

        var rootNodeSchema = graphSchema;

        var rootNode = {
            "id": instance.graph.generateId(),
            "type": instance.graph.node.NodeTypes.ROOT,
            // x and y coordinates are set to the center of the SVG area.
            // These coordinate will never change at runtime except if the window is resized.
            "x": instance.graph.getSVGWidth() / 2,
            "y": instance.graph.getSVGHeight() / 2,
            "tx": instance.graph.getSVGWidth() / 2,
            "ty": instance.graph.getSVGHeight() / 2,
            "label": rootNodeSchema.label,
            // The node is fixed to always remain in the center of the svg area.
            // This property should not be changed at runtime to avoid issues with the zoom and pan.
            "fixed": true,
            // Label used internally to identify the node.
            // This label is used for example as cypher query identifier.
            "internalLabel": instance.graph.node.generateInternalLabel(rootNodeSchema.label),
            // List of relationships
            "relationships": [],
            "isAutoLoadValue": instance.provider.node.getIsAutoLoadValue(rootNodeSchema.label) === true
        };

        instance.graph.force.nodes().push(rootNode);
        instance.graph.notifyListeners(instance.graph.Events.NODE_ROOT_ADD, [rootNode]);

        if (rootNodeSchema.hasOwnProperty("rel") && rootNodeSchema.rel.length > 0) {
            var directionAngle = (Math.PI / 2);

            rootNode.relationships = instance.graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(rootNodeSchema.rel).map(function (d) {
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
        //         instance.graph.addSchemaRelation(rootNodeSchema.rel[linkIndex], rootNode, linkIndex + 1, rootNodeSchema.rel.length);
        //     }
        // }
    };

    instance.graph.addSchemaRelation = function (relationSchema, parentNode, linkIndex, parentLinkTotalCount) {
        var targetNodeSchema = relationSchema.target;
        var target = instance.graph.addSchemaNode(targetNodeSchema, parentNode, linkIndex, parentLinkTotalCount, relationSchema.label);

        var newLink = {
            id: "l" + instance.graph.generateId(),
            source: parentNode,
            target: target,
            type: instance.graph.link.LinkTypes.RELATION,
            label: relationSchema.label,
            schema: relationSchema
        };

        instance.graph.force.links().push(
            newLink
        );
    };

    instance.graph.addSchemaNode = function (nodeSchema, parentNode, index, parentLinkTotalCount, parentRel) {
        var isGroupNode = instance.provider.node.getIsGroup(nodeSchema);
        var isCollapsed = nodeSchema.hasOwnProperty("collapsed") && nodeSchema.collapsed === true;

        var parentAngle = instance.graph.computeParentAngle(parentNode);

        var angleDeg;
        if (parentAngle) {
            angleDeg = (((360 / (parentLinkTotalCount + 1)) * index));
        } else {
            angleDeg = (((360 / (parentLinkTotalCount)) * index));
        }

        var nx = parentNode.x + (200 * Math.cos((angleDeg * (Math.PI / 180)) - parentAngle)),
            ny = parentNode.y + (200 * Math.sin((angleDeg * (Math.PI / 180)) - parentAngle));

        // TODO add force coordinate X X X
        // var tx = nx + ((instance.provider.link.getDistance(newLink)) * Math.cos(link.directionAngle - Math.PI / 2));
        // var ty = ny + ((instance.provider.link.getDistance(newLink)) * Math.sin(link.directionAngle - Math.PI / 2));

        var node = {
            "id": instance.graph.generateId(),
            "parent": parentNode,
            "parentRel": parentRel,
            "type": (isGroupNode) ? instance.graph.node.NodeTypes.GROUP : instance.graph.node.NodeTypes.CHOOSE,
            "label": nodeSchema.label,
            "fixed": false,
            "internalLabel": instance.graph.node.generateInternalLabel(nodeSchema.label),
            "x": nx,
            "y": ny,
            "schema": nodeSchema,
            "isAutoLoadValue": instance.provider.node.getIsAutoLoadValue(nodeSchema.label) === true,
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

            node.relationships = instance.graph.node.pie(relSegments).map(function (d) {
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
                        "id": instance.graph.generateId(),
                        "parent": node,
                        "attributes": value,
                        "type": instance.graph.node.NodeTypes.VALUE,
                        "label": node.label
                    }
                );
            });
        }

        instance.graph.force.nodes().push(node);

        if (!isCollapsed && nodeSchema.hasOwnProperty("rel")) {
            for (var linkIndex = 0; linkIndex < nodeSchema.rel.length; linkIndex++) {
                instance.graph.addSchemaRelation(nodeSchema.rel[linkIndex], node, linkIndex + 1, nodeSchema.rel.length);
            }
        }

        return node;
    };

    /**
     * Get the graph root node.
     * @returns {*}
     */
    instance.graph.getRootNode = function () {
        if (instance.graph.force !== undefined) {
            return instance.graph.force.nodes()[0];
        }
    };

    /**
     * Get the current schema of the graph.
     * @returns {{}}
     */
    instance.graph.getSchema = function () {

        function isLeaf(node) {
            var links = instance.graph.force.links();
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

        var rootNode = instance.graph.getRootNode();

        nodesMap[rootNode.id] = {
            label: rootNode.label
        };

        if (rootNode.hasOwnProperty("value")) {
            nodesMap[rootNode.id].value = [];
            rootNode.value.forEach(function (value) {
                nodesMap[rootNode.id].value.push(value.attributes)
            });
        }

        var links = instance.graph.force.links();
        if (links.length > 0) {
            links.forEach(function (link) {
                if (link.type === instance.graph.link.LinkTypes.RELATION) {
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
    instance.graph.tick = function (e) {
        var paths = instance.graph.svg.selectAll("#" + instance.graph.link.gID + " > g");

        // Update link paths
        paths.selectAll(".ppt-link")
            .attr("d", function (d) {
                var parentAngle = instance.graph.computeParentAngle(d.target);
                var sourceMargin = instance.provider.node.getSize(d.source);
                var targetMargin = instance.provider.node.getSize(d.target);

                if (!instance.graph.DISABLE_RELATION && d.source.hasOwnProperty("relationships") && d.source.relationships.length > 0) {
                    sourceMargin = instance.graph.node.getDonutOuterRadius(d.source);
                }

                if (!instance.graph.DISABLE_RELATION && d.target.hasOwnProperty("relationships") && d.target.relationships.length > 0) {
                    targetMargin = instance.graph.node.getDonutOuterRadius(d.target);
                }

                var targetX = d.target.x + ((targetMargin) * Math.cos(parentAngle)),
                    targetY = d.target.y - ((targetMargin) * Math.sin(parentAngle));

                var sourceX = d.source.x - ((sourceMargin) * Math.cos(parentAngle)),
                    sourceY = d.source.y + ((sourceMargin) * Math.sin(parentAngle));

                // Add an intermediate point in path center
                var middleX = (targetX + sourceX) / 2,
                    middleY = (targetY + sourceY) / 2;

                if (d.source.x <= d.target.x || instance.graph.ignoreMirroLinkLabels === true) {
                    return "M" + sourceX + " " + sourceY + "L" + middleX + " " + middleY + "L" + targetX + " " + targetY;
                } else {
                    return "M" + targetX + " " + targetY + "L" + middleX + " " + middleY + "L" + sourceX + " " + sourceY;
                }
            })
            .attr("marker-end", function (d) {
                if (instance.graph.link.SHOW_MARKER && d.source.x <= d.target.x) {
                    return "url(#arrow)";
                } else {
                    return null;
                }
            })
            .attr("marker-start", function (d) {
                if (instance.graph.link.SHOW_MARKER && d.source.x > d.target.x) {
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

        if (instance.graph.USE_DONUT_FORCE === true) {

            var k = .1 * e.alpha;

            // Push nodes toward their designated focus.
            instance.graph.force.nodes().forEach(function (n) {
                if (n.tx !== undefined && n.ty !== undefined) {
                    n.y += (n.ty - n.y) * k;
                    n.x += (n.tx - n.x) * k;
                }
            });
        }

        instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g")
            .attr("transform", function (d) {
                return "translate(" + (d.x) + "," + (d.y) + ")";
            });

        if (instance.graph.USE_VORONOI_LAYOUT === true) {

            var clip = d3.select("#voronoi-clip-path").selectAll('.voroclip')
                .data(instance.graph.recenterVoronoi(instance.graph.force.nodes()), function (d) {
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
    instance.graph.link = {};
    instance.graph.link.TEXT_DY = -4;

    /**
     * Define whether or not to display path markers.
     */
    instance.graph.link.SHOW_MARKER = false;

    // ID of the g element in SVG graph containing all the link elements.
    instance.graph.link.gID = "instance-glinks";

    /**
     * Defines the different type of link.
     * RELATION is a relation link between two nodes.
     * VALUE is a link between a generic node and a value.
     */
    instance.graph.link.LinkTypes = Object.freeze({RELATION: 0, VALUE: 1, SEGMENT: 2});

    /**
     * Function to call to update the links after modification in the model.
     * This function will update the graph with all removed, modified or added links using d3.js mechanisms.
     */
    instance.graph.link.updateLinks = function () {
        instance.graph.link.svgLinkElements = instance.graph.svg.select("#" + instance.graph.link.gID).selectAll("g");
        instance.graph.link.updateData();
        instance.graph.link.removeElements();
        instance.graph.link.addNewElements();
        instance.graph.link.updateElements();
    };

    /**
     * Update the links element with data coming from instance.graph.force.links().
     */
    instance.graph.link.updateData = function () {
        instance.graph.link.svgLinkElements = instance.graph.link.svgLinkElements.data(instance.graph.force.links(), function (d) {
            return d.id;
        });
    };

    /**
     * Clean links elements removed from the list.
     */
    instance.graph.link.removeElements = function () {
        instance.graph.link.svgLinkElements.exit().remove();
    };

    /**
     * Create new elements.
     */
    instance.graph.link.addNewElements = function () {

        var newLinkElements = instance.graph.link.svgLinkElements.enter().append("g")
            .attr("class", "ppt-glink")
            .on("click", instance.graph.link.clickLink)
            .on("mouseover", instance.graph.link.mouseOverLink)
            .on("mouseout", instance.graph.link.mouseOutLink);

        newLinkElements.append("path")
            .attr("class", "ppt-link");

        newLinkElements.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", instance.graph.link.TEXT_DY)
            .append("textPath")
            .attr("class", "ppt-textPath")
            .attr("startOffset", "50%");
    };

    /**
     * Update all the elements (new + modified)
     */
    instance.graph.link.updateElements = function () {
        instance.graph.link.svgLinkElements
            .attr("id", function (d) {
                return "ppt-glink_" + d.id;
            });

        instance.graph.link.svgLinkElements.selectAll(".ppt-link")
            .attr("id", function (d) {
                return "ppt-path_" + d.id
            })
            .attr("stroke", function (d) {
                return instance.provider.link.getColor(d, "path", "stroke");
            })
            .attr("class", function (link) {
                return "ppt-link " + instance.provider.link.getCSSClass(link, "path")
            });

        // Due to a bug on webkit browsers (as of 30/01/2014) textPath cannot be selected
        // To workaround this issue the selection is done with its associated css class
        instance.graph.link.svgLinkElements.selectAll("text")
            .attr("id", function (d) {
                return "ppt-text_" + d.id
            })
            .attr("class", function (link) {
                return instance.provider.link.getCSSClass(link, "text")
            })
            .attr("fill", function (d) {
                return instance.provider.link.getColor(d, "text", "fill");
            })
            .selectAll(".ppt-textPath")
            .attr("id", function (d) {
                return "ppt-textpath_" + d.id;
            })
            .attr("class", function (link) {
                return "ppt-textpath " + instance.provider.link.getCSSClass(link, "text-path")
            })
            .attr("xlink:href", function (d) {
                return "#ppt-path_" + d.id;
            })
            .text(function (d) {
                return instance.provider.link.getTextValue(d);
            });
    };

    /**
     * Function called when mouse is over the link.
     * This function is used to change the CSS class on hover of the link and query viewer element.
     *
     * TODO try to introduce event instead of directly access query spans here. This could be used in future extensions.
     */
    instance.graph.link.mouseOverLink = function () {
        d3.select(this)
            .select("path")
            .attr("class", function (link) {
                return "ppt-link " + instance.provider.link.getCSSClass(link, "path--hover")
            });

        d3.select(this).select("text")
            .attr("class", function (link) {
                return instance.provider.link.getCSSClass(link, "text--hover")
            });

        var hoveredLink = d3.select(this).data()[0];

        if (instance.queryviewer.isActive) {
            instance.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", true);
            instance.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", true);
        }

        if (instance.cypherviewer.isActive) {
            instance.cypherviewer.querySpanElements.filter(function (d) {
                return d.link === hoveredLink;
            }).classed("hover", true);
        }
    };

    /**
     * Function called when mouse goes out of the link.
     * This function is used to reinitialize the CSS class of the link and query viewer element.
     */
    instance.graph.link.mouseOutLink = function () {
        d3.select(this)
            .select("path")
            .attr("class", function (link) {
                return "ppt-link " + instance.provider.link.getCSSClass(link, "path")
            });

        d3.select(this).select("text")
            .attr("class", function (link) {
                return instance.provider.link.getCSSClass(link, "text")
            });

        var hoveredLink = d3.select(this).data()[0];

        if (instance.queryviewer.isActive) {
            instance.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", false);
            instance.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", false);
        }

        if (instance.cypherviewer.isActive) {
            instance.cypherviewer.querySpanElements.filter(function (d) {
                return d.link === hoveredLink;
            }).classed("hover", false);
        }
    };

    // Delete all related nodes from this link
    instance.graph.link.clickLink = function () {
        var clickedLink = d3.select(this).data()[0];

        if (clickedLink.type !== instance.graph.link.LinkTypes.VALUE) {
            // Collapse all expanded choose nodes first to avoid having invalid displayed value node if collapsed relation contains a value.
            instance.graph.node.collapseAllNode();

            var willChangeResults = instance.graph.node.removeNode(clickedLink.target);

            instance.graph.hasGraphChanged = true;
            instance.result.hasChanged = willChangeResults;
            instance.update();
        }

    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // NODES -----------------------------------------------------------------------------------------------------------

    instance.graph.node = {};

    // ID of the g element in SVG graph containing all the link elements.
    instance.graph.node.gID = "instance-gnodes";

    // Node ellipse size used by default for text nodes.
    instance.graph.node.DONUTS_MARGIN = 0;
    instance.graph.node.DONUT_WIDTH = 20;

    instance.graph.DISABLE_RELATION = false;

    instance.graph.node.TEXT_Y = 8;

    // Define the max number of character displayed in node.
    instance.graph.node.NODE_MAX_CHARS = 11;
    instance.graph.node.NODE_TITLE_MAX_CHARS = 100;

    // Number of nodes displayed per page during value selection.
    instance.graph.node.PAGE_SIZE = 10;

    // Define if the count should be displayed on nodes.
    instance.graph.DISABLE_COUNT = false;

    // Count box default size
    instance.graph.node.CountBox = {x: 16, y: 33, w: 52, h: 19};

    // Store choose node state to avoid multiple node expand at the same time
    instance.graph.node.chooseWaiting = false;

    instance.graph.node.getDonutInnerRadius = function (node) {
        return instance.provider.node.getSize(node) + instance.graph.node.DONUTS_MARGIN;
    };

    instance.graph.node.getDonutOuterRadius = function (node) {
        return instance.provider.node.getSize(node) + instance.graph.node.DONUTS_MARGIN + instance.graph.node.DONUT_WIDTH;
    };

    instance.graph.node.pie = d3.layout.pie()
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
    instance.graph.node.NodeTypes = Object.freeze({ROOT: 0, CHOOSE: 1, VALUE: 2, GROUP: 3});

    // Used to generate unique internal labels used for example as identifier in Cypher query.
    instance.graph.node.internalLabels = {};

    /**
     * Create a normalized identifier from a node label.
     * Multiple calls with the same node label will generate different unique identifier.
     *
     * @param nodeLabel
     * @returns {string}
     */
    instance.graph.node.generateInternalLabel = function (nodeLabel) {
        var label = nodeLabel ? nodeLabel.toLowerCase().replace(/ /g, '') : "n";

        if (label in instance.graph.node.internalLabels) {
            instance.graph.node.internalLabels[label] = instance.graph.node.internalLabels[label] + 1;
        } else {
            instance.graph.node.internalLabels[label] = 0;
            return label;
        }

        return label + instance.graph.node.internalLabels[label];
    };

    /**
     * Update Nodes SVG elements using D3.js update mechanisms.
     */
    instance.graph.node.updateNodes = function () {
        if (!instance.graph.node.svgNodeElements) {
            instance.graph.node.svgNodeElements = instance.graph.svg.select("#" + instance.graph.node.gID).selectAll("g");
        }
        instance.graph.node.updateData();
        instance.graph.node.removeElements();
        instance.graph.node.addNewElements();
        instance.graph.node.updateElements();
    };

    /**
     * Update node data with changes done in instance.graph.force.nodes() model.
     */
    instance.graph.node.updateData = function () {
        instance.graph.node.svgNodeElements = instance.graph.node.svgNodeElements.data(instance.graph.force.nodes(), function (d) {
            return d.id;
        });

        if (instance.graph.hasGraphChanged) {
            instance.graph.node.updateAutoLoadValues();

            if (!instance.graph.DISABLE_COUNT && !instance.graph.ignoreCount) {
                instance.graph.node.updateCount();
            }
        }
        instance.graph.hasGraphChanged = false;
    };

    /**
     * Update nodes and result counts by executing a query for every nodes with the new graph structure.
     */
    instance.graph.node.updateCount = function () {

        // Abort any old running request before starting a new one
        if (instance.graph.node.updateCountXhr !== undefined) {
            instance.graph.node.updateCountXhr.abort();
        }

        var statements = [];

        var countedNodes = instance.graph.force.nodes()
            .filter(function (d) {
                return d.type !== instance.graph.node.NodeTypes.VALUE && d.type !== instance.graph.node.NodeTypes.GROUP && (!d.hasOwnProperty("isNegative") || !d.isNegative);
            });

        countedNodes.forEach(function (node) {
            var query = instance.query.generateNodeCountQuery(node);
            statements.push(
                {
                    "statement": query.statement,
                    "parameters": query.parameters
                }
            );
        });

        instance.logger.info("Count nodes ==>");
        instance.graph.node.updateCountXhr = instance.rest.post(
            {
                "statements": statements
            })
            .done(function (response) {
                instance.logger.info("<== Count nodes");
                var parsedData = instance.rest.response.parse(response);

                // TODO throw exception in parser in case of failure?
                // if (parsedData.status === "success") {
                //     instance.logger.error("Cypher query error:" + JSON.stringify(parsedData.errors));
                //     countedNodes.forEach(function (node) {
                //         node.count = 0;
                //     });
                // }

                for (var i = 0; i < countedNodes.length; i++) {
                    countedNodes[i].count = parsedData[i][0].count;
                }

                // Update result count with root node new count
                if (instance.result.resultCountListeners.length > 0) {
                    instance.result.updateResultsCount();
                }

                instance.graph.node.updateElements();
                instance.graph.link.updateElements();
            })
            .fail(function (xhr, textStatus, errorThrown) {
                if (textStatus !== "abort") {
                    instance.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + instance.rest.CYPHER_URL + "\" defined in \"instance.rest.CYPHER_URL\" property: " + errorThrown);
                    countedNodes.forEach(function (node) {
                        node.count = 0;
                    });
                    instance.graph.node.updateElements();
                    instance.graph.link.updateElements();
                } else {
                    instance.logger.info("<=X= Count nodes - Aborted!");
                }
            });
    };

    /**
     * Update values for nodes having preloadData property
     */
    instance.graph.node.updateAutoLoadValues = function () {
        var statements = [];

        var nodesToLoadData = instance.graph.node.getAutoLoadValueNodes();

        for (var i = 0; i < nodesToLoadData.length; i++) {
            var nodeToQuery = nodesToLoadData[i];
            var query = instance.query.generateNodeValueQuery(nodeToQuery);
            statements.push(
                {
                    "statement": query.statement,
                    "parameters": query.parameters
                }
            );
        }

        if (statements.length > 0) {
            instance.logger.info("AutoLoadValue ==>");
            instance.rest.post(
                {
                    "statements": statements
                })
                .done(function (response) {
                    instance.logger.info("<== AutoLoadValue");

                    var parsedData = instance.rest.response.parse(response);

                    for (var i = 0; i < nodesToLoadData.length; i++) {
                        var nodeToQuery = nodesToLoadData[i];
                        var constraintAttr = instance.provider.node.getConstraintAttribute(nodeToQuery.label);
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

                    instance.graph.notifyListeners(instance.graph.Events.GRAPH_NODE_DATA_LOADED, [nodesToLoadData]);
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    instance.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + instance.rest.CYPHER_URL + "\" defined in \"instance.rest.CYPHER_URL\" property: " + errorThrown);
                });
        }
    };

    /**
     * Remove old elements.
     * Should be called after updateData.
     */
    instance.graph.node.removeElements = function () {
        var toRemove = instance.graph.node.svgNodeElements.exit();

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
    instance.graph.node.addNewElements = function () {
        var gNewNodeElements = instance.graph.node.svgNodeElements.enter()
            .append("g")
            .attr("class", "ppt-gnode")
            .on("click", instance.graph.node.nodeClick)
            .on("mouseover", instance.graph.node.mouseOverNode)
            // .on("mousemove", instance.graph.node.mouseMoveNode)
            .on("mouseout", instance.graph.node.mouseOutNode);

        // Add right click on all nodes except value
        gNewNodeElements.filter(function (d) {
            return d.type !== instance.graph.node.NodeTypes.VALUE;
        }).on("contextmenu", instance.graph.node.clearSelection);

        // Disable right click context menu on value nodes
        gNewNodeElements.filter(function (d) {
            return d.type === instance.graph.node.NodeTypes.VALUE;
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
        instance.graph.node.addBackgroundElements(gNewNodeElements);
        instance.graph.node.addMiddlegroundElements(gNewNodeElements);
        instance.graph.node.addForegroundElements(gNewNodeElements);
    };

    /**
     * Create the background for a new node element.
     * The background of a node is defined by a circle not visible by default (fill-opacity set to 0) but can be used to highlight a node with animation on this attribute.
     * This circle also define the node zone that can receive events like mouse clicks.
     *
     * @param gNewNodeElements
     */
    instance.graph.node.addBackgroundElements = function (gNewNodeElements) {
        var background = gNewNodeElements
            .append("g")
            .attr("class", "ppt-g-node-background")
            .classed("hide", instance.graph.DISABLE_RELATION);

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
    instance.graph.node.addMiddlegroundElements = function (gNewNodeElements) {
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
    instance.graph.node.addForegroundElements = function (gNewNodeElements) {
        var foreground = gNewNodeElements
            .append("g")
            .attr("class", "ppt-g-node-foreground");

        // Arrows icons added only for root and choose nodes
        var gArrow = foreground.filter(function (d) {
            return d.type === instance.graph.node.NodeTypes.ROOT || d.type === instance.graph.node.NodeTypes.CHOOSE;
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
                instance.graph.node.collapseNode(clickedNode);
                instance.graph.node.expandNode(clickedNode);
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

            if (clickedNode.page * instance.graph.node.PAGE_SIZE < clickedNode.count) {
                clickedNode.page++;
                instance.graph.node.collapseNode(clickedNode);
                instance.graph.node.expandNode(clickedNode);
            }
        });

        // Count box
        if (!instance.graph.DISABLE_COUNT) {
            var countForeground = foreground.filter(function (d) {
                return d.type !== instance.graph.node.NodeTypes.GROUP;
            });

            countForeground
                .append("rect")
                .attr("x", instance.graph.node.CountBox.x)
                .attr("y", instance.graph.node.CountBox.y)
                .attr("width", instance.graph.node.CountBox.w)
                .attr("height", instance.graph.node.CountBox.h)
                .attr("class", "ppt-count-box");

            countForeground
                .append("text")
                .attr("x", 42)
                .attr("y", 48)
                .attr("text-anchor", "middle")
                .attr("class", "ppt-count-text");
        }

        var ban = foreground.filter(function (d) {
            return d.type === instance.graph.node.NodeTypes.CHOOSE;
        }).append("g")
            .attr("class", "ppt-g-node-ban")
            .append("path")
            .attr("d", "M89.1 19.2C88 17.7 86.6 16.2 85.2 14.8 83.8 13.4 82.3 12 80.8 10.9 72 3.9 61.3 0 50 0 36.7 0 24.2 5.4 14.8 14.8 5.4 24.2 0 36.7 0 50c0 11.4 3.9 22.1 10.9 30.8 1.2 1.5 2.5 3 3.9 4.4 1.4 1.4 2.9 2.7 4.4 3.9C27.9 96.1 38.6 100 50 100 63.3 100 75.8 94.6 85.2 85.2 94.6 75.8 100 63.3 100 50 100 38.7 96.1 28 89.1 19.2ZM11.9 50c0-10.2 4-19.7 11.1-27C30.3 15.9 39.8 11.9 50 11.9c8.2 0 16 2.6 22.4 7.3L19.3 72.4C14.5 66 11.9 58.2 11.9 50Zm65 27c-7.2 7.1-16.8 11.1-27 11.1-8.2 0-16-2.6-22.4-7.4L80.8 27.6C85.5 34 88.1 41.8 88.1 50c0 10.2-4 19.7-11.1 27z");
    };

    /**
     * Updates all elements.
     */
    instance.graph.node.updateElements = function () {
        instance.graph.node.svgNodeElements.attr("id", function (d) {
            return "instance-gnode_" + d.id;
        });

        if (instance.graph.USE_VORONOI_LAYOUT) {
            instance.graph.node.svgNodeElements.attr("clip-path", function (d) {
                return "url(#voroclip-" + d.id + ")";
            });
        }

        instance.graph.node.svgNodeElements.select("defs")
            .select("clipPath")
            .attr("id", function (node) {
                return "node-view" + node.id;
            }).selectAll("circle")
            .attr("r", function (node) {
                return instance.provider.node.getSize(node);
            });

        // Display voronoi paths
        // instance.graph.node.svgNodeElements.selectAll(".gra").data(["unique"]).enter().append("g").attr("class", "gra").append("use");
        // instance.graph.node.svgNodeElements.selectAll("use").attr("xlink:href",function(d){
        //     console.log("#pvoroclip-"+d3.select(this.parentNode.parentNode).datum().id);
        //     return "#pvoroclip-"+d3.select(this.parentNode.parentNode).datum().id;
        // }).attr("fill","none").attr("stroke","red").attr("stroke-width","1px");

        instance.graph.node.svgNodeElements.filter(function (n) {
            return n.type !== instance.graph.node.NodeTypes.ROOT
        }).call(instance.graph.force.drag);

        instance.graph.node.updateBackgroundElements();
        instance.graph.node.updateMiddlegroundElements();
        instance.graph.node.updateForegroundElements();
    };

    instance.graph.node.updateBackgroundElements = function () {
        // RELATIONSHIPS
        instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-background").select(".ppt-donut-labels").selectAll("*").remove();
        instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-background").select(".ppt-donut-segments").selectAll("*").remove();

        var gSegment = instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-background").select(".ppt-donut-segments").selectAll(".ppt-segment-container")
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
            .on("click", instance.graph.node.segmentClick)
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

        var gLabel = instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-background").select(".ppt-donut-labels").selectAll(".ppt-segment-container")
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
            .on("click", instance.graph.node.segmentClick)
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
                    .innerRadius(instance.graph.node.getDonutInnerRadius(node))
                    .outerRadius(instance.graph.node.getDonutOuterRadius(node))(intermediateArc);

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

                return instance.provider.link.getColor({
                    label: d.label,
                    type: instance.graph.link.LinkTypes.SEGMENT,
                    source: node,
                    target: {label: d.target}
                }, "segment", "fill");
            })
            .attr("dy", instance.graph.link.TEXT_DY)
            .append("textPath")
            .attr("startOffset", "50%")
            .attr("xlink:href", function (d, i) {
                var node = d3.select(this.parentNode.parentNode.parentNode).datum();
                return "#arc_" + node.id + "_" + i;
            })
            .text(function (d) {
                var node = d3.select(this.parentNode.parentNode.parentNode).datum();

                return instance.provider.link.getTextValue({
                    source: node,
                    target: {label: d.target},
                    label: d.label,
                    type: instance.graph.link.LinkTypes.SEGMENT
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
                    .innerRadius(instance.graph.node.getDonutInnerRadius(node))
                    .outerRadius(instance.graph.node.getDonutOuterRadius(node))(d)
            })
            .attr("fill", function (d) {
                var node = d3.select(this.parentNode.parentNode).datum();
                return instance.provider.link.getColor({
                    label: d.label,
                    type: instance.graph.link.LinkTypes.RELATION,
                    source: node,
                    target: {label: d.target}
                }, "path", "fill");
            })
            .attr("stroke", function (d) {
                var node = d3.select(this.parentNode.parentNode).datum();

                return instance.provider.link.getColor({
                    label: d.label,
                    type: instance.graph.link.LinkTypes.RELATION,
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
    instance.graph.node.updateMiddlegroundElements = function () {
        var middleG = instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-middleground");

        middleG.attr("clip-path", function (node) {
            return "url(#node-view" + node.id + ")";
        });

        // Clear all content in case node type has changed
        middleG.selectAll("*").remove();


        instance.graph.node.updateMiddlegroundElementsTooltip(middleG);

        instance.graph.node.updateMiddlegroundElementsText(middleG.filter(function (d) {
            return instance.provider.node.getNodeDisplayType(d) === instance.provider.node.DisplayTypes.TEXT;
        }));

        instance.graph.node.updateMiddlegroundElementsImage(middleG.filter(function (d) {
            return instance.provider.node.getNodeDisplayType(d) === instance.provider.node.DisplayTypes.IMAGE;
        }));

        instance.graph.node.updateMiddlegroundElementsSymbol(middleG.filter(function (d) {
            return instance.provider.node.getNodeDisplayType(d) === instance.provider.node.DisplayTypes.SYMBOL;
        }));

        instance.graph.node.updateMiddlegroundElementsSVG(middleG.filter(function (d) {
            return instance.provider.node.getNodeDisplayType(d) === instance.provider.node.DisplayTypes.SVG;
        }));

        instance.graph.node.updateMiddlegroundElementsDisplayedText(middleG.filter(function (d) {
            return instance.provider.node.isTextDisplayed(d);
        }));

    };

    instance.graph.node.updateMiddlegroundElementsTooltip = function (middleG) {
        // Most browser will generate a tooltip if a title is specified for the SVG element
        // TODO Introduce an SVG tooltip instead?
        middleG.append("title")
            .attr("class", function (node) {
                return instance.provider.node.getCSSClass(node, "title")
            })
            .text(function (d) {
                return instance.provider.node.getTextValue(d, instance.graph.node.NODE_TITLE_MAX_CHARS);
            });

    };

    instance.graph.node.updateMiddlegroundElementsText = function (gMiddlegroundTextNodes) {
        var circle = gMiddlegroundTextNodes.append("circle").attr("r", function (node) {
            return instance.provider.node.getSize(node);
        });

        // Set class according to node type
        circle
            .attr("class", function (node) {
                return instance.provider.node.getCSSClass(node, "circle")
            })
            .attr("fill", function (node) {
                return instance.provider.node.getColor(node, "circle", "fill");
            })
            .attr("stroke", function (node) {
                return instance.provider.node.getColor(node, "circle", "stroke");
            });
    };

    instance.graph.node.updateMiddlegroundElementsImage = function (gMiddlegroundImageNodes) {
        gMiddlegroundImageNodes.append("circle").attr("r", function (node) {
            return instance.provider.node.getSize(node);
        })
            .attr("class", function (node) {
                return instance.provider.node.getCSSClass(node, "image-background-circle")
            });

        gMiddlegroundImageNodes.append("image")
            .attr("class", function (node) {
                return instance.provider.node.getCSSClass(node, "image")
            })
            .attr("width", function (d) {
                return instance.provider.node.getImageWidth(d);
            })
            .attr("height", function (d) {
                return instance.provider.node.getImageHeight(d);
            })
            // Center the image on node
            .attr("transform", function (d) {
                return "translate(" + (-instance.provider.node.getImageWidth(d) / 2) + "," + (-instance.provider.node.getImageHeight(d) / 2) + ")";
            })
            .attr("xlink:href", function (d) {
                return instance.provider.node.getImagePath(d);
            });
    };

    instance.graph.node.updateMiddlegroundElementsSymbol = function (gMiddlegroundSymbolNodes) {
        gMiddlegroundSymbolNodes.append("circle").attr("r", function (node) {
            return instance.provider.node.getSize(node);
        })
            .attr("class", function (node) {
                return instance.provider.node.getCSSClass(node, "symbol-background-circle")
            })
            .attr("fill", function (node) {
                return instance.provider.node.getColor(node, "circle", "fill");
            })
            .attr("stroke", function (node) {
                return instance.provider.node.getColor(node, "circle", "stroke");
            });

        gMiddlegroundSymbolNodes.append("use")
            .attr("class", function (node) {
                return instance.provider.node.getCSSClass(node, "symbol")
            })
            .attr("width", function (d) {
                return instance.provider.node.getImageWidth(d);
            })
            .attr("height", function (d) {
                return instance.provider.node.getImageHeight(d);
            })
            // Center the image on node
            .attr("transform", function (d) {
                return "translate(" + (-instance.provider.node.getImageWidth(d) / 2) + "," + (-instance.provider.node.getImageHeight(d) / 2) + ")";
            })
            .attr("xlink:href", function (d) {
                return instance.provider.node.getImagePath(d);
            })
            .attr("fill", function (node) {
                return instance.provider.node.getColor(node, "circle", "fill");
            })
            .attr("stroke", function (node) {
                return instance.provider.node.getColor(node, "circle", "stroke");
            });
    };

    instance.graph.node.updateMiddlegroundElementsSVG = function (gMiddlegroundSVGNodes) {
        var SVGmiddleG = gMiddlegroundSVGNodes.append("g");

        var circle = SVGmiddleG.append("circle").attr("r", function (node) {
            return instance.provider.node.getSize(node);
        }).attr("class", "ppt-svg-node-background");

        var svgMiddlePaths = SVGmiddleG.selectAll("path").data(function (d) {
            return instance.provider.node.getSVGPaths(d);
        });

        // Update nested data elements
        svgMiddlePaths.exit().remove();
        svgMiddlePaths.enter().append("path");

        SVGmiddleG
            .selectAll("path")
            .attr("class", function (d) {
                var node = d3.select(this.parentNode).datum();
                return instance.provider.node.getCSSClass(node, "path")
            })
            .each(function (d, i) {
                for (var prop in d) {
                    if (d.hasOwnProperty(prop)) {
                        d3.select(this).attr(prop, d[prop]);
                    }
                }
            })
    };

    instance.graph.node.updateMiddlegroundElementsDisplayedText = function (middleG) {
        var textDispalyed = middleG.filter(function (d) {
            return instance.provider.node.isTextDisplayed(d);
        });

        var backRects =
            textDispalyed
                .append("rect")
                .attr("fill", function (node) {
                    return instance.provider.node.getColor(node, "back-text", "fill");
                })
                .attr("class", function (node) {
                    return instance.provider.node.getCSSClass(node, "back-text")
                });

        var textMiddle = textDispalyed.append('text')
            .attr('x', 0)
            .attr('y', instance.graph.node.TEXT_Y)
            .attr('text-anchor', 'middle');
        textMiddle
            .attr('y', instance.graph.node.TEXT_Y)
            .attr("class", function (node) {
                return instance.provider.node.getCSSClass(node, "text")
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
                if (instance.provider.node.isTextDisplayed(d)) {
                    return instance.provider.node.getTextValue(d);
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
    instance.graph.node.updateForegroundElements = function () {

        // Updates browse arrows status
        var gArrows = instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground")
            .selectAll(".ppt-node-foreground-g-arrows");
        gArrows.classed("active", function (d) {
            return d.valueExpanded && d.data && d.data.length > instance.graph.node.PAGE_SIZE;
        });

        gArrows.selectAll(".ppt-larrow").classed("enabled", function (d) {
            return d.page > 1;
        });

        gArrows.selectAll(".ppt-rarrow").classed("enabled", function (d) {
            if (d.data) {
                var count = d.data.length;
                return d.page * instance.graph.node.PAGE_SIZE < count;
            } else {
                return false;
            }
        });

        // Update count box class depending on node type
        var gForegrounds = instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground");

        gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
            return d.type !== instance.graph.node.NodeTypes.CHOOSE;
        }).classed("root", true);

        gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
            return d.type === instance.graph.node.NodeTypes.CHOOSE;
        }).classed("value", true);

        gForegrounds.selectAll(".ppt-count-box").classed("disabled", function (d) {
            return d.count === 0;
        });

        if (!instance.graph.DISABLE_COUNT) {
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

        instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground").filter(function (node) {
            return node.isNegative === true;
        }).selectAll(".ppt-g-node-ban")
            .attr("transform", function (d) {
                return "translate(" + (-instance.provider.node.getSize(d)) + "," + (-instance.provider.node.getSize(d)) + ") " +
                    "scale(" + ((instance.provider.node.getSize(d) * 2) / 100) + ")"; // 100 is the size of the image drawn with the path
            })
            .attr("stroke-width", function (d) {
                return (2 / ((instance.provider.node.getSize(d) * 2) / 100)) + "px";
            });


        instance.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground").selectAll(".ppt-g-node-ban")
            .classed("active", function (node) {
                return node.isNegative === true;
            });
    };

    instance.graph.node.segmentClick = function (d) {
        d3.event.preventDefault();

        var node = d3.select(this.parentNode.parentNode).datum();

        instance.graph.ignoreCount = true;

        instance.graph.addRelationshipData(node, d, function () {
            instance.graph.ignoreCount = false;
            instance.graph.hasGraphChanged = true;
            instance.updateGraph();
        });
    };

    /**
     * Handle the mouse over event on nodes.
     */
    instance.graph.node.mouseOverNode = function () {
        d3.event.preventDefault();

        // TODO don't work on IE (nodes unstable) find another way to move node in foreground on mouse over?
        // d3.select(this).moveToFront();

        // instance.tootip.div.style("display", "inline");

        var hoveredNode = d3.select(this).data()[0];

        if (instance.queryviewer.isActive) {
            // Hover the node in query
            instance.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", true);
            instance.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", true);
        }

        if (instance.cypherviewer.isActive) {
            instance.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredNode;
            }).classed("hover", true);
        }
    };

    // instance.graph.node.mouseMoveNode = function () {
    //     d3.event.preventDefault();
    //
    //     var hoveredNode = d3.select(this).data()[0];
    //
    //     instance.tootip.div
    //         .text(instance.provider.node.getTextValue(hoveredNode, instance.graph.node.NODE_TITLE_MAX_CHARS))
    //         .style("left", (d3.event.pageX - 34) + "px")
    //         .style("top", (d3.event.pageY - 12) + "px");
    // };

    /**
     * Handle mouse out event on nodes.
     */
    instance.graph.node.mouseOutNode = function () {
        d3.event.preventDefault();

        // instance.tootip.div.style("display", "none");

        var hoveredNode = d3.select(this).data()[0];

        if (instance.queryviewer.isActive) {
            // Remove hover class on node.
            instance.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", false);
            instance.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", false);
        }

        if (instance.cypherviewer.isActive) {
            instance.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredNode;
            }).classed("hover", false);
        }
    };

    /**
     * Handle the click event on nodes.
     */
    instance.graph.node.nodeClick = function () {
        if (!d3.event.defaultPrevented) { // To avoid click on drag end
            var clickedNode = d3.select(this).data()[0]; // Clicked node data
            instance.logger.debug("nodeClick (" + clickedNode.label + ")");

            if (clickedNode.type === instance.graph.node.NodeTypes.VALUE) {
                instance.graph.node.valueNodeClick(clickedNode);
            } else if (clickedNode.type === instance.graph.node.NodeTypes.CHOOSE || clickedNode.type === instance.graph.node.NodeTypes.ROOT) {
                if (d3.event.ctrlKey) {
                    if (clickedNode.type === instance.graph.node.NodeTypes.CHOOSE) {
                        clickedNode.isNegative = !clickedNode.hasOwnProperty("isNegative") || !clickedNode.isNegative;

                        instance.graph.node.collapseAllNode();

                        if (clickedNode.hasOwnProperty("value") && clickedNode.value.length > 0) {

                        } else {

                            if (clickedNode.isNegative) {
                                // Remove all related nodes
                                for (var i = instance.graph.force.links().length - 1; i >= 0; i--) {
                                    if (instance.graph.force.links()[i].source === clickedNode) {
                                        instance.graph.node.removeNode(instance.graph.force.links()[i].target);
                                    }
                                }

                                clickedNode.count = 0;
                            }
                        }

                        instance.result.hasChanged = true;
                        instance.graph.hasGraphChanged = true;
                        instance.update();
                    } // negation not supported on root node
                } else {
                    if (clickedNode.valueExpanded) {
                        instance.graph.node.collapseNode(clickedNode);
                    } else {
                        instance.graph.node.chooseNodeClick(clickedNode);
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
    instance.graph.node.collapseNode = function (clickedNode) {
        if (clickedNode.valueExpanded) { // node is collapsed only if it has been expanded first
            instance.logger.debug("collapseNode (" + clickedNode.label + ")");

            instance.graph.notifyListeners(instance.graph.Events.GRAPH_NODE_VALUE_COLLAPSE, [clickedNode]);

            var linksToRemove = instance.graph.force.links().filter(function (l) {
                return l.source === clickedNode && l.type === instance.graph.link.LinkTypes.VALUE;
            });

            // Remove children nodes from model
            linksToRemove.forEach(function (l) {
                instance.graph.force.nodes().splice(instance.graph.force.nodes().indexOf(l.target), 1);
            });

            // Remove links from model
            for (var i = instance.graph.force.links().length - 1; i >= 0; i--) {
                if (linksToRemove.indexOf(instance.graph.force.links()[i]) >= 0) {
                    instance.graph.force.links().splice(i, 1);
                }
            }

            // Node has been fixed when expanded so we unfix it back here.
            if (clickedNode.type !== instance.graph.node.NodeTypes.ROOT) {
                clickedNode.fixed = false;
            }

            // Parent node too if not root
            if (clickedNode.parent && clickedNode.parent.type !== instance.graph.node.NodeTypes.ROOT) {
                clickedNode.parent.fixed = false;
            }

            clickedNode.valueExpanded = false;
            instance.update();

        } else {
            instance.logger.debug("collapseNode called on an unexpanded node");
        }
    };

    /**
     * Collapse all nodes with value expanded.
     *
     */
    instance.graph.node.collapseAllNode = function () {
        instance.graph.force.nodes().forEach(function (n) {
            if ((n.type === instance.graph.node.NodeTypes.CHOOSE || n.type === instance.graph.node.NodeTypes.ROOT) && n.valueExpanded) {
                instance.graph.node.collapseNode(n);
            }
        });
    };

    /**
     * Function called on a value node click.
     * In this case the value is added in the parent node and all the value nodes are collapsed.
     *
     * @param clickedNode
     */
    instance.graph.node.valueNodeClick = function (clickedNode) {
        instance.logger.debug("valueNodeClick (" + clickedNode.label + ")");

        instance.graph.notifyListeners(instance.graph.Events.GRAPH_NODE_ADD_VALUE, [clickedNode]);

        if (clickedNode.parent.value === undefined) {
            clickedNode.parent.value = [];
        }
        clickedNode.parent.value.push(clickedNode);
        instance.result.hasChanged = true;
        instance.graph.hasGraphChanged = true;

        instance.graph.node.collapseNode(clickedNode.parent);
    };

    /**
     * Function called on choose node click.
     * In this case a query is executed to get all the possible value
     * @param clickedNode
     * TODO optimize with cached data?
     */
    instance.graph.node.chooseNodeClick = function (clickedNode) {
        instance.logger.debug("chooseNodeClick (" + clickedNode.label + ") with waiting state set to " + instance.graph.node.chooseWaiting);
        if (!instance.graph.node.chooseWaiting && !clickedNode.immutable && !(clickedNode.count === 0)) {

            // Collapse all expanded nodes first
            instance.graph.node.collapseAllNode();

            // Set waiting state to true to avoid multiple call on slow query execution
            instance.graph.node.chooseWaiting = true;

            // Don't run query to get value if node isAutoLoadValue is set to true
            if (clickedNode.data !== undefined && clickedNode.isAutoLoadValue) {
                clickedNode.page = 1;
                instance.graph.node.expandNode(clickedNode);
                instance.graph.node.chooseWaiting = false;
            } else {
                instance.logger.info("Values (" + clickedNode.label + ") ==>");
                var query = instance.query.generateNodeValueQuery(clickedNode);
                instance.rest.post(
                    {
                        "statements": [
                            {
                                "statement": query.statement,
                                "parameters": query.parameters
                            }]
                    })
                    .done(function (response) {
                        instance.logger.info("<== Values (" + clickedNode.label + ")");
                        var parsedData = instance.rest.response.parse(response);
                        var constraintAttr = instance.provider.node.getConstraintAttribute(clickedNode.label);

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
                        instance.graph.node.expandNode(clickedNode);
                        instance.graph.node.chooseWaiting = false;
                    })
                    .fail(function (xhr, textStatus, errorThrown) {
                        instance.graph.node.chooseWaiting = false;
                        instance.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + instance.rest.CYPHER_URL + "\" defined in \"instance.rest.CYPHER_URL\" property: " + errorThrown);
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
    instance.graph.node.addExpandedValue = function (attribute, value) {

        var isAnyChangeDone = false;

        // For each expanded nodes
        for (var i = instance.graph.force.nodes().length - 1; i >= 0; i--) {
            if (instance.graph.force.nodes()[i].valueExpanded) {

                // Look in node data if value can be found in reverse order to be able to remove value without effect on iteration index
                for (var j = instance.graph.force.nodes()[i].data.length - 1; j >= 0; j--) {
                    if (instance.graph.force.nodes()[i].data[j][attribute] === value) {
                        isAnyChangeDone = true;

                        // Create field value if needed
                        if (!instance.graph.force.nodes()[i].hasOwnProperty("value")) {
                            instance.graph.force.nodes()[i].value = [];
                        }

                        // Add value
                        instance.graph.force.nodes()[i].value.push({
                            attributes: instance.graph.force.nodes()[i].data[j]
                        });

                        // Remove data added in value
                        instance.graph.force.nodes()[i].data.splice(j, 1);
                    }
                }

                // Refresh node
                instance.graph.node.collapseNode(instance.graph.force.nodes()[i]);
                instance.graph.node.expandNode(instance.graph.force.nodes()[i]);
            }
        }

        if (isAnyChangeDone) {
            instance.result.hasChanged = true;
            instance.graph.hasGraphChanged = true;
            instance.update();
        }
    };

    /**
     * Get all nodes that contains a value.
     *
     * @param label If set return only node of this label.
     * @return {Array} Array of nodes containing at least one value.
     */
    instance.graph.node.getContainingValue = function (label) {
        var nodesWithValue = [];
        var links = instance.graph.force.links(), nodes = instance.graph.force.nodes();

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
                if (l.type === instance.graph.link.LinkTypes.RELATION && targetNode.value !== undefined && targetNode.value.length > 0) {
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
    instance.graph.node.addValueForLabel = function (label, value) {

        var isAnyChangeDone = false;

        // Find choose node with label
        for (var i = instance.graph.force.nodes().length - 1; i >= 0; i--) {
            if (instance.graph.force.nodes()[i].type === instance.graph.node.NodeTypes.CHOOSE && instance.graph.force.nodes()[i].label === label) {

                // Create field value if needed
                if (!instance.graph.force.nodes()[i].hasOwnProperty("value")) {
                    instance.graph.force.nodes()[i].value = [];
                }

                // check if value already exists
                var isValueFound = false;
                var constraintAttr = instance.provider.node.getConstraintAttribute(label);
                instance.graph.force.nodes()[i].value.forEach(function (val) {
                    if (val.attributes.hasOwnProperty(constraintAttr) && val.attributes[constraintAttr] === value.attributes[constraintAttr]) {
                        isValueFound = true;
                    }
                });

                if (!isValueFound) {
                    // Add value
                    instance.graph.force.nodes()[i].value.push(value);
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
    instance.graph.node.addValue = function (nodeIds, displayAttributeValue) {

        var isAnyChangeDone = false;

        // Find choose node with label
        for (var i = 0; i < instance.graph.force.nodes().length; i++) {
            var node = instance.graph.force.nodes()[i];
            if (nodeIds.indexOf(node.id) >= 0) {

                // Create field value in node if needed
                if (!node.hasOwnProperty("value")) {
                    node.value = [];
                }

                var displayAttr = instance.provider.node.getReturnAttributes(node.label)[0];

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
            instance.result.hasChanged = true;
            instance.graph.hasGraphChanged = true;
            instance.update();
        }
    };

    /**
     * Remove a value from a node.
     * If the value is not found nothing is done.
     *
     * @param node
     * @param value
     */
    instance.graph.node.removeValue = function (node, value) {
        var isAnyChangeDone = false;

        // Remove values having same constraintAttributeValue
        for (var j = node.value.length - 1; j >= 0; j--) {
            if (node.value[j] === value) {
                instance.graph.node.collapseNode(node);
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
    instance.graph.node.getValue = function (nodeId, constraintAttributeValue) {
        for (var i = 0; i < instance.graph.force.nodes().length; i++) {
            var node = instance.graph.force.nodes()[i];

            if (node.id === nodeId) {
                var constraintAttribute = instance.provider.node.getConstraintAttribute(node.label);

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
    instance.graph.node.removeExpandedValue = function (attribute, value) {

        var isAnyChangeDone = false;

        // For each expanded nodes in reverse order as some values can be removed
        for (var i = instance.graph.force.nodes().length - 1; i >= 0; i--) {
            if (instance.graph.force.nodes()[i].valueExpanded) {

                var removedValues = [];

                // Remove values
                for (var j = instance.graph.force.nodes()[i].value.length - 1; j >= 0; j--) {
                    if (instance.graph.force.nodes()[i].value[j].attributes[attribute] === value) {
                        isAnyChangeDone = true;

                        removedValues = removedValues.concat(instance.graph.force.nodes()[i].value.splice(j, 1));
                    }
                }

                //And add them back in data
                for (var k = 0; k < removedValues.length; k++) {
                    instance.graph.force.nodes()[i].data.push(removedValues[k].attributes);
                }

                // Refresh node
                instance.graph.node.collapseNode(instance.graph.force.nodes()[i]);
                instance.graph.node.expandNode(instance.graph.force.nodes()[i]);
            }
        }

        if (isAnyChangeDone) {
            instance.result.hasChanged = true;
            instance.graph.hasGraphChanged = true;
            instance.update();
        }
    };

    /**
     * Return all nodes with isAutoLoadValue property set to true.
     */
    instance.graph.node.getAutoLoadValueNodes = function () {
        return instance.graph.force.nodes()
            .filter(function (d) {
                return d.hasOwnProperty("isAutoLoadValue") && d.isAutoLoadValue === true && !(d.isNegative === true);
            });
    };

    /**
     * Add a list of related value if not already found in node.
     * A value is defined with the following structure
     * {
     *   id,
     *   rel,
     *   label
     * }
     *
     * @param node
     * @param values
     * @param isNegative
     */
    instance.graph.node.addRelatedValues = function (node, values, isNegative) {
        var valuesToAdd = instance.graph.node.filterExistingValues(node, values);

        if (valuesToAdd.length <= 0) {
            return;
        }

        var statements = [];

        valuesToAdd.forEach(function (v) {
            var constraintAttr = instance.provider.node.getConstraintAttribute(v.label);

            var statement = "MATCH ";
            if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
                statement += "(v:`" + v.label + "`) WHERE (ID(v) = $p)";
            } else {
                statement += "(v:`" + v.label + "`) WHERE (v." + constraintAttr + " = $p)";
            }

            var resultAttributes = instance.provider.node.getReturnAttributes(v.label);
            var sep = "";

            statement += " RETURN DISTINCT \"" + v.rel + "\" AS rel, \"" + v.label + "\" AS label, {" + resultAttributes.reduce(function (a, attr) {
                a += sep + attr + ":v." + attr;
                sep = ", ";
                return a
            }, "") + "} AS value LIMIT 1";

            statements.push(
                {
                    "statement": statement,
                    "parameters": {p: v.id},
                    "resultDataContents": ["row"]
                }
            )
        });

        instance.logger.info("addRelatedValues ==>");
        instance.rest.post(
            {
                "statements": statements
            })
            .done(function (response) {
                instance.logger.info("<== addRelatedValues");

                var parsedData = instance.rest.response.parse(response);
                var count = 0;
                parsedData.forEach(function (data) {
                    if (data.length > 0) {
                        var dataLabel = data[0].label;
                        var dataValue = data[0].value;
                        var dataRel = data[0].rel;

                        var value = {
                            "id": instance.graph.generateId(),
                            "parent": node,
                            "attributes": dataValue,
                            "type": instance.graph.node.NodeTypes.VALUE,
                            "label": dataLabel
                        };
                        instance.graph.ignoreCount = true;

                        var nodeRelationships = node.relationships;
                        var nodeRels = nodeRelationships.filter(function (r) {
                            return r.label === dataRel && r.target === dataLabel
                        });

                        var nodeRel = {label: dataRel, target: dataLabel};
                        if (nodeRels.length > 0) {
                            nodeRel = nodeRels[0];
                        }

                        instance.graph.addRelationshipData(node, nodeRel, function () {
                            count++;

                            if (count === parsedData.length) {
                                instance.graph.ignoreCount = false;
                                instance.graph.hasGraphChanged = true;
                                instance.result.hasChanged = true;
                                instance.update();
                            }
                        }, [value], isNegative);
                    }
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
    instance.graph.node.addRelatedBranch = function (node, relPath, values, isNegative) {
        if (relPath.length > 0) {
            var rel = relPath[0];
            relPath = relPath.slice(1);

            var relationships = node.relationships.filter(function (r) {
                return r.label === rel.type && r.target === rel.target;
            });

            if (relationships.length > 0) {
                instance.graph.addRelationshipData(node, relationships[0], function (createdNode) {
                    instance.graph.node.addRelatedBranch(createdNode, relPath, values, isNegative);
                });
            }
        } else {
            instance.graph.node.addRelatedValues(node, values, isNegative)
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
    instance.graph.node.filterExistingValues = function (node, values) {
        var notFoundValues = [];
        var possibleValueNodes = instance.graph.force.nodes().filter(function (n) {
            return n.parent === node && n.hasOwnProperty("value") && n.value.length > 0;
        });

        values.forEach(function (v) {
            var found = false;
            var constraintAttr = instance.provider.node.getConstraintAttribute(v.label);

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
    instance.graph.computeParentAngle = function (node) {
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
    instance.graph.node.expandNode = function (clickedNode) {

        instance.graph.notifyListeners(instance.graph.Events.GRAPH_NODE_VALUE_EXPAND, [clickedNode]);

        // Get subset of node corresponding to the current node page and page size
        var lIndex = clickedNode.page * instance.graph.node.PAGE_SIZE;
        var sIndex = lIndex - instance.graph.node.PAGE_SIZE;

        var dataToAdd = clickedNode.data.slice(sIndex, lIndex);
        var parentAngle = instance.graph.computeParentAngle(clickedNode);

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
                "id": instance.graph.generateId(),
                "parent": clickedNode,
                "attributes": d,
                "type": instance.graph.node.NodeTypes.VALUE,
                "label": clickedNode.label,
                "count": d.count,
                "x": nx,
                "y": ny,
                "internalID": d[instance.query.NEO4J_INTERNAL_ID.queryInternalName]
            };

            instance.graph.force.nodes().push(node);

            instance.graph.force.links().push(
                {
                    id: "l" + instance.graph.generateId(),
                    source: clickedNode,
                    target: node,
                    type: instance.graph.link.LinkTypes.VALUE
                }
            );

            i++;
        });

        // Pin clicked node and its parent to avoid the graph to move for selection, only new value nodes will blossom around the clicked node.
        clickedNode.fixed = true;
        if (clickedNode.parent && clickedNode.parent.type !== instance.graph.node.NodeTypes.ROOT) {
            clickedNode.parent.fixed = true;
        }
        // Change node state
        clickedNode.valueExpanded = true;
        instance.update();
    };

    /**
     * Fetches the list of relationships of a node and store them in the relationships property.
     *
     * @param node the node to fetch the relationships.
     * @param callback
     * @param directionAngle
     */
    instance.graph.node.loadRelationshipData = function (node, callback, directionAngle) {
        var schema = instance.provider.node.getSchema(node.label);

        if (schema !== undefined) {
            if (schema.hasOwnProperty("rel") && schema.rel.length > 0) {
                callback(instance.graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(schema.rel).map(function (d) {
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
            var query = instance.query.generateNodeRelationQuery(node);

            instance.logger.info("Relations (" + node.label + ") ==>");
            instance.rest.post(
                {
                    "statements": [
                        {
                            "statement": query.statement,
                            "parameters": query.parameters
                        }]
                })
                .done(function (response) {
                    instance.logger.info("<== Relations (" + node.label + ")");
                    var parsedData = instance.rest.response.parse(response);

                    // Filter data to eventually remove relations if a filter has been defined in config.
                    var filteredData = parsedData[0].filter(function (d) {
                        return instance.query.filterRelation(d);
                    });

                    filteredData = instance.graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(filteredData).map(function (d) {
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
                    instance.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + instance.rest.CYPHER_URL + "\" defined in \"instance.rest.CYPHER_URL\" property: " + errorThrown);
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
    instance.graph.node.expandRelationships = function (node, callback) {
        var callbackCount = 0;

        if (node.hasOwnProperty("relationships") && node.relationships.length > 0) {

            for (var i = 0; i < node.relationships.length; i++) {
                instance.graph.addRelationshipData(node, node.relationships[i], function () {
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
    instance.graph.addRelationshipData = function (node, link, callback, values, isNegative) {
        var targetNode = {
            "id": "" + instance.graph.generateId(),
            "parent": node,
            "parentRel": link.label,
            "type": instance.graph.node.NodeTypes.CHOOSE,
            "label": link.target,
            "fixed": false,
            "internalLabel": instance.graph.node.generateInternalLabel(link.target),
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
            id: "l" + instance.graph.generateId(),
            source: node,
            target: targetNode,
            type: instance.graph.link.LinkTypes.RELATION,
            label: link.label
        };

        targetNode.x = node.x + ((instance.provider.link.getDistance(newLink) * 2 / 3) * Math.cos(link.directionAngle - Math.PI / 2)) + Math.random() * 10;
        targetNode.y = node.y + ((instance.provider.link.getDistance(newLink) * 2 / 3) * Math.sin(link.directionAngle - Math.PI / 2)) + Math.random() * 10;

        targetNode.tx = node.tx + ((instance.provider.link.getDistance(newLink)) * Math.cos(link.directionAngle - Math.PI / 2));
        targetNode.ty = node.ty + ((instance.provider.link.getDistance(newLink)) * Math.sin(link.directionAngle - Math.PI / 2));

        instance.graph.force.nodes().push(targetNode);
        instance.graph.force.links().push(newLink);

        instance.graph.hasGraphChanged = true;
        instance.updateGraph();

        instance.graph.node.loadRelationshipData(targetNode, function (relationships) {
                targetNode.relationships = relationships;

                instance.graph.hasGraphChanged = true;
                instance.updateGraph();

                if (instance.provider.node.getIsAutoExpandRelations(targetNode.label)) {
                    instance.graph.node.expandRelationships(targetNode, function () {
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
    instance.graph.node.removeNode = function (node) {
        var willChangeResults = node.hasOwnProperty("value") && node.value.length > 0;

        var linksToRemove = instance.graph.force.links().filter(function (l) {
            return l.source === node;
        });

        // Remove children nodes from model
        linksToRemove.forEach(function (l) {
            var rc = instance.graph.node.removeNode(l.target);
            willChangeResults = willChangeResults || rc;
        });

        // Remove links from model
        for (var i = instance.graph.force.links().length - 1; i >= 0; i--) {
            if (instance.graph.force.links()[i].target === node) {
                instance.graph.force.links().splice(i, 1);
            }
        }

        instance.graph.force.nodes().splice(instance.graph.force.nodes().indexOf(node), 1);

        return willChangeResults;
    };

    /**
     * Function to add on node event to clear the selection.
     * Call to this function on a node will remove the selected value and trigger a graph update.
     */
    instance.graph.node.clearSelection = function () {
        // Prevent default event like right click  opening menu.
        d3.event.preventDefault();

        // Get clicked node.
        var clickedNode = d3.select(this).data()[0];

        // Collapse all expanded choose nodes first
        instance.graph.node.collapseAllNode();

        if (clickedNode.value !== undefined && clickedNode.value.length > 0 && !clickedNode.immutable) {
            // Remove last value of chosen node
            clickedNode.value.pop();

            if (clickedNode.isNegative === true) {
                if (clickedNode.value.length === 0) {
                    // Remove all related nodes

                    for (var i = instance.graph.force.links().length - 1; i >= 0; i--) {
                        if (instance.graph.force.links()[i].source === clickedNode) {
                            instance.graph.node.removeNode(instance.graph.force.links()[i].target);
                        }
                    }

                    clickedNode.count = 0;
                }
            }

            instance.result.hasChanged = true;
            instance.graph.hasGraphChanged = true;
            instance.update();
        }
    };

// QUERY VIEWER -----------------------------------------------------------------------------------------------------
    instance.queryviewer = {};
    instance.queryviewer.containerId = "instance-query";
    instance.queryviewer.QUERY_STARTER = "I'm looking for";
    instance.queryviewer.CHOOSE_LABEL = "choose";

    /**
     * Create the query viewer area.
     *
     */
    instance.queryviewer.createQueryArea = function () {
        var id = "#" + instance.queryviewer.containerId;

        instance.queryviewer.queryConstraintSpanElements = d3.select(id).append("p").attr("class", "ppt-query-constraint-elements").selectAll(".queryConstraintSpan");
        instance.queryviewer.querySpanElements = d3.select(id).append("p").attr("class", "ppt-query-elements").selectAll(".querySpan");
    };

    /**
     * Update all the elements displayed on the query viewer based on current graph.
     */
    instance.queryviewer.updateQuery = function () {

        // Remove all query span elements
        instance.queryviewer.queryConstraintSpanElements = instance.queryviewer.queryConstraintSpanElements.data([]);
        instance.queryviewer.querySpanElements = instance.queryviewer.querySpanElements.data([]);

        instance.queryviewer.queryConstraintSpanElements.exit().remove();
        instance.queryviewer.querySpanElements.exit().remove();

        // Update data
        instance.queryviewer.queryConstraintSpanElements = instance.queryviewer.queryConstraintSpanElements.data(instance.queryviewer.generateConstraintData(instance.graph.force.links(), instance.graph.force.nodes()));
        instance.queryviewer.querySpanElements = instance.queryviewer.querySpanElements.data(instance.queryviewer.generateData(instance.graph.force.links(), instance.graph.force.nodes()));

        // Remove old span (not needed as all have been cleaned before)
        // instance.queryviewer.querySpanElements.exit().remove();

        // Add new span
        instance.queryviewer.queryConstraintSpanElements.enter().append("span")
            .on("contextmenu", instance.queryviewer.rightClickSpan)
            .on("click", instance.queryviewer.clickSpan)
            .on("mouseover", instance.queryviewer.mouseOverSpan)
            .on("mouseout", instance.queryviewer.mouseOutSpan);

        instance.queryviewer.querySpanElements.enter().append("span")
            .on("contextmenu", instance.queryviewer.rightClickSpan)
            .on("click", instance.queryviewer.clickSpan)
            .on("mouseover", instance.queryviewer.mouseOverSpan)
            .on("mouseout", instance.queryviewer.mouseOutSpan);

        // Update all span
        instance.queryviewer.queryConstraintSpanElements
            .attr("id", function (d) {
                return d.id
            })
            .attr("class", function (d) {
                if (d.isLink) {
                    return "ppt-span-link";
                } else {
                    if (d.type === instance.graph.node.NodeTypes.ROOT) {
                        return "ppt-span-root";
                    } else if (d.type === instance.graph.node.NodeTypes.CHOOSE) {
                        if (d.ref.value !== undefined && d.ref.value.length > 0) {
                            return "ppt-span-value";
                        } else {
                            return "ppt-span-choose";
                        }
                    } else if (d.type === instance.graph.node.NodeTypes.VALUE) {
                        return "ppt-span-value";
                    } else if (d.type === instance.graph.node.NodeTypes.GROUP) {
                        return "ppt-span-group";
                    } else {
                        return "ppt-span";
                    }
                }
            })
            .text(function (d) {
                return d.term + " ";
            });

        instance.queryviewer.querySpanElements
            .attr("id", function (d) {
                return d.id
            })
            .attr("class", function (d) {
                if (d.isLink) {
                    return "ppt-span-link";
                } else {
                    if (d.type === instance.graph.node.NodeTypes.ROOT) {
                        return "ppt-span-root";
                    } else if (d.type === instance.graph.node.NodeTypes.CHOOSE) {
                        if (d.ref.value !== undefined && d.ref.value.length > 0) {
                            return "ppt-span-value";
                        } else {
                            return "ppt-span-choose";
                        }
                    } else if (d.type === instance.graph.node.NodeTypes.VALUE) {
                        return "ppt-span-value";
                    } else if (d.type === instance.graph.node.NodeTypes.GROUP) {
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

    instance.queryviewer.generateConstraintData = function (links, nodes) {
        var elmts = [], id = 0;

        // Add query starter
        elmts.push(
            {id: id++, term: instance.queryviewer.QUERY_STARTER}
        );

        // Add the root node as query term
        if (nodes.length > 0) {
            elmts.push(
                {id: id++, type: nodes[0].type, term: instance.provider.node.getSemanticValue(nodes[0]), ref: nodes[0]}
            );
        }

        // Add a span for each link and its target node
        links.forEach(function (l) {

            var sourceNode = l.source;
            var targetNode = l.target;
            if (l.type === instance.graph.link.LinkTypes.RELATION && targetNode.type !== instance.graph.node.NodeTypes.GROUP && targetNode.value !== undefined && targetNode.value.length > 0) {
                if (sourceNode.type === instance.graph.node.NodeTypes.GROUP) {
                    elmts.push(
                        {
                            id: id++,
                            type: sourceNode.type,
                            term: instance.provider.node.getSemanticValue(sourceNode),
                            ref: sourceNode
                        }
                    );
                }

                elmts.push({id: id++, isLink: true, term: instance.provider.link.getSemanticValue(l), ref: l});

                if (targetNode.type !== instance.graph.node.NodeTypes.GROUP) {
                    if (targetNode.value !== undefined && targetNode.value.length > 0) {
                        elmts.push(
                            {
                                id: id++,
                                type: targetNode.type,
                                term: instance.provider.node.getSemanticValue(targetNode),
                                ref: targetNode
                            }
                        );
                    } else {
                        elmts.push(
                            {
                                id: id++,
                                type: targetNode.type,
                                term: "<" + instance.queryviewer.CHOOSE_LABEL + " " + instance.provider.node.getSemanticValue(targetNode) + ">",
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
    instance.queryviewer.generateData = function (links, nodes) {
        var elmts = [], options = [], id = 0;

        // Add a span for each link and its target node
        links.forEach(function (l) {

            var sourceNode = l.source;
            var targetNode = l.target;

            if (targetNode.type === instance.graph.node.NodeTypes.GROUP) {
                options.push(
                    {
                        id: id++,
                        type: targetNode.type,
                        term: instance.provider.node.getSemanticValue(targetNode),
                        ref: targetNode
                    }
                );
            }

            if (l.type === instance.graph.link.LinkTypes.RELATION && targetNode.type !== instance.graph.node.NodeTypes.GROUP && (targetNode.value === undefined || targetNode.value.length === 0)) {
                if (sourceNode.type === instance.graph.node.NodeTypes.GROUP) {
                    elmts.push(
                        {
                            id: id++,
                            type: sourceNode.type,
                            term: instance.provider.node.getSemanticValue(sourceNode),
                            ref: sourceNode
                        }
                    );
                }

                elmts.push({id: id++, isLink: true, term: instance.provider.link.getSemanticValue(l), ref: l});

                if (targetNode.type !== instance.graph.node.NodeTypes.GROUP) {
                    elmts.push(
                        {
                            id: id++,
                            type: targetNode.type,
                            term: "<" + instance.queryviewer.CHOOSE_LABEL + " " + instance.provider.node.getSemanticValue(targetNode) + ">",
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
    instance.queryviewer.mouseOverSpan = function () {
        d3.select(this).classed("hover", function (d) {
            return d.ref;
        });

        var hoveredSpan = d3.select(this).data()[0];

        if (hoveredSpan.ref) {
            var linkElmt = instance.graph.svg.selectAll("#" + instance.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            linkElmt.select("path").classed("ppt-link-hover", true);
            linkElmt.select("text").classed("ppt-link-hover", true);

            var nodeElmt = instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });

            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

            if (instance.cypherviewer.isActive) {
                instance.cypherviewer.querySpanElements.filter(function (d) {
                    return d.node === hoveredSpan.ref || d.link === hoveredSpan.ref;
                }).classed("hover", true);
            }
        }
    };

    instance.queryviewer.rightClickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (!clickedSpan.isLink && clickedSpan.ref) {
            var nodeElmt = instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.ref;
            });

            nodeElmt.on("contextmenu").call(nodeElmt.node(), clickedSpan.ref);
        }
    };

    instance.queryviewer.clickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (!clickedSpan.isLink && clickedSpan.ref) {
            var nodeElmt = instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.ref;
            });

            nodeElmt.on("click").call(nodeElmt.node(), clickedSpan.ref);
        }
    };

    /**
     *
     */
    instance.queryviewer.mouseOutSpan = function () {
        d3.select(this).classed("hover", false);

        var hoveredSpan = d3.select(this).data()[0];

        if (hoveredSpan.ref) {
            var linkElmt = instance.graph.svg.selectAll("#" + instance.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            linkElmt.select("path").classed("ppt-link-hover", false);
            linkElmt.select("text").classed("ppt-link-hover", false);

            var nodeElmt = instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

            if (instance.cypherviewer.isActive) {
                instance.cypherviewer.querySpanElements.filter(function (d) {
                    return d.node === hoveredSpan.ref || d.link === hoveredSpan.ref;
                }).classed("hover", false);
            }
        }
    };

// CYPHER VIEWER -----------------------------------------------------------------------------------------------------

    instance.cypherviewer = {};
    instance.cypherviewer.containerId = "instance-cypher";
    instance.cypherviewer.MATCH = "MATCH";
    instance.cypherviewer.RETURN = "RETURN";
    instance.cypherviewer.WHERE = "WHERE";
    instance.cypherviewer.QueryElementTypes = Object.freeze({
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
    instance.cypherviewer.createQueryArea = function () {
        var id = "#" + instance.cypherviewer.containerId;

        instance.cypherviewer.querySpanElements = d3.select(id).append("p").attr("class", "ppt-query-constraint-elements").selectAll(".queryConstraintSpan");
    };

    /**
     * Update all the elements displayed on the cypher viewer based on current graph.
     */
    instance.cypherviewer.updateQuery = function () {

        // Remove all query span elements
        instance.cypherviewer.querySpanElements = instance.cypherviewer.querySpanElements.data([]);

        instance.cypherviewer.querySpanElements.exit().remove();

        // Update data
        instance.cypherviewer.querySpanElements = instance.cypherviewer.querySpanElements.data(instance.cypherviewer.generateData(instance.graph.force.links(), instance.graph.force.nodes()));

        // Remove old span (not needed as all have been cleaned before)
        // instance.queryviewer.querySpanElements.exit().remove();

        // Add new span
        instance.cypherviewer.querySpanElements.enter().append("span")
            .attr("id", function (d) {
                return "cypher-" + d.id;
            })
            .on("mouseover", instance.cypherviewer.mouseOverSpan)
            .on("mouseout", instance.cypherviewer.mouseOutSpan)
            .on("contextmenu", instance.cypherviewer.rightClickSpan)
            .on("click", instance.cypherviewer.clickSpan);

        // Update all spans:
        instance.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === instance.cypherviewer.QueryElementTypes.KEYWORD;
        })
            .attr("class", "ppt-span")
            .text(function (d) {
                return " " + d.value + " ";
            });

        instance.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === instance.cypherviewer.QueryElementTypes.SEPARATOR;
        })
            .attr("class", "ppt-span")
            .text(function (d) {
                return d.value + " ";
            });

        instance.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === instance.cypherviewer.QueryElementTypes.NODE;
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

        instance.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === instance.cypherviewer.QueryElementTypes.SOURCE;
        })
            .attr("class", function (d) {
                if (d.node === instance.graph.getRootNode()) {
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

        instance.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === instance.cypherviewer.QueryElementTypes.LINK;
        })
            .attr("class", "ppt-span-link")
            .text(function (d) {
                if (d.link.target.isParentRelReverse === true) {
                    return "<-[:`" + d.link.label + "`]-";
                } else {
                    return "-[:`" + d.link.label + "`]-" + (instance.query.USE_RELATION_DIRECTION ? ">" : "");
                }
            });

        instance.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === instance.cypherviewer.QueryElementTypes.TARGET;
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

        instance.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === instance.cypherviewer.QueryElementTypes.WHERE;
        })
            .attr("class", function (d) {
                if (d.node === instance.graph.getRootNode()) {
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
                        var constAttr = instance.provider.node.getConstraintAttribute(node.label);
                        node.value.forEach(function (value) {
                            clauses.push(
                                "(NOT (" + d.link.source.internalLabel + ":`" + d.link.source.label + "`)-[:`" + d.link.label + "`]->(:`" + d.link.target.label + "`{" + constAttr + ":" + value.attributes[constAttr] + "}))"
                            );
                        });

                        return clauses.join(" AND ");
                    }
                } else {
                    var constraintAttr = instance.provider.node.getConstraintAttribute(node.label);

                    var text = "";
                    var separator = "";

                    if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
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
                        if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
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

        instance.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === instance.cypherviewer.QueryElementTypes.RETURN;
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
    instance.cypherviewer.generateData = function (links) {
        var elmts = [], id = 0;
        var rootNode = instance.graph.getRootNode();
        var relevantLinks = instance.query.getRelevantLinks(rootNode, rootNode, links);
        var negativeLinks = relevantLinks.filter(function (rl) {
            return rl.target.isNegative === true && (!rl.target.hasOwnProperty("value") || rl.target.value.length <= 0)
        });

        elmts.push(
            {
                id: id++,
                type: instance.cypherviewer.QueryElementTypes.KEYWORD,
                value: instance.cypherviewer.MATCH
            }
        );

        if (rootNode) {
            elmts.push(
                {
                    id: id++,
                    type: instance.cypherviewer.QueryElementTypes.NODE,
                    node: rootNode
                }
            );
        }

        if (relevantLinks.length > 0 && relevantLinks.length > negativeLinks.length) {
            elmts.push(
                {
                    id: id++,
                    type: instance.cypherviewer.QueryElementTypes.SEPARATOR,
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
                        type: instance.cypherviewer.QueryElementTypes.SOURCE,
                        node: relevantLink.source
                    }
                );

                elmts.push(
                    {
                        id: id++,
                        type: instance.cypherviewer.QueryElementTypes.LINK,
                        link: relevantLink
                    }
                );

                elmts.push(
                    {
                        id: id++,
                        type: instance.cypherviewer.QueryElementTypes.TARGET,
                        node: relevantLink.target
                    }
                );

                // Add separator except for last element
                if (i < (relevantLinks.length - 1)) {
                    elmts.push(
                        {
                            id: id++,
                            type: instance.cypherviewer.QueryElementTypes.SEPARATOR,
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
                    type: instance.cypherviewer.QueryElementTypes.KEYWORD,
                    value: instance.cypherviewer.WHERE
                }
            );
        }

        if (rootNode && rootNode.value !== undefined && rootNode.value.length > 0) {
            elmts.push(
                {
                    id: id++,
                    type: instance.cypherviewer.QueryElementTypes.WHERE,
                    node: rootNode
                }
            );

            if (relevantLinks.length > 0) {
                elmts.push(
                    {
                        id: id++,
                        type: instance.cypherviewer.QueryElementTypes.SEPARATOR,
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
                            type: instance.cypherviewer.QueryElementTypes.SEPARATOR,
                            value: " AND "
                        }
                    );
                }
                elmts.push(
                    {
                        id: id++,
                        type: instance.cypherviewer.QueryElementTypes.WHERE,
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
                                type: instance.cypherviewer.QueryElementTypes.SEPARATOR,
                                value: " AND "
                            }
                        );
                    }

                    elmts.push(
                        {
                            id: id++,
                            type: instance.cypherviewer.QueryElementTypes.WHERE,
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
                type: instance.cypherviewer.QueryElementTypes.KEYWORD,
                value: instance.cypherviewer.RETURN
            }
        );

        if (rootNode) {
            elmts.push(
                {
                    id: id++,
                    type: instance.cypherviewer.QueryElementTypes.RETURN,
                    node: rootNode
                }
            );
        }

        return elmts;
    };

    /**
     *
     */
    instance.cypherviewer.mouseOverSpan = function () {
        var hoveredSpan = d3.select(this).data()[0];
        if (hoveredSpan.node) {
            // Hover all spans with same node data
            instance.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredSpan.node;
            }).classed("hover", true);

            // Highlight node in graph
            var nodeElmt = instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.node;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

            // Highlight query viewer
            if (instance.queryviewer.isActive) {
                instance.queryviewer.queryConstraintSpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", true);

                instance.queryviewer.querySpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", true);
            }
        } else if (hoveredSpan.link) {
            d3.select(this).classed("hover", true);

            // Highlight link in graph
            var linkElmt = instance.graph.svg.selectAll("#" + instance.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.link;
            });
            linkElmt.select("path").classed("ppt-link-hover", true);
            linkElmt.select("text").classed("ppt-link-hover", true);
        }
    };

    instance.cypherviewer.mouseOutSpan = function () {
        var hoveredSpan = d3.select(this).data()[0];
        if (hoveredSpan.node) {
            // Remove hover on all spans with same node data
            instance.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredSpan.node;
            }).classed("hover", false);

            // Remove highlight on node in graph
            var nodeElmt = instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.node;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

            if (instance.queryviewer.isActive) {
                instance.queryviewer.queryConstraintSpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", false);

                instance.queryviewer.querySpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", false);
            }
        } else if (hoveredSpan.link) {
            d3.select(this).classed("hover", false);

            // Remove highlight on link in graph
            var linkElmt = instance.graph.svg.selectAll("#" + instance.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.link;
            });
            linkElmt.select("path").classed("ppt-link-hover", false);
            linkElmt.select("text").classed("ppt-link-hover", false);
        }
    };

    instance.cypherviewer.clickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (clickedSpan.node) {
            var nodeElmt = instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.node;
            });

            nodeElmt.on("click").call(nodeElmt.node(), clickedSpan.node);
        }
    };

    instance.cypherviewer.rightClickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (clickedSpan.node) {
            var nodeElmt = instance.graph.svg.selectAll("#" + instance.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.node;
            });

            nodeElmt.on("contextmenu").call(nodeElmt.node(), clickedSpan.node);
        }
    };

// QUERY ------------------------------------------------------------------------------------------------------------
    instance.query = {};
    /**
     * Define the number of results displayed in result list.
     */
    instance.query.MAX_RESULTS_COUNT = 100;
    // instance.query.RESULTS_PAGE_NUMBER = 1;
    instance.query.VALUE_QUERY_LIMIT = 100;
    instance.query.USE_PARENT_RELATION = false;
    instance.query.USE_RELATION_DIRECTION = true;
    instance.query.COLLECT_RELATIONS_WITH_VALUES = false;
    instance.query.prefilter = "";

    /**
     * Immutable constant object to identify Neo4j internal ID
     */
    instance.query.NEO4J_INTERNAL_ID = Object.freeze({queryInternalName: "NEO4JID"});

    /**
     * Function used to filter returned relations
     * return false if the result should be filtered out.
     *
     * @param d relation returned object
     * @returns {boolean}
     */
    instance.query.filterRelation = function (d) {
        return true;
    };

    /**
     * Generate the query to count nodes of a label.
     * If the label is defined as distinct in configuration the query will count only distinct values on constraint attribute.
     */
    instance.query.generateTaxonomyCountQuery = function (label) {
        var constraintAttr = instance.provider.node.getConstraintAttribute(label);

        var whereElements = [];

        var predefinedConstraints = instance.provider.node.getPredefinedConstraints(label);
        predefinedConstraints.forEach(function (predefinedConstraint) {
            whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), "n"));
        });

        if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
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
    instance.query.generateQueryElements = function (rootNode, selectedNode, links, isConstraintNeeded) {
        var matchElements = [];
        var whereElements = [];
        var relationElements = [];
        var returnElements = [];
        var parameters = {};

        var rootPredefinedConstraints = instance.provider.node.getPredefinedConstraints(rootNode.label);

        rootPredefinedConstraints.forEach(function (predefinedConstraint) {
            whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), rootNode.internalLabel));
        });

        matchElements.push("(" + rootNode.internalLabel + ":`" + rootNode.label + "`)");

        // Generate root node match element
        if (isConstraintNeeded || rootNode.immutable) {
            var rootValueConstraints = instance.query.generateNodeValueConstraints(rootNode);
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

            if (!instance.query.USE_RELATION_DIRECTION || targetNode.isParentRelReverse === true) {
                rel = "-";
            }

            var relIdentifier = "r" + relId++;
            relationElements.push(relIdentifier);
            var predefinedConstraints = instance.provider.node.getPredefinedConstraints(targetNode.label);

            predefinedConstraints.forEach(function (predefinedConstraint) {
                whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), targetNode.internalLabel));
            });

            if (targetNode !== selectedNode && targetNode.isNegative === true) {
                if (targetNode.value !== undefined && targetNode.value.length > 0) {
                    var count = 0;

                    targetNode.value.forEach(function (v) {
                        var constraintAttr = instance.provider.node.getConstraintAttribute(v.label);
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
                if (instance.query.COLLECT_RELATIONS_WITH_VALUES && targetNode === selectedNode) {
                    returnElements.push("COLLECT(" + relIdentifier + ") AS incomingRels");
                }

                matchElements.push("(" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[" + relIdentifier + ":`" + l.label + "`]" + rel + "(" + targetNode.internalLabel + ":`" + targetNode.label + "`)");
            }


            if (targetNode !== selectedNode && (isConstraintNeeded || targetNode.immutable)) {
                var nodeValueConstraints = instance.query.generateNodeValueConstraints(targetNode);
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
    instance.query.generateNodeValueConstraints = function (node) {
        var parameters = {}, whereElements = [];
        if (node.value !== undefined && node.value.length > 0) {
            var constraintAttr = instance.provider.node.getConstraintAttribute(node.label);
            var paramName = node.internalLabel + "_" + constraintAttr;

            if (node.value.length > 1) { // Generate IN constraint
                if (node.isNegative === undefined || !node.isNegative) {
                    parameters[paramName] = [];

                    node.value.forEach(function (value) {
                        var constraintValue;
                        if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
                            constraintValue = value.internalID
                        } else {
                            constraintValue = value.attributes[constraintAttr];
                        }

                        parameters[paramName].push(constraintValue);
                    });

                    if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
                        whereElements.push("ID(" + node.internalLabel + ") IN " + "{`" + paramName + "`}");
                    } else {
                        whereElements.push(node.internalLabel + "." + constraintAttr + " IN " + "{`" + paramName + "`}");
                    }
                } else {
                    var count = 0;

                    node.value.forEach(function (value) {
                        var constraintValue;
                        if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
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
                if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
                    parameters[paramName] = node.value[0].internalID;
                } else {
                    parameters[paramName] = node.value[0].attributes[constraintAttr];
                }

                if (node.isNegative === undefined || !node.isNegative) {
                    var operator = "=";

                    if (constraintAttr === instance.query.NEO4J_INTERNAL_ID) {
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
    instance.query.getRelevantLinks = function (rootNode, targetNode, initialLinks) {

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
    instance.query.getLinksToRoot = function (node, links) {
        var pathLinks = [];
        var targetNode = node;

        while (targetNode !== instance.graph.getRootNode()) {
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
    instance.query.generateResultQuery = function (isGraph) {
        var rootNode = instance.graph.getRootNode();
        var queryElements = instance.query.generateQueryElements(rootNode, rootNode, instance.query.getRelevantLinks(rootNode, rootNode, instance.graph.force.links()), true);
        var queryMatchElements = queryElements.matchElements,
            queryWhereElements = queryElements.whereElements,
            queryRelationElements = queryElements.relationElements,
            queryReturnElements = [],
            queryEndElements = [],
            queryParameters = queryElements.parameters;

        // Sort results by specified attribute
        var resultOrderByAttribute = instance.provider.node.getResultOrderByAttribute(rootNode.label);
        if (resultOrderByAttribute) {
            var order = instance.provider.node.isResultOrderAscending(rootNode.label) ? "ASC" : "DESC";
            queryEndElements.push("ORDER BY " + resultOrderByAttribute + " " + order);
        }

        queryEndElements.push("LIMIT " + instance.query.MAX_RESULTS_COUNT);

        var resultAttributes = instance.provider.node.getReturnAttributes(rootNode.label);

        if (!isGraph) {
            for (var i = 0; i < resultAttributes.length; i++) {
                var attribute = resultAttributes[i];
                if (attribute === instance.query.NEO4J_INTERNAL_ID) {
                    queryReturnElements.push("ID(" + rootNode.internalLabel + ") AS " + instance.query.NEO4J_INTERNAL_ID.queryInternalName);
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
        var queryStructure = instance.provider.node.filterResultQuery(rootNode.label, {
            statement: queryStatement,
            matchElements: queryMatchElements,
            whereElements: queryWhereElements,
            withElements: [],
            returnElements: queryReturnElements,
            endElements: queryEndElements,
            parameters: queryParameters
        });

        queryStructure.statement = instance.query.prefilter + queryStructure.statement;

        return queryStructure;
    };

    /**
     * Generate a cypher query to the get the node count, set as parameter matching the current graph.
     *
     * @param countedNode the counted node
     * @returns {string} the node count cypher query
     */
    instance.query.generateNodeCountQuery = function (countedNode) {

        var queryElements = instance.query.generateQueryElements(instance.graph.getRootNode(), countedNode, instance.query.getRelevantLinks(instance.graph.getRootNode(), countedNode, instance.graph.force.links()), true);
        var queryMatchElements = queryElements.matchElements,
            queryWhereElements = queryElements.whereElements,
            queryReturnElements = [],
            queryEndElements = [],
            queryParameters = queryElements.parameters;

        var countAttr = instance.provider.node.getConstraintAttribute(countedNode.label);

        if (countAttr === instance.query.NEO4J_INTERNAL_ID) {
            queryReturnElements.push("count(DISTINCT ID(" + countedNode.internalLabel + ")) as count");
        } else {
            queryReturnElements.push("count(DISTINCT " + countedNode.internalLabel + "." + countAttr + ") as count");
        }

        var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ");

        // Filter the query if defined in config
        var queryStructure = instance.provider.node.filterNodeCountQuery(countedNode, {
            statement: queryStatement,
            matchElements: queryMatchElements,
            whereElements: queryWhereElements,
            returnElements: queryReturnElements,
            endElements: queryEndElements,
            parameters: queryParameters
        });

        return {
            statement: instance.query.prefilter + queryStructure.statement,
            parameters: queryStructure.parameters
        };
    };

    /**
     * Generate a Cypher query from the graph model to get all the possible values for the targetNode element.
     *
     * @param targetNode node in the graph to get the values.
     * @returns {string} the query to execute to get all the values of targetNode corresponding to the graph.
     */
    instance.query.generateNodeValueQuery = function (targetNode) {

        var rootNode = instance.graph.getRootNode();
        var queryElements = instance.query.generateQueryElements(rootNode, targetNode, instance.query.getRelevantLinks(rootNode, targetNode, instance.graph.force.links()), true);
        var queryMatchElements = queryElements.matchElements,
            queryWhereElements = queryElements.whereElements,
            queryReturnElements = [],
            queryEndElements = [],
            queryParameters = queryElements.parameters;

        // Sort results by specified attribute
        var valueOrderByAttribute = instance.provider.node.getValueOrderByAttribute(targetNode.label);
        if (valueOrderByAttribute) {
            var order = instance.provider.node.isValueOrderAscending(targetNode.label) ? "ASC" : "DESC";
            queryEndElements.push("ORDER BY " + valueOrderByAttribute + " " + order);
        }

        queryEndElements.push("LIMIT " + instance.query.VALUE_QUERY_LIMIT);

        var resultAttributes = instance.provider.node.getReturnAttributes(targetNode.label);
        var constraintAttribute = instance.provider.node.getConstraintAttribute(targetNode.label);

        for (var i = 0; i < resultAttributes.length; i++) {
            if (resultAttributes[i] === instance.query.NEO4J_INTERNAL_ID) {
                queryReturnElements.push("ID(" + targetNode.internalLabel + ") AS " + instance.query.NEO4J_INTERNAL_ID.queryInternalName);
            } else {
                queryReturnElements.push(targetNode.internalLabel + "." + resultAttributes[i] + " AS " + resultAttributes[i]);
            }
        }

        // Add count return attribute on root node
        var rootConstraintAttr = instance.provider.node.getConstraintAttribute(rootNode.label);

        if (rootConstraintAttr === instance.query.NEO4J_INTERNAL_ID) {
            queryReturnElements.push("count(DISTINCT ID(" + rootNode.internalLabel + ")) AS count");
        } else {
            queryReturnElements.push("count(DISTINCT " + rootNode.internalLabel + "." + rootConstraintAttr + ") AS count");
        }

        if (instance.query.COLLECT_RELATIONS_WITH_VALUES) {
            queryElements.returnElements.forEach(function (re) {
                queryReturnElements.push(re);
            });
        }

        var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ") + " " + queryEndElements.join(" ");

        // Filter the query if defined in config
        var queryStructure = instance.provider.node.filterNodeValueQuery(targetNode, {
            statement: queryStatement,
            matchElements: queryMatchElements,
            whereElements: queryWhereElements,
            returnElements: queryReturnElements,
            endElements: queryEndElements,
            parameters: queryParameters
        });

        return {
            statement: instance.query.prefilter + queryStructure.statement,
            parameters: queryStructure.parameters
        };

    };

    /**
     * Generate a Cypher query to retrieve all the relation available for a given node.
     *
     * @param targetNode
     * @returns {string}
     */
    instance.query.generateNodeRelationQuery = function (targetNode) {

        var linksToRoot = instance.query.getLinksToRoot(targetNode, instance.graph.force.links());
        var queryElements = instance.query.generateQueryElements(instance.graph.getRootNode(), targetNode, linksToRoot, false);
        var queryMatchElements = queryElements.matchElements,
            queryWhereElements = queryElements.whereElements,
            queryReturnElements = [],
            queryEndElements = [],
            queryParameters = queryElements.parameters;

        var rel = instance.query.USE_RELATION_DIRECTION ? "->" : "-";

        queryMatchElements.push("(" + targetNode.internalLabel + ":`" + targetNode.label + "`)-[r]" + rel + "(x)");
        queryReturnElements.push("type(r) AS label");
        if (instance.query.USE_PARENT_RELATION) {
            queryReturnElements.push("head(labels(x)) AS target");
        } else {
            queryReturnElements.push("last(labels(x)) AS target");
        }
        queryReturnElements.push("count(r) AS count");
        queryEndElements.push("ORDER BY count(r) DESC");

        var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ") + " " + queryEndElements.join(" ");
        // Filter the query if defined in config
        var queryStructure = instance.provider.node.filterNodeRelationQuery(targetNode, {
            statement: queryStatement,
            matchElements: queryMatchElements,
            whereElements: queryWhereElements,
            returnElements: queryReturnElements,
            endElements: queryEndElements,
            parameters: queryParameters
        });

        return {
            statement: instance.query.prefilter + queryStructure.statement,
            parameters: queryStructure.parameters
        };

    };

    ///////////////////////////////////////////////////////////////////
    // Results

    instance.result = {};
    instance.result.containerId = "instance-results";
    instance.result.hasChanged = true;
    instance.result.resultCountListeners = [];
    instance.result.resultListeners = [];
    instance.result.graphResultListeners = [];
    instance.result.RESULTS_PAGE_SIZE = 10;

    /**
     * Register a listener to the result count event.
     * This listener will be called on evry result change with total result count.
     */
    instance.result.onTotalResultCount = function (listener) {
        instance.result.resultCountListeners.push(listener);
    };

    instance.result.onResultReceived = function (listener) {
        instance.result.resultListeners.push(listener);
    };

    instance.result.onGraphResultReceived = function (listener) {
        instance.result.graphResultListeners.push(listener);
    };

    /**
     * Parse REST returned Graph data and generate a list of nodes and edges.
     *
     * @param data
     * @returns {{nodes: Array, edges: Array}}
     */
    instance.result.parseGraphResultData = function (data) {

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

    instance.result.updateResults = function () {
        if (instance.result.hasChanged) {

            // Abort any old running request before starting a new one
            if (instance.result.resultsXhr !== undefined) {
                instance.result.resultsXhr.abort();
            }

            var query = instance.query.generateResultQuery();
            instance.result.lastGeneratedQuery = query;

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
            if (instance.result.graphResultListeners.length > 0) {
                var graphQuery = instance.query.generateResultQuery(true);
                instance.result.lastGeneratedQuery = graphQuery;

                postData.statements.push(
                    {
                        "statement": graphQuery.statement,
                        "parameters": graphQuery.parameters,
                        "resultDataContents": ["graph"]
                    });
            }

            instance.logger.info("Results ==>");

            instance.result.resultsXhr = instance.rest.post(postData)
                .done(function (response) {
                    instance.logger.info("<== Results");

                    var parsedData = instance.rest.response.parse(response);

                    var resultObjects = parsedData[0].map(function (d, i) {
                        return {
                            "resultIndex": i,
                            "label": instance.graph.getRootNode().label,
                            "attributes": d
                        };
                    });

                    instance.result.lastResults = resultObjects;

                    // Notify listeners
                    instance.result.resultListeners.forEach(function (listener) {
                        listener(resultObjects);
                    });

                    if (instance.result.graphResultListeners.length > 0) {
                        var graphResultObjects = instance.result.parseGraphResultData(response);
                        instance.result.graphResultListeners.forEach(function (listener) {
                            listener(graphResultObjects);
                        });
                    }

                    // Update displayed results only if needed ()
                    if (instance.result.isActive) {
                        // Clear all results
                        var results = d3.select("#" + instance.result.containerId).selectAll(".ppt-result").data([]);
                        results.exit().remove();
                        // Update data
                        results = d3.select("#" + instance.result.containerId).selectAll(".ppt-result").data(resultObjects.slice(0, instance.result.RESULTS_PAGE_SIZE), function (d) {
                            return d.resultIndex;
                        });

                        // Add new elements
                        var pElmt = results.enter()
                            .append("div")
                            .attr("class", "ppt-result")
                            .attr("id", function (d) {
                                return "instance-result-" + d.resultIndex;
                            });

                        // Generate results with providers
                        pElmt.each(function (d) {
                            instance.provider.node.getDisplayResults(d.label)(d3.select(this));
                        });
                    }

                    instance.result.hasChanged = false;
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    if (textStatus !== "abort") {
                        instance.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + instance.rest.CYPHER_URL + "\" defined in \"instance.rest.CYPHER_URL\" property: " + errorThrown);

                        // Notify listeners
                        instance.result.resultListeners.forEach(function (listener) {
                            listener([]);
                        });
                    } else {
                        instance.logger.info("<=X= Results - Aborted!");
                    }
                });
        }
    };

    instance.result.updateResultsCount = function () {
        // Update result counts with root node count
        if (instance.result.resultCountListeners.length > 0) {
            instance.result.resultCountListeners.forEach(function (listener) {
                listener(instance.graph.getRootNode().count);
            });
        }
    };

    instance.result.generatePreQuery = function () {
        var p = {"ids": []};

        instance.result.lastResults.forEach(function (d) {
            p.ids.push(d.attributes.id)
        });

        return {
            query: "MATCH (d) WHERE d.id IN $ids WITH d",
            param: p
        };
    };


    ///////////////////////////////////////////////////////////////////
    // VORONOI

    instance.graph.voronoi = d3.geom.voronoi()
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        });

    instance.graph.recenterVoronoi = function (nodes) {
        var shapes = [];

        var voronois = instance.graph.voronoi(nodes.map(function (d) {
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

    instance.provider = {};
    /**
     * Default color scale generator.
     * Used in getColor link and node providers.
     */
    instance.provider.colorScale = d3.scale.category20();
    instance.provider.link = {};
    instance.provider.link.Provider = {};
    instance.provider.taxonomy = {};
    instance.provider.taxonomy.Provider = {};
    instance.provider.node = {};
    instance.provider.node.Provider = {};

    //------------------------------------------------
    // LINKS

    /**
     *  Get the text representation of a link.
     *
     * @param link the link to get the text representation.
     * @returns {string} the text representation of the link.
     */
    instance.provider.link.getTextValue = function (link) {
        if (instance.provider.link.Provider.hasOwnProperty("getTextValue")) {
            return instance.provider.link.Provider.getTextValue(link);
        } else {
            if (instance.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getTextValue")) {
                return instance.provider.link.DEFAULT_PROVIDER.getTextValue(link);
            } else {
                instance.logger.error("No provider defined for link getTextValue");
            }
        }
    };

    instance.provider.link.getColor = function (link, element, attribute) {
        if (instance.provider.link.Provider.hasOwnProperty("getColor")) {
            return instance.provider.link.Provider.getColor(link, element, attribute);
        } else {
            if (instance.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getColor")) {
                return instance.provider.link.DEFAULT_PROVIDER.getColor(link, element, attribute);
            } else {
                instance.logger.error("No provider defined for getColor");
            }
        }
    };

    instance.provider.link.getCSSClass = function (link, element) {
        if (instance.provider.link.Provider.hasOwnProperty("getCSSClass")) {
            return instance.provider.link.Provider.getCSSClass(link, element);
        } else {
            if (instance.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getCSSClass")) {
                return instance.provider.link.DEFAULT_PROVIDER.getCSSClass(link, element);
            } else {
                instance.logger.error("No provider defined for getCSSClass");
            }
        }
    };

    instance.provider.link.getDistance = function (link) {
        if (instance.provider.link.Provider.hasOwnProperty("getDistance")) {
            return instance.provider.link.Provider.getDistance(link);
        } else {
            if (instance.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getDistance")) {
                return instance.provider.link.DEFAULT_PROVIDER.getDistance(link);
            } else {
                instance.logger.error("No provider defined for getDistance");
            }
        }
    };

    /**
     *  Get the semantic text representation of a link.
     *
     * @param link the link to get the semantic text representation.
     * @returns {string} the semantic text representation of the link.
     */
    instance.provider.link.getSemanticValue = function (link) {
        if (instance.provider.link.Provider.hasOwnProperty("getSemanticValue")) {
            return instance.provider.link.Provider.getSemanticValue(link);
        } else {
            if (instance.provider.link.DEFAULT_PROVIDER.hasOwnProperty("getSemanticValue")) {
                return instance.provider.link.DEFAULT_PROVIDER.getSemanticValue(link);
            } else {
                instance.logger.error("No provider defined for getSemanticValue");
            }
        }
    };

    instance.provider.colorLuminance = function (hex, lum) {

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
    instance.provider.link.DEFAULT_PROVIDER = {
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
            if (link.type === instance.graph.link.LinkTypes.VALUE) {
                // Links between node and list of values.

                if (instance.provider.node.isTextDisplayed(link.target)) {
                    // Don't display text on link if text is displayed on target node.
                    return "";
                } else {
                    // No text is displayed on target node then the text is displayed on link.
                    return instance.provider.node.getTextValue(link.target);
                }

            } else {
                var targetName = "";
                if (link.type === instance.graph.link.LinkTypes.SEGMENT) {
                    targetName = " " + instance.provider.node.getTextValue(link.target);
                }
                return link.label + targetName;
            }
        },


        /**
         *
         * @param link
         */
        "getDistance": function (link) {
            if (link.type === instance.graph.link.LinkTypes.VALUE) {
                return (13 / 8) * (instance.provider.node.getSize(link.source) + instance.provider.node.getSize(link.target));
            } else {
                return (20 / 8) * (instance.provider.node.getSize(link.source) + instance.provider.node.getSize(link.target));
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
            if (link.type === instance.graph.link.LinkTypes.VALUE) {
                return "#525863";
            } else {
                var colorId = link.source.label + link.label + link.target.label;

                var color = instance.provider.colorScale(colorId);
                if (attribute === "stroke") {
                    return instance.provider.colorLuminance(color, -0.2);
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

            if (link.type === instance.graph.link.LinkTypes.VALUE) {
                cssClass = cssClass + "--value";
            } else {
                var labelAsCSSName = "ppt-" + link.label.replace(/[^0-9a-z\-_]/gi, '');
                if (link.type === instance.graph.link.LinkTypes.RELATION) {
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
            return instance.provider.link.getTextValue(link);
        }
    };

    instance.provider.link.Provider = instance.provider.link.DEFAULT_PROVIDER;

    //------------------------------------------------
    // TAXONOMY

    /**
     *  Get the text representation of a taxonomy.
     *
     * @param label the label used for the taxonomy.
     * @returns {string} the text representation of the taxonomy.
     */
    instance.provider.taxonomy.getTextValue = function (label) {
        if (instance.provider.taxonomy.Provider.hasOwnProperty("getTextValue")) {
            return instance.provider.taxonomy.Provider.getTextValue(label);
        } else {
            if (instance.provider.taxonomy.DEFAULT_PROVIDER.hasOwnProperty("getTextValue")) {
                return instance.provider.taxonomy.DEFAULT_PROVIDER.getTextValue(label);
            } else {
                instance.logger.error("No provider defined for taxonomy getTextValue");
            }
        }
    };

    /**
     *
     * @param label
     * @param element
     * @return {*}
     */
    instance.provider.taxonomy.getCSSClass = function (label, element) {
        if (instance.provider.taxonomy.Provider.hasOwnProperty("getCSSClass")) {
            return instance.provider.taxonomy.Provider.getCSSClass(label, element);
        } else {
            if (instance.provider.taxonomy.DEFAULT_PROVIDER.hasOwnProperty("getCSSClass")) {
                return instance.provider.taxonomy.DEFAULT_PROVIDER.getCSSClass(label, element);
            } else {
                instance.logger.error("No provider defined for taxonomy getCSSClass");
            }
        }
    };

    /**
     * Label provider used by default if none have been defined for a label.
     * This provider can be changed if needed to customize default behavior.
     * If some properties are not found in user customized providers, default values will be extracted from this provider.
     */
    instance.provider.taxonomy.DEFAULT_PROVIDER = {
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

    instance.provider.taxonomy.Provider = instance.provider.taxonomy.DEFAULT_PROVIDER;

    /**
     * Define the different type of rendering of a node for a given label.
     * TEXT: default rendering type, the node will be displayed with an ellipse and a text in it.
     * IMAGE: the node is displayed as an image using the image tag in the svg graph.
     * In this case an image path is required.
     * SVG: the node is displayed using a list of svg path, each path can contain its own color.
     */
    instance.provider.node.DisplayTypes = Object.freeze({TEXT: 0, IMAGE: 1, SVG: 2, SYMBOL: 3});

    /**
     * Get the label provider for the given label.
     * If no provider is defined for the label:
     * First search in parent provider.
     * Then if not found will create one from default provider.
     *
     * @param label to retrieve the corresponding label provider.
     * @returns {object} corresponding label provider.
     */
    instance.provider.node.getProvider = function (label) {
        if (label === undefined) {
            instance.logger.error("Node label is undefined, no label provider can be found.");
        } else {
            if (instance.provider.node.Provider.hasOwnProperty(label)) {
                return instance.provider.node.Provider[label];
            } else {
                instance.logger.debug("No direct provider found for label " + label);

                // Search in all children list definitions to find the parent provider.
                for (var p in instance.provider.node.Provider) {
                    if (instance.provider.node.Provider.hasOwnProperty(p)) {
                        var provider = instance.provider.node.Provider[p];
                        if (provider.hasOwnProperty("children")) {
                            if (provider["children"].indexOf(label) > -1) {
                                instance.logger.debug("No provider is defined for label (" + label + "), parent (" + p + ") will be used");
                                // A provider containing the required label in its children definition has been found it will be cloned.

                                var newProvider = {"parent": p};
                                for (var pr in provider) {
                                    if (provider.hasOwnProperty(pr) && pr !== "children" && pr !== "parent") {
                                        newProvider[pr] = provider[pr];
                                    }
                                }

                                instance.provider.node.Provider[label] = newProvider;
                                return instance.provider.node.Provider[label];
                            }
                        }
                    }
                }

                instance.logger.debug("No label provider defined for label (" + label + ") default one will be created from instance.provider.node.DEFAULT_PROVIDER");

                instance.provider.node.Provider[label] = {};
                // Clone default provider properties in new provider.
                for (var prop in instance.provider.node.DEFAULT_PROVIDER) {
                    if (instance.provider.node.DEFAULT_PROVIDER.hasOwnProperty(prop)) {
                        instance.provider.node.Provider[label][prop] = instance.provider.node.DEFAULT_PROVIDER[prop];
                    }
                }
                return instance.provider.node.Provider[label];
            }
        }
    };

    /**
     * Get the property or function defined in node label provider.
     * If the property is not found search is done in parents.
     * If not found in parent, property defined in instance.provider.node.DEFAULT_PROVIDER is returned.
     * If not found in default provider, defaultValue is set and returned.
     *
     * @param label node label to get the property in its provider.
     * @param name name of the property to retrieve.
     * @returns {*} node property defined in its label provider.
     */
    instance.provider.node.getProperty = function (label, name) {
        var provider = instance.provider.node.getProvider(label);

        if (!provider.hasOwnProperty(name)) {
            var providerIterator = provider;

            // Check parents
            var isPropertyFound = false;
            while (providerIterator.hasOwnProperty("parent") && !isPropertyFound) {
                providerIterator = instance.provider.node.getProvider(providerIterator.parent);
                if (providerIterator.hasOwnProperty(name)) {

                    // Set attribute in child to optimize next call.
                    provider[name] = providerIterator[name];
                    isPropertyFound = true;
                }
            }

            if (!isPropertyFound) {
                instance.logger.debug("No \"" + name + "\" property found for node label provider (" + label + "), default value will be used");
                if (instance.provider.node.DEFAULT_PROVIDER.hasOwnProperty(name)) {
                    provider[name] = instance.provider.node.DEFAULT_PROVIDER[name];
                } else {
                    instance.logger.debug("No default value for \"" + name + "\" property found for label provider (" + label + ")");
                }
            }
        }
        return provider[name];
    };

    /**
     *
     * @param label
     */
    instance.provider.node.getIsAutoLoadValue = function (label) {
        return instance.provider.node.getProperty(label, "isAutoLoadValue");
    };

    /**
     * Return the "isSearchable" property for the node label provider.
     * Is Searchable defines whether the label can be used as graph query builder root.
     * If true the label can be displayed in the taxonomy filter.
     *
     * @param label
     * @returns boolean
     */
    instance.provider.node.getIsSearchable = function (label) {
        return instance.provider.node.getProperty(label, "isSearchable");
    };

    /**
     * Return the "autoExpandRelations" property for the node label provider.
     * Auto expand relations defines whether the label will automatically add its relations when displayed on graph.
     *
     * @param label
     * @returns boolean
     */
    instance.provider.node.getIsAutoExpandRelations = function (label) {
        return instance.provider.node.getProperty(label, "autoExpandRelations");
    };

    instance.provider.node.getSchema = function (label) {
        return instance.provider.node.getProperty(label, "schema");
    };

    /**
     * Return the list of attributes defined in node label provider.
     * Parents return attributes are also returned.
     *
     * @param label used to retrieve parent attributes.
     * @returns {Array} list of return attributes for a node.
     */
    instance.provider.node.getReturnAttributes = function (label) {
        var provider = instance.provider.node.getProvider(label);
        var attributes = {}; // Object is used as a Set to merge possible duplicate in parents

        if (provider.hasOwnProperty("returnAttributes")) {
            for (var i = 0; i < provider.returnAttributes.length; i++) {
                if (provider.returnAttributes[i] === instance.query.NEO4J_INTERNAL_ID) {
                    attributes[instance.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
                } else {
                    attributes[provider.returnAttributes[i]] = true;
                }
            }
        }

        // Add parent attributes
        while (provider.hasOwnProperty("parent")) {
            provider = instance.provider.node.getProvider(provider.parent);
            if (provider.hasOwnProperty("returnAttributes")) {
                for (var j = 0; j < provider.returnAttributes.length; j++) {
                    if (provider.returnAttributes[j] === instance.query.NEO4J_INTERNAL_ID) {
                        attributes[instance.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
                    } else {
                        attributes[provider.returnAttributes[j]] = true;
                    }
                }
            }
        }

        // Add default provider attributes if any but not internal id as this id is added only if none has been found.
        if (instance.provider.node.DEFAULT_PROVIDER.hasOwnProperty("returnAttributes")) {
            for (var k = 0; k < instance.provider.node.DEFAULT_PROVIDER.returnAttributes.length; k++) {
                if (instance.provider.node.DEFAULT_PROVIDER.returnAttributes[k] !== instance.query.NEO4J_INTERNAL_ID) {
                    attributes[instance.provider.node.DEFAULT_PROVIDER.returnAttributes[k]] = true;
                }
            }
        }

        // Add constraint attribute in the list
        var constraintAttribute = instance.provider.node.getConstraintAttribute(label);
        if (constraintAttribute === instance.query.NEO4J_INTERNAL_ID) {
            attributes[instance.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
        } else {
            attributes[constraintAttribute] = true;
        }


        // Add all in array
        var attrList = [];
        for (var attr in attributes) {
            if (attributes.hasOwnProperty(attr)) {
                if (attr === instance.query.NEO4J_INTERNAL_ID.queryInternalName) {
                    attrList.push(instance.query.NEO4J_INTERNAL_ID);
                } else {
                    attrList.push(attr);
                }
            }
        }

        // If no attributes have been found internal ID is used
        if (attrList.length <= 0) {
            attrList.push(instance.query.NEO4J_INTERNAL_ID);
        }
        return attrList;
    };

    /**
     * Return the attribute to use as constraint attribute for a node defined in its label provider.
     *
     * @param label
     * @returns {*}
     */
    instance.provider.node.getConstraintAttribute = function (label) {
        return instance.provider.node.getProperty(label, "constraintAttribute");
    };

    instance.provider.node.getDisplayAttribute = function (label) {
        var displayAttribute = instance.provider.node.getProperty(label, "displayAttribute");

        if (displayAttribute === undefined) {
            var returnAttributes = instance.provider.node.getReturnAttributes(label);
            if (returnAttributes.length > 0) {
                displayAttribute = returnAttributes[0];
            } else {
                displayAttribute = instance.provider.node.getConstraintAttribute(label);
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
    instance.provider.node.getPredefinedConstraints = function (label) {
        return instance.provider.node.getProperty(label, "getPredefinedConstraints")();
    };

    instance.provider.node.filterResultQuery = function (label, initialQuery) {
        return instance.provider.node.getProperty(label, "filterResultQuery")(initialQuery);
    };

    instance.provider.node.getValueOrderByAttribute = function (label) {
        return instance.provider.node.getProperty(label, "valueOrderByAttribute");
    };

    instance.provider.node.isValueOrderAscending = function (label) {
        return instance.provider.node.getProperty(label, "isValueOrderAscending");
    };

    instance.provider.node.getResultOrderByAttribute = function (label) {
        return instance.provider.node.getProperty(label, "resultOrderByAttribute");
    };

    /**
     *
     * @param label
     */
    instance.provider.node.isResultOrderAscending = function (label) {
        return instance.provider.node.getProperty(label, "isResultOrderAscending");
    };

    /**
     * Return the value of the getTextValue function defined in the label provider corresponding to the parameter node.
     * If no "getTextValue" function is defined in the provider, search is done in parents.
     * If none is found in parent default provider method is used.
     *
     * @param node
     * @param parameter
     */
    instance.provider.node.getTextValue = function (node, parameter) {
        return instance.provider.node.getProperty(node.label, "getTextValue")(node, parameter);
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
    instance.provider.node.getSemanticValue = function (node) {
        return instance.provider.node.getProperty(node.label, "getSemanticValue")(node);
    };

    /**
     * Return a list of SVG paths objects, each defined by a "d" property containing the path and "f" property for the color.
     *
     * @param node
     * @returns {*}
     */
    instance.provider.node.getSVGPaths = function (node) {
        return instance.provider.node.getProperty(node.label, "getSVGPaths")(node);
    };

    /**
     * Check in label provider if text must be displayed with images nodes.
     * @param node
     * @returns {*}
     */
    instance.provider.node.isTextDisplayed = function (node) {
        return instance.provider.node.getProperty(node.label, "getIsTextDisplayed")(node);
    };

    /**
     *
     * @param node
     */
    instance.provider.node.getSize = function (node) {
        return instance.provider.node.getProperty(node.label, "getSize")(node);
    };

    /**
     * Return the getColor property.
     *
     * @param node
     * @param style
     * @returns {*}
     */
    instance.provider.node.getColor = function (node, style) {
        return instance.provider.node.getProperty(node.label, "getColor")(node, style);
    };

    /**
     *
     * @param node
     * @param element
     */
    instance.provider.node.getCSSClass = function (node, element) {
        return instance.provider.node.getProperty(node.label, "getCSSClass")(node, element);
    };

    /**
     * Return the getIsGroup property.
     *
     * @param node
     * @returns {*}
     */
    instance.provider.node.getIsGroup = function (node) {
        return instance.provider.node.getProperty(node.label, "getIsGroup")(node);
    };

    /**
     * Return the node display type.
     * can be TEXT, IMAGE, SVG or GROUP.
     *
     * @param node
     * @returns {*}
     */
    instance.provider.node.getNodeDisplayType = function (node) {
        return instance.provider.node.getProperty(node.label, "getDisplayType")(node);
    };

    /**
     * Return the file path of the image defined in the provider.
     *
     * @param node the node to get the image path.
     * @returns {string} the path of the node image.
     */
    instance.provider.node.getImagePath = function (node) {
        return instance.provider.node.getProperty(node.label, "getImagePath")(node);
    };

    /**
     * Return the width size of the node image.
     *
     * @param node the node to get the image width.
     * @returns {int} the image width.
     */
    instance.provider.node.getImageWidth = function (node) {
        return instance.provider.node.getProperty(node.label, "getImageWidth")(node);
    };

    /**
     * Return the height size of the node image.
     *
     * @param node the node to get the image height.
     * @returns {int} the image height.
     */
    instance.provider.node.getImageHeight = function (node) {
        return instance.provider.node.getProperty(node.label, "getImageHeight")(node);
    };

    instance.provider.node.filterNodeValueQuery = function (node, initialQuery) {
        return instance.provider.node.getProperty(node.label, "filterNodeValueQuery")(node, initialQuery);
    };

    instance.provider.node.filterNodeCountQuery = function (node, initialQuery) {
        return instance.provider.node.getProperty(node.label, "filterNodeCountQuery")(node, initialQuery);
    };

    instance.provider.node.filterNodeRelationQuery = function (node, initialQuery) {
        return instance.provider.node.getProperty(node.label, "filterNodeRelationQuery")(node, initialQuery);
    };

    /**
     * Return the displayResults function defined in label parameter's provider.
     *
     * @param label
     * @returns {*}
     */
    instance.provider.node.getDisplayResults = function (label) {
        return instance.provider.node.getProperty(label, "displayResults");
    };

    /**
     * Label provider used by default if none have been defined for a label.
     * This provider can be changed if needed to customize default behavior.
     * If some properties are not found in user customized providers, default
     * values will be extracted from this provider.
     */
    instance.provider.node.DEFAULT_PROVIDER = (
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
            "returnAttributes": [instance.query.NEO4J_INTERNAL_ID],

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
            "constraintAttribute": instance.query.NEO4J_INTERNAL_ID,

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
             * for "Person" nodes everywhere in instance.js the generated Cypher
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
             * instance.provider.node.DisplayTypes.IMAGE
             *  In this case the node will be drawn as an image and "getImagePath"
             *  function is required to return the node image path.
             *
             * instance.provider.node.DisplayTypes.SVG
             *  In this case the node will be drawn as SVG paths and "getSVGPaths"
             *
             * instance.provider.node.DisplayTypes.TEXT
             *  In this case the node will be drawn as a simple circle.
             *
             * Default value is TEXT.
             *
             * @param node the node to extract its type.
             * @returns {number} one value from instance.provider.node.DisplayTypes
             */
            "getDisplayType": function (node) {
                return instance.provider.node.DisplayTypes.TEXT;
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
                if (node.type === instance.graph.node.NodeTypes.VALUE) {
                    return instance.provider.node.getColor(node.parent);
                } else {
                    var parentLabel = "";
                    if (node.hasOwnProperty("parent")) {
                        parentLabel = node.parent.label
                    }

                    var incomingRelation = node.parentRel || "";

                    var colorId = parentLabel + incomingRelation + node.label;
                    return instance.provider.colorScale(colorId);
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

                if (node.type === instance.graph.node.NodeTypes.ROOT) {
                    cssClass = cssClass + "--root";
                }
                if (node.type === instance.graph.node.NodeTypes.CHOOSE) {
                    cssClass = cssClass + "--choose";
                }
                if (node.type === instance.graph.node.NodeTypes.GROUP) {
                    cssClass = cssClass + "--group";
                }
                if (node.type === instance.graph.node.NodeTypes.VALUE) {
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
             * instance.graph.node.NODE_MAX_CHARS property.
             *
             * @param node the node to represent as text.
             * @param maxLength used to truncate the text.
             * @returns {string} the text representation of the node.
             */
            "getTextValue": function (node, maxLength) {
                var text = "";
                var displayAttr = instance.provider.node.getDisplayAttribute(node.label);
                if (node.type === instance.graph.node.NodeTypes.VALUE) {
                    if (displayAttr === instance.query.NEO4J_INTERNAL_ID) {
                        text = "" + node.internalID;
                    } else {
                        text = "" + node.attributes[displayAttr];
                    }
                } else {
                    if (node.value !== undefined && node.value.length > 0) {
                        if (displayAttr === instance.query.NEO4J_INTERNAL_ID) {
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
                var displayAttr = instance.provider.node.getDisplayAttribute(node.label);
                if (node.type === instance.graph.node.NodeTypes.VALUE) {
                    if (displayAttr === instance.query.NEO4J_INTERNAL_ID) {
                        text = "" + node.internalID;
                    } else {
                        text = "" + node.attributes[displayAttr];
                    }
                } else {
                    if (node.value !== undefined && node.value.length > 0) {
                        if (displayAttr === instance.query.NEO4J_INTERNAL_ID) {
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
             * This function is only used for instance.provider.node.DisplayTypes.IMAGE
             * type nodes.
             *
             * @param node
             * @returns {string}
             */
            "getImagePath": function (node) {
                // if (node.type === instance.graph.node.NodeTypes.VALUE) {
                //     var constraintAttribute = instance.provider.node.getConstraintAttribute(node.label);
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
                var size = instance.provider.node.getSize(node);
                return [
                    {
                        "d": "M 0, 0 m -" + size + ", 0 a " + size + "," + size + " 0 1,0 " + 2 * size + ",0 a " + size + "," + size + " 0 1,0 -" + 2 * size + ",0",
                        "fill": "transparent",
                        "stroke": instance.provider.node.getColor(node),
                        "stroke-width": "2px"
                    }
                ];
            },

            /**
             * Function returning the image width of the node.
             * This function is only used for instance.provider.node.DisplayTypes.IMAGE
             * type nodes.
             *
             * @param node
             * @returns {number}
             */
            "getImageWidth": function (node) {
                return instance.provider.node.getSize(node) * 2;
            },

            /**
             * Function returning the image height of the node.
             * This function is only used for instance.provider.node.DisplayTypes.IMAGE
             * type nodes.
             *
             * @param node
             * @returns {number}
             */
            "getImageHeight": function (node) {
                return instance.provider.node.getSize(node) * 2;
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

                var returnAttributes = instance.provider.node.getReturnAttributes(result.label);

                var table = pElmt.append("table").attr("class", "ppt-result-table");

                returnAttributes.forEach(function (attribute) {
                    var attributeName = attribute;

                    if (instance.query.NEO4J_INTERNAL_ID === attribute) {
                        attributeName = instance.query.NEO4J_INTERNAL_ID.queryInternalName;
                    }

                    var tr = table.append("tr");
                    tr.append("th").text(function () {
                        if (attribute === instance.query.NEO4J_INTERNAL_ID) {
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

    return instance;
}




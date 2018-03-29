import {default as d3} from "d3";
import {version} from "../dist/package";
import logger from "./logger/logger";
import rest from "./rest/rest";
import result from "./result/result";
import taxonomy from "./taxonomy/taxonomy";
import graph from "./graph/graph";
import provider from "./provider/provider";
import queryviewer from "./queryviewer/queryviewer";
import cypherviewer from "./cypherviewer/cypherviewer";

/**
 * Main function to call to use Popoto.js.
 * This function will create all the HTML content based on available IDs in the page.
 *
 * @param startParam Root label or graph schema to use in the graph query builder.
 */
//TODO add instance creation + config
export function start(startParam) {
    logger.info("Popoto " + version + " start on " + startParam);

    graph.mainLabel = startParam;

    if (rest.CYPHER_URL === undefined) {
        logger.error("popoto.rest.CYPHER_URL is not set but is required.");
    } else {
        // TODO introduce component generator mechanism instead for future plugin extensions
        checkHtmlComponents();

        if (taxonomy.isActive) {
            taxonomy.createTaxonomyPanel();
        }

        if (graph.isActive) {
            graph.createGraphArea();
            graph.createForceLayout();

            if (typeof startParam === 'string' || startParam instanceof String) {
                var labelSchema = provider.node.getSchema(startParam);
                if (labelSchema !== undefined) {
                    graph.addSchema(labelSchema);
                } else {
                    graph.addRootNode(startParam);
                }
            } else {
                graph.addSchema(startParam);
            }
        }

        if (queryviewer.isActive) {
            queryviewer.createQueryArea();
        }

        if (cypherviewer.isActive) {
            cypherviewer.createQueryArea();
        }

        update();
    }
}

/**
 * Check in the HTML page the components to generate.
 */
function checkHtmlComponents() {
    var graphHTMLContainer = d3.select("#" + graph.containerId);
    var taxonomyHTMLContainer = d3.select("#" + taxonomy.containerId);
    var queryHTMLContainer = d3.select("#" + queryviewer.containerId);
    var cypherHTMLContainer = d3.select("#" + cypherviewer.containerId);
    var resultsHTMLContainer = d3.select("#" + result.containerId);

    if (graphHTMLContainer.empty()) {
        logger.debug("The page doesn't contain a container with ID = \"" + graph.containerId + "\" no graph area will be generated. This ID is defined in graph.containerId property.");
        graph.isActive = false;
    } else {
        graph.isActive = true;
    }

    if (taxonomyHTMLContainer.empty()) {
        logger.debug("The page doesn't contain a container with ID = \"" + taxonomy.containerId + "\" no taxonomy filter will be generated. This ID is defined in taxonomy.containerId property.");
        taxonomy.isActive = false;
    } else {
        taxonomy.isActive = true;
    }

    if (queryHTMLContainer.empty()) {
        logger.debug("The page doesn't contain a container with ID = \"" + queryviewer.containerId + "\" no query viewer will be generated. This ID is defined in queryviewer.containerId property.");
        queryviewer.isActive = false;
    } else {
        queryviewer.isActive = true;
    }

    if (cypherHTMLContainer.empty()) {
        logger.debug("The page doesn't contain a container with ID = \"" + cypherviewer.containerId + "\" no cypher query viewer will be generated. This ID is defined in cypherviewer.containerId property.");
        cypherviewer.isActive = false;
    } else {
        cypherviewer.isActive = true;
    }

    if (resultsHTMLContainer.empty()) {
        logger.debug("The page doesn't contain a container with ID = \"" + result.containerId + "\" no result area will be generated. This ID is defined in result.containerId property.");
        result.isActive = false;
    } else {
        result.isActive = true;
    }
}

/**
 * Function to call to update all the generated elements including svg graph, query viewer and generated results.
 */
export function update() {
    updateGraph();

    // Do not update if rootNode is not valid.
    var root = graph.getRootNode();
    if (!root || root.label === undefined) {
        return;
    }

    if (queryviewer.isActive) {
        queryviewer.updateQuery();
    }
    if (cypherviewer.isActive) {
        cypherviewer.updateQuery();
    }
    // Results are updated only if needed.
    // If id found in html page or if result listeners have been added.
    // In this case the query must be executed.
    if (result.isActive || result.resultListeners.length > 0 || result.resultCountListeners.length > 0 || result.graphResultListeners.length > 0) {
        result.updateResults();
    }
}

/**
 * Function to call to update the graph only.
 */
export function updateGraph() {
    if (graph.isActive) {
        // Starts the D3.js force simulation.
        // This method must be called when the layout is first created, after assigning the nodes and links.
        // In addition, it should be called again whenever the nodes or links change.
        graph.force.start();
        graph.link.updateLinks();
        graph.node.updateNodes();
    }
};
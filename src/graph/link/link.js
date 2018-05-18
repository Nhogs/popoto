import * as d3 from "d3";
import result from "../../result/result";
import cypherviewer from "../../cypherviewer/cypherviewer";
import graph from "../graph";
import provider from "../../provider/provider";
import dataModel from "../../datamodel/dataModel";
import {update} from "../../popoto";
import queryviewer from "../../queryviewer/queryviewer";

var link = {};

/**
 * Defines the different type of link.
 * RELATION is a relation link between two nodes.
 * VALUE is a link between a generic node and a value.
 */
link.LinkTypes = Object.freeze({RELATION: 0, VALUE: 1, SEGMENT: 2});

/**
 * Offset added to text displayed on links.
 * @type {number}
 */
link.TEXT_DY = -4;

/**
 * Define whether or not to display path markers.
 */
link.SHOW_MARKER = false;

// ID of the g element in SVG graph containing all the link elements.
link.gID = "popoto-glinks";

/**
 * Function to call to update the links after modification in the model.
 * This function will update the graph with all removed, modified or added links using d3.js mechanisms.
 */
link.updateLinks = function () {
    var data = link.updateData();
    link.removeElements(data.exit());
    link.addNewElements(data.enter());
    link.updateElements();
};

/**
 * Update the links element with data coming from dataModel.links.
 */
link.updateData = function () {
    return graph.svg.select("#" + link.gID).selectAll(".ppt-glink").data(dataModel.links, function (d) {
        return d.id;
    });
};

/**
 * Clean links elements removed from the list.
 */
link.removeElements = function (exitingData) {
    exitingData.remove();
};

/**
 * Create new elements.
 */
link.addNewElements = function (enteringData) {

    var newLinkElements = enteringData.append("g")
        .attr("class", "ppt-glink")
        .on("click", link.clickLink)
        .on("mouseover", link.mouseOverLink)
        .on("mouseout", link.mouseOutLink);

    newLinkElements.append("path")
        .attr("class", "ppt-link");

    newLinkElements.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", link.TEXT_DY)
        .append("textPath")
        .attr("class", "ppt-textPath")
        .attr("startOffset", "50%");
};

/**
 * Update all the elements (new + modified)
 */
link.updateElements = function () {
    var toUpdateElem = graph.svg.select("#" + link.gID).selectAll(".ppt-glink");

    toUpdateElem
        .attr("id", function (d) {
            return "ppt-glink_" + d.id;
        });

    toUpdateElem.selectAll(".ppt-link")
        .attr("id", function (d) {
            return "ppt-path_" + d.id
        })
        .attr("stroke", function (d) {
            return provider.link.getColor(d, "path", "stroke");
        })
        .attr("class", function (link) {
            return "ppt-link " + provider.link.getCSSClass(link, "path")
        });

    // Due to a bug on webkit browsers (as of 30/01/2014) textPath cannot be selected
    // To workaround this issue the selection is done with its associated css class
    toUpdateElem.selectAll("text")
        .attr("id", function (d) {
            return "ppt-text_" + d.id
        })
        .attr("class", function (link) {
            return provider.link.getCSSClass(link, "text")
        })
        .attr("fill", function (d) {
            return provider.link.getColor(d, "text", "fill");
        })
        .selectAll(".ppt-textPath")
        .attr("id", function (d) {
            return "ppt-textpath_" + d.id;
        })
        .attr("class", function (link) {
            return "ppt-textpath " + provider.link.getCSSClass(link, "text-path")
        })
        .attr("xlink:href", function (d) {
            return "#ppt-path_" + d.id;
        })
        .text(function (d) {
            return provider.link.getTextValue(d);
        });
};

/**
 * Function called when mouse is over the link.
 * This function is used to change the CSS class on hover of the link and query viewer element.
 *
 * TODO try to introduce event instead of directly access query spans here. This could be used in future extensions.
 */
link.mouseOverLink = function () {
    d3.select(this)
        .select("path")
        .attr("class", function (link) {
            return "ppt-link " + provider.link.getCSSClass(link, "path--hover")
        });

    d3.select(this).select("text")
        .attr("class", function (link) {
            return provider.link.getCSSClass(link, "text--hover")
        });

    var hoveredLink = d3.select(this).data()[0];

    if (queryviewer.isActive) {
        queryviewer.queryConstraintSpanElements.filter(function (d) {
            return d.ref === hoveredLink;
        }).classed("hover", true);
        queryviewer.querySpanElements.filter(function (d) {
            return d.ref === hoveredLink;
        }).classed("hover", true);
    }

    if (cypherviewer.isActive) {
        cypherviewer.querySpanElements.filter(function (d) {
            return d.link === hoveredLink;
        }).classed("hover", true);
    }
};

/**
 * Function called when mouse goes out of the link.
 * This function is used to reinitialize the CSS class of the link and query viewer element.
 */
link.mouseOutLink = function () {
    d3.select(this)
        .select("path")
        .attr("class", function (link) {
            return "ppt-link " + provider.link.getCSSClass(link, "path")
        });

    d3.select(this).select("text")
        .attr("class", function (link) {
            return provider.link.getCSSClass(link, "text")
        });

    var hoveredLink = d3.select(this).data()[0];

    if (queryviewer.isActive) {
        queryviewer.queryConstraintSpanElements.filter(function (d) {
            return d.ref === hoveredLink;
        }).classed("hover", false);
        queryviewer.querySpanElements.filter(function (d) {
            return d.ref === hoveredLink;
        }).classed("hover", false);
    }

    if (cypherviewer.isActive) {
        cypherviewer.querySpanElements.filter(function (d) {
            return d.link === hoveredLink;
        }).classed("hover", false);
    }
};

// Delete all related nodes from this link
link.clickLink = function () {
    var clickedLink = d3.select(this).data()[0];

    if (clickedLink.type !== link.LinkTypes.VALUE) {
        // Collapse all expanded choose nodes first to avoid having invalid displayed value node if collapsed relation contains a value.
        graph.node.collapseAllNode();

        var willChangeResults = graph.node.removeNode(clickedLink.target);

        graph.hasGraphChanged = true;
        result.hasChanged = willChangeResults;
        update();
    }

};

export default link;
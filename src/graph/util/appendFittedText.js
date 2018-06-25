import * as d3 from "d3";
import toFunction from "./toFunction";

var CONTEXT_2D = document.createElement("canvas").getContext("2d");
var DEFAULT_CANVAS_LINE_HEIGHT = 12;

export function measureTextWidth(text) {
    return CONTEXT_2D.measureText(text).width;
}

/**
 * Compute the radius of the circle wrapping all the lines.
 *
 * @param lines array of text lines
 * @return {number}
 */
function computeTextRadius(lines) {
    var textRadius = 0;

    for (var i = 0, n = lines.length; i < n; ++i) {
        var dx = lines[i].width / 2;
        var dy = (Math.abs(i - n / 2 + 0.5) + 0.5) * DEFAULT_CANVAS_LINE_HEIGHT;
        textRadius = Math.max(textRadius, Math.sqrt(dx * dx + dy * dy));
    }

    return textRadius;
}

function computeLines(words, targetWidth) {
    var line;
    var lineWidth0 = Infinity;
    var lines = [];

    for (var i = 0, n = words.length; i < n; ++i) {
        var lineText1 = (line ? line.text + " " : "") + words[i];
        var lineWidth1 = measureTextWidth(lineText1);
        if ((lineWidth0 + lineWidth1) / 2 < targetWidth) {
            line.width = lineWidth0 = lineWidth1;
            line.text = lineText1;
        } else {
            lineWidth0 = measureTextWidth(words[i]);
            line = {width: lineWidth0, text: words[i]};
            lines.push(line);
        }
    }

    return lines;
}

function computeTargetWidth(text) {
    return Math.sqrt(measureTextWidth(text.trim()) * DEFAULT_CANVAS_LINE_HEIGHT);
}

/**
 * Split text into words.
 *
 * @param text
 * @return {*|string[]}
 */
function computeWords(text) {
    var words = text.split(/\s+/g); // To hyphenate: /\s+|(?<=-)/
    if (!words[words.length - 1]) words.pop();
    if (!words[0]) words.shift();
    return words;
}

/**
 * Inspired by https://beta.observablehq.com/@mbostock/fit-text-to-circle
 * Extract words from the text and group them by lines to fit a circle.
 *
 * @param text
 * @returns {*}
 */
export function extractLines(text) {
    if (text === undefined || text === null) {
        return [];
    }

    var textString = String(text);

    var words = computeWords(textString);
    var targetWidth = computeTargetWidth(textString);

    return computeLines(words, targetWidth);
}

function createTextElements(selection, getClass) {
    selection.each(function (d) {
        var text = d3.select(this)
            .selectAll(".fitted-text")
            .data([{}]);

        text.enter()
            .append("text")
            .merge(text)
            .attr("class", "fitted-text" + (getClass !== undefined ? " " + getClass(d) : ""))
            .attr("style", "text-anchor: middle; font: 10px sans-serif");
    });
}

function createSpanElements(text, getText) {
    text.each(function (fitData) {
        var lines = extractLines(getText(fitData));
        var span = d3.select(this).selectAll("tspan")
            .data(lines);

        span.exit().remove();

        span.enter()
            .append("tspan")
            .merge(span)
            .attr("x", 0)
            .attr("y", function (d, i) {
                var lineCount = lines.length;
                return (i - lineCount / 2 + 0.8) * DEFAULT_CANVAS_LINE_HEIGHT
            })
            .text(function (d) {
                return d.text
            });
    });
}

/**
 * Create the text representation of a node by slicing the text into lines to fit the node.
 *
 * @param selection
 * @param textParam
 * @param radiusParam
 * @param classParam
 */
export default function appendFittedText(selection, textParam, radiusParam, classParam) {
    var getRadius = toFunction(radiusParam);
    var getText = toFunction(textParam);
    var getClass = classParam ? toFunction(classParam) : classParam;

    createTextElements(selection, getClass);

    var text = selection.select(".fitted-text");

    createSpanElements(text, getText);

    text.attr("transform", function (d) {
        var lines = extractLines(getText(d));
        var textRadius = computeTextRadius(lines);

        var scale = 1;
        if (textRadius !== 0 && textRadius) {
            scale = getRadius(d) / textRadius;
        }
        return "translate(" + 0 + "," + 0 + ")" + " scale(" + scale + ")"
    });
}
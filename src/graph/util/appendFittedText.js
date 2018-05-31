import * as d3 from "d3";

var CONTEXT_2D = document.createElement("canvas").getContext("2d");
var DEFAULT_CANVAS_LINE_HEIGHT = 12;

export function measureTextWidth(text) {
    return CONTEXT_2D.measureText(text).width;
}

/**
 * Inspired by https://beta.observablehq.com/@mbostock/fit-text-to-circle
 * TODO: Clean getLines return and corresponding data.
 * @param text
 * @returns {*}
 */
export function getLines(text) {
    if (text === undefined || text === null) {
        return {lines: []}
    }

    var text = String(text);

    var words = text.split(/\s+/g); // To hyphenate: /\s+|(?<=-)/
    if (!words[words.length - 1]) words.pop();
    if (!words[0]) words.shift();

    var targetWidth = Math.sqrt(measureTextWidth(text.trim()) * DEFAULT_CANVAS_LINE_HEIGHT);

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

    var textRadius = 0;

    for (var i = 0, n = lines.length; i < n; ++i) {
        var dy = (Math.abs(i - n / 2 + 0.5) + 0.5) * DEFAULT_CANVAS_LINE_HEIGHT;
        var dx = lines[i].width / 2;
        textRadius = Math.max(textRadius, Math.sqrt(dx * dx + dy * dy));
    }

    return {
        "lines": lines.map(function (d) {
            return {"text": d.text, "linesLength": lines.length}
        }),
        "textRadius": textRadius
    }
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
    var getRadius = typeof radiusParam === "function"
        ? radiusParam
        : function () {
            return radiusParam
        };

    var getText = typeof textParam === "function"
        ? textParam
        : function () {
            return textParam
        };

    var getClass = typeof classParam === "function"
        ? classParam
        : function () {
            return classParam?classParam:""
        };

    selection.each(function (d) {
        d3.select(this)
            .selectAll(".fitted-text")
            .data([{}])
            .enter()
            .append("text")
            .attr("class", getClass(d) + " fitted-text")
            .attr("style", "text-anchor: middle; font: 10px sans-serif");
    });

    var text = selection.select(".fitted-text");

    text.datum(function (d) {
        var lines = getLines(getText(d));
        d.lines = lines.lines;
        d.textRadius = lines.textRadius;
        return d
    });

    text.selectAll("tspan")
        .data(function (d) {return d.lines})
        .enter()
        .append("tspan")
        .attr("x", 0)
        .attr("y", function (d,i) { return (i - d.linesLength / 2 + 0.8) * DEFAULT_CANVAS_LINE_HEIGHT})
        .text(function(d) {return d.text});

    text.attr("transform", function (d) {
        var scale = 1;
        if (d.textRadius !== 0 && d.textRadius) {
            scale = getRadius(d) / d.textRadius;
        }
        return "translate(" + 0 + "," + 0 + ")" + " scale(" + scale + ")"
    });
}
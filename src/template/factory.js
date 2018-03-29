import {default as d3} from "d3";

var factory = (function () {
    'use strict';

    var self = {};

    var instances = [];

    self.getInstances = function () {
        return instances;
    };

    self.create = function (containerId, config) {
        var instance = {};

        instance.margin = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };

        instance.container = d3.select("#" + containerId);

        instance.width = config.width || 600;
        instance.height = config.height || 300;

        instance.svg = instance.container.append("svg")
            .attr("viewBox", "0 0 " + instance.width + " " + instance.height);

        instance.svg.append("circle")
            .attr("cx", 300)
            .attr("cy", 150)
            .attr("r", 100)
            .style("fill", "purple");

        instances.push(instance);
        return instance;
    };

    return self;
})();

export default factory;
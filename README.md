<p align="center"><a href="https://github.com/Nhogs/popoto" target="_blank"><img alt="popoto logo" width="301" src="https://raw.githubusercontent.com/wiki/Nhogs/popoto/img/logo.png"></a></p>

[![CI](https://github.com/nhogs/popoto/actions/workflows/ci.yml/badge.svg)](https://github.com/Nhogs/popoto/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/popoto.svg)](https://www.npmjs.com/package/popoto)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Maintainability](https://api.codeclimate.com/v1/badges/d00736e10d4c630c2010/maintainability)](https://codeclimate.com/github/Nhogs/popoto/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/d00736e10d4c630c2010/test_coverage)](https://codeclimate.com/github/Nhogs/popoto/test_coverage)

[Popoto.js](https://github.com/Nhogs/popoto) is a JavaScript library built with [D3.js](https://d3js.org) designed to create interactive and customizable visual query builder for [Neo4j](https://neo4j.com) graph databases.

The graph queries are translated into Cypher and run on the database. Popoto also helps to display and customize the results.

An application is composed of various components, each one can be included independently anywhere in a web application.
It just needs to be bound to a container ID in an HTML page and the content will be generated automatically.

A common example application contains the following components: 

<p align="center"><a href="https://github.com/Nhogs/popoto/wiki"><img src="https://raw.githubusercontent.com/wiki/Nhogs/popoto/img/main-eclate.png"></a></p>

<table width="100%">
    <tr valign="middle">
        <td width="50px" align="center"><a href="https://github.com/Nhogs/popoto/wiki/Graph"><img src="https://raw.githubusercontent.com/wiki/Nhogs/popoto/img/count/1.png"></a></td>
        <td width="*"><a href="https://github.com/Nhogs/popoto/wiki/Graph"><b>Graph</b></a> component is an interactive interface designed to build queries for non technical users, the graph is made of selectable nodes connected to each other by links.</td>
    </tr>
    <tr valign="middle">
        <td  width="50px" align="center"><a href="https://github.com/Nhogs/popoto/wiki/Toolbar"><img src="https://raw.githubusercontent.com/wiki/Nhogs/popoto/img/count/2.png"></a></td>
        <td width="*"><a href="https://github.com/Nhogs/popoto/wiki/Toolbar"><b>Toolbar</b></a> is a list of actions available in the graph container.</td>
    </tr>
    <tr valign="middle">
        <td width="50px" align="center"><a href="https://github.com/Nhogs/popoto/wiki/Taxonomy"><img src="https://raw.githubusercontent.com/wiki/Nhogs/popoto/img/count/3.png"></a></td>
        <td width="*"><a href="https://github.com/Nhogs/popoto/wiki/Taxonomy"><b>Taxonomy</b></a> container contains the list of searchable labels in the database.</td>
    </tr>
    <tr valign="middle">
        <td width="50px" align="center"><a href="https://github.com/Nhogs/popoto/wiki/Query"><img src="https://raw.githubusercontent.com/wiki/Nhogs/popoto/img/count/4.png"></a></td>
        <td width="*"><a href="https://github.com/Nhogs/popoto/wiki/Query"><b>Query</b></a> viewers container shows different representation of the corresponding query defined in the Graph component.</td>
    </tr>
    <tr valign="middle">
        <td width="50px" align="center"><a href="https://github.com/Nhogs/popoto/wiki/Result"><img src="https://raw.githubusercontent.com/wiki/Nhogs/popoto/img/count/5.png"></a></td>
        <td width="*"><a href="https://github.com/Nhogs/popoto/wiki/Result"><b>Result</b></a> container displays the results matching the graph query.</td>
    </tr>
</table>

## Resources
* [Examples](https://github.com/Nhogs/popoto-examples)
* [Wiki](https://github.com/Nhogs/popoto/wiki)

## Install
For NPM, `npm install popoto` For Yarn, `yarn add popoto`.

[![NPM](https://nodei.co/npm/popoto.png?compact=true)](https://www.npmjs.com/package/popoto)

Otherwise, download the [latest release](https://github.com/Nhogs/popoto/releases/latest).
 
You can also load directly from [unpkg](https://unpkg.com/popoto/) or [jsDelivr](https://www.jsdelivr.com/package/npm/popoto)

Example:
```html
<!-- Add default CSS reference -->
<link rel="stylesheet" href="https://unpkg.com/popoto/dist/popoto.min.css">
<!-- Or -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/popoto/dist/popoto.min.css">
```

```html
<!-- Add Popoto script reference, will default to popoto.min.js -->
<script src="https://unpkg.com/popoto"></script>
<!-- Or -->
<script src="https://cdn.jsdelivr.net/npm/popoto/dist/popoto.min.js"></script>
```

For source version:
```html
<!-- Add Popoto script reference -->
<script src="https://unpkg.com/popoto/dist/popoto.js"></script>
<!-- Or -->
<script src="https://cdn.jsdelivr.net/npm/popoto/dist/popoto.js"></script>
```

## Quick start guide:
 - Edit the "index.html" file, by default this application is based on Neo4j movie graph example.
 - Create your driver instance following Neo4j developer guide: https://neo4j.com/developer/javascript/
```javascript
const driver = neo4j.driver(
    "neo4j://dff437fa.databases.neo4j.io", // Unencrypted 
    //"neo4j+s://dff437fa.databases.neo4j.io", //Encrypted with Full Certificate
    neo4j.auth.basic("popoto", "popotopassword"),
    //{disableLosslessIntegers: true} // Enabling native numbers
);
```
 - Change the value of `popoto.runner.DRIVER = driver` to your running server driver instance.
 - If needed you can change the default session creation to add parameters:
```javascript
popoto.runner.createSession = function () {
    return runner.DRIVER.session({defaultAccessMode: "READ"})
};
```
 - Update the list of labels defined in "popoto.provider.node.Provider" definition. All node labels to display in the graph should be added in this list.
 - Add any other customization you need in this file. See [Nhogs/popoto-examples](https://github.com/Nhogs/popoto-examples) for detailed configuration examples.
 - Open index.html file in your preferred web browser to see the result.
 - Click on a node to display and select a value, click on relationship arcs around nodes to navigate in relations uses right click to remove a value and ctrl+click to negate a node. See all [Basic actions](https://github.com/Nhogs/popoto/wiki/Basic-action) for details

See an explained example page source in [Getting started](https://github.com/Nhogs/popoto/wiki/Getting-started).

 ## License
[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0)
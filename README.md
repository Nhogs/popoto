<p align="center"><a href="https://popotojs.com" target="_blank"><img width="301"src="http://www.popotojs.com/logo.png"></a></p>

[![Build Status](https://travis-ci.org/Nhogs/popoto.svg?branch=master)](https://travis-ci.org/Nhogs/popoto)
[![npm version](https://img.shields.io/npm/v/popoto.svg)](https://www.npmjs.com/package/popoto)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Popoto.js is an interactive and customizable graph query builder to search in [Neo4j](https://neo4j.com/) databases it is built in Javascript with [D3.js](https://d3js.org/).

## Install
If you use npm `npm install popoto`.

[![NPM](https://nodei.co/npm/popoto.png?compact=true)](https://www.npmjs.com/package/popoto)

Otherwise, download the [latest release](https://github.com/Nhogs/popoto/releases/latest). You can load directly from [unpkg](https://unpkg.com/popoto/):
 
```html
<!-- Add default CSS reference -->
<head>
<link rel="stylesheet" href="https://unpkg.com/popoto/dist/popoto.min.css">
...
</head>
<body>
...
<!-- Add javascript dependencies (jQuery and D3)-->
<script src="https://unpkg.com/jquery" charset="utf-8"></script>
<script src="https://unpkg.com/d3" charset="utf-8"></script>
<!-- Add Popoto script reference -->
<script src="https://unpkg.com/popoto"></script>
```

## Examples
A full set of live examples with sample data sets can be found in [Nhogs/popoto-examples](https://github.com/Nhogs/popoto-examples) GitHub repository.


## Quick start guide:
 - Edit the "index.html" file, by default this application is based on Neo4j movie graph example.
 - Change the value of "popoto.rest.CYPHER_URL" property to your running server REST API. The default value is "http://localhost:7474/db/data/transaction/commit".
 - Change the value of "popoto.rest.AUTHORIZATION" with an authorized user credentials, see comments in index.html file for details.
 - Update the list of labels defined in "popoto.provider.node.Provider" definition. All node labels to display in the graph should be added in this list.
 - Add any other customization you need in this file. See https://github.com/Nhogs/popoto-examples for detailed configuration examples.
 - Open index.html file in your preferred web browser to see the result.
 - Click on a node to display and select a value, click on relationship arcs around nodes to navigate in relations and uses right click to remove a value.
 
 ## License
[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0)
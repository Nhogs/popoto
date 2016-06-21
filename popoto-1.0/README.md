This archive contains:
 - An HTML template page "index.html" with default configuration to generate a graph search on Neo4j movie graph example.
 - An HTML page "configurator.html" that can be use to generate a custom configuration for your data.
 - A "js" folder containing popoto.js minified JavaScript files with required dependencies (D3.js & JQuery for Popoto and JQuery UI and Hilight.js for the configurator).
 - A "css" folder containing popoto minified CSS files.
 - An "image" folder used by configurator only.
 - And "src" folder with source code.

Quick start guide:
 - Open configurator.html file in your web browser to generate a custom configuration for your application.

Or follow these steps to create your own page manually:

 - Edit the "index.html" file if the application configuration need to be updated, by default this application is based on Neo4j movie graph example.
 - Change the value of "popoto.rest.CYPHER_URL" property to your running server REST API. The default value is "http://localhost:7474/db/data/transaction/commit".
 - Change the value of "popoto.rest.AUTHORIZATION" with an authorized user credentials, see comments in index.html file for details.
 - Update the list of labels defined in "popoto.provider.nodeProviders" definition. All node labels that could be found in the graph should be added in this list.
 - Add any other customization you need in this file. See http://www.popotojs.com/examples.html for detailed configuration examples.
 - Open index.html file in your preferred web browser to see the result.
 - Click on a node to display and select a value, click on "plus" button on a node to retrieve its relations and uses right click to remove a value.
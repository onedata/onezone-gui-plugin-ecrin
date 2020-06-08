# onezone-gui-plugin-ecrin

## About

onezone-gui-plugin-ecrin is a Onezone GUI harvester plugin, which was created by Onedata developers to meet the goals of the ECRIN usecase as a part of the XDC (Extreme Data Cloud) project. It provides mechanisms for searching, filtering, persisting results and exporting clinical studies and data objects entries.

The GUI plugin has embedded default indices schemas (`study` and `data_object`), which are recommended to use while creating harvester indices. Also a default configuration for the plugin is provided. Both of them can be found in `src/app/manifest.json` file.

## Prerequisites

onezone-gui-plugin-ecrin is an Ember.js application, which means you will need the following things properly installed on your computer.

* [Node.js](https://nodejs.org/) (with npm)
* [Bower](https://bower.io/)
* [Ember CLI](https://ember-cli.com/)

Also to run the onezone-gui-plugin-ecrin itself, a fully deployed Onedata system should be available. It will let the harvester plugin interact with a harvester connected to the Elasticsearch instance and test it's features.

## Building

Before building make sure submodules are initialized:
```
make submodules
```

To build a development release of GUI plugin:
```
make build_plugin_dev
```
or a production one:
```
make build_plugin_prod
```
In both versions the result plugin will be available under `plugin.tar.gz` file, which is ready to upload in a harvester configuration in Onezone GUI.
A production build default index schemas needs `ecrin_synonyms` elasticsearch index dependency to work. A development build can work without it. See more in files: `src/app/manifest.json` and `src/ember-cli-build.js`.

## Running Tests

```
make test
```

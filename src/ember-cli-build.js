/* eslint-env node */
'use strict';

const defineSassBreakpoints = require('./app/utils/define-sass-breakpoints');
const breakpointValues = require('./app/breakpoint-values');
const manifest = require('./app/manifest');
const fs = require('fs');
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    'eslint': {
      testGenerator: 'mocha',
    },
    'sassOptions': {
      includePaths: ['app/styles'],
      onlyIncluded: false,
    },
    'ember-bootstrap': {
      importBootstrapCSS: false,
      importBootstrapTheme: false,
      importBootstrapFont: true,
      bootstrapVersion: 3,
    },
  });

  defineSassBreakpoints(app, breakpointValues);

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  app.import('node_modules/is-url/index.js', {
    using: [
      { transformation: 'cjs', as: 'is-url' },
    ],
  });

  app.import('node_modules/pdfmake/build/pdfmake.min.js', {
    outputFile: 'assets/pdfmake/pdfmake.js',
  });
  app.import('node_modules/pdfmake/build/vfs_fonts.js', {
    outputFile: 'assets/pdfmake/vfs_fonts.js',
  });

  const env = process.env.EMBER_ENV;
  if (env !== 'production') {
    // Remove Ecrin synonyms from manifest in development mode (breaks down index
    // creation due to lack of synonyms files).
    const indices = manifest.onedata.indices;
    indices.forEach(index => {
      const esAnalysis = index.schema.settings.analysis;
      const analyzer = esAnalysis.analyzer.default;
      analyzer.filter =
        analyzer.filter.filter(filterName => filterName !== 'ecrin_synonyms');
      delete esAnalysis.filter.ecrin_synonyms;
    });
  }

  fs.writeFileSync('public/manifest.json', JSON.stringify(manifest));

  return app.toTree();
};

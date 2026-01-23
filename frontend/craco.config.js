const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Suppress source map warnings from node_modules
      webpackConfig.ignoreWarnings = [
        {
          module: /node_modules/,
          message: /Failed to parse source map/,
        },
        {
          module: /html5-qrcode/,
          message: /Failed to parse source map/,
        }
      ];

      // Alternative: Filter out source-map-loader warnings for node_modules
      const sourceMapLoader = webpackConfig.module.rules.find(rule => 
        rule.enforce === 'pre' && 
        rule.use && 
        rule.use.some(use => use.loader && use.loader.includes('source-map-loader'))
      );

      if (sourceMapLoader) {
        sourceMapLoader.exclude = /node_modules/;
      }

      return webpackConfig;
    },
  },
};
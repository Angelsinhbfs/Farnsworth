const webpack = require('webpack');
const cracoServiceWorkerConfig = require("./cracoServiceWorkerConfig");
module.exports = {
    plugins: [{ plugin: cracoServiceWorkerConfig }],
    webpack: {
        configure: (webpackConfig) => {
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                path: require.resolve('path-browserify'),
                stream: require.resolve('stream-browserify'),
                util: require.resolve('util'),
                zlib: require.resolve("browserify-zlib"),
                assert: require.resolve("assert"),
                constants: require.resolve('constants-browserify'),
            };
            webpackConfig.plugins = [
                ...webpackConfig.plugins,
                new webpack.DefinePlugin({
                    'process.env.BASE_URL': JSON.stringify(process.env.BASE_URL),
                }),
            ];
            return webpackConfig;
        },
    },
};
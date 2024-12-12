module.exports = {
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
            return webpackConfig;
        },
    },
};
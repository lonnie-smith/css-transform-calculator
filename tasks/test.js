import gulp from 'gulp';
import notify from './notify';
import karma from 'karma';

export default gulp.series('buildTests', test, done => {
    process.env.watchStarted = 'true';
    notify.log('Tests complete!',
        process.env.WATCH === 'true' ? 'Starting watch...' : '',
        true);
    done();
});

function test(done) {
    let browsers;
    if (process.env.NODE_ENV === 'development') {
        browsers = ['Chrome'];
    } else {
        browsers = ['ChromeHeadless'];
    }
    const server = new karma.Server({
        basePath: '',
        files: [
            'dist/**/*.spec.js',
        ],
        exclude: [],

        port: 3000,

        frameworks: ['jasmine'],
        preprocessors: {},
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress'],
        colors: true,

        // level of logging
        // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
        logLevel: karma.constants.LOG_INFO,

        autoWatch: process.env.WATCH === 'true',

        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: process.env.WATCH === 'true' ? false : true,

        // Concurrency level
        // how many browser should be started simultaneously
        concurrency: Infinity,
    }, done);
    server.start();
}

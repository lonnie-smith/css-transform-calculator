/**
 * Builds test scripts and runs Jasmine tests for all files under src/ matching
 * *.spec.js
 *
 * In development environment, watches JavaScript files for changes, compiles,
 * and re-runs tests on changes.
 *
 * @usage gulp test
 */

import * as jasmine from 'gulp-jasmine-browser';
import browserify from 'browserify';
import buffer from 'vinyl-buffer';
import glob from 'glob';
import gulp from 'gulp';
import merge from 'merge-stream';
import notify from './notify';
import path from 'path';
import source from 'vinyl-source-stream';
import sourcemaps from 'gulp-sourcemaps';
import watchify from 'watchify';


const plugins = [];

export default function (done) {
    if (process.env.WATCH === 'true') {
        plugins.push(watchify);
    }

    return gulp.series(
        buildTests, runTests, d => {
            process.env.watchStarted = 'true';
            notify.log('Tests complete', 'Starting watch...', true);
            if (process.env.WATCH === 'true') {
                watchTests();
            }
            d();
        })(done);
}

function runOneTest(srcPath) {
    const bundler = browserify({
        cache: {},
        debug: process.env.SOURCE_MAPS === 'true',
        entries: srcPath,
        packageCache: {},
        paths: [`./${process.env.DIRECTORY_SRC}`],
        plugin: plugins,
    });

    bundler.transform('babelify', { extensions: ['.js'] });

    bundler.on('update', () => {
        notify.log(`TESTS: ${srcPath} updated; rebuilding...`);
        onUpdate(bundler, srcPath);
    });

    bundler.on('log', message => {
        notify.log(`TESTS: ${srcPath} rebuild complete`, message);
    });

    return onUpdate(bundler, srcPath);
}

function onUpdate(bundler, srcPath) {
    const fname = `${path.parse(srcPath).name}.js`;
    return bundler
        .bundle()
        .on('error', function (error) {
            notify.error('TESTS: error', error);
            this.emit('end');
        })
        .pipe(source(fname))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(`${process.env.DIRECTORY_DEST}/`));
}

function buildTests() {
    const files = glob.sync(`${process.env.DIRECTORY_SRC}/**/*.spec.js`);
    return merge(files.map(runOneTest))
        .on('end', notify.onLog('TESTS: rebuild complete'));
}

function runTests() {
    return gulp.src(`${process.env.DIRECTORY_DEST}/*.spec.js`)
        .pipe(jasmine.specRunner({ console: true }))
        .pipe(jasmine.headless({
            port: 3000,
            driver: 'chrome',
        }));
}

function watchTests() {
    // HACK: gulp-jasmine doesn't seem to terminate itself properly when
    // used in a gulp.watch scenario. This allows the process to use unlimited
    // SIGINT/SIGTERM even listeners, which prevents annoying warning logs,
    // but may cause problems in long-running development sessions.
    process.setMaxListeners(0);

    return gulp.watch(`${process.env.DIRECTORY_DEST}/*.spec.js`, () => {
        notify.log('TESTS: file update detected, retesting...');
        return runTests();
    });
}

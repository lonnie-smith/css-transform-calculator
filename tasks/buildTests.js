/**
 * Builds test scripts in under src/ matching *.spec.js
 *
 * In development environment, watches JavaScript files for changes and
 * recompiles.
 *
 * @usage gulp buildTests
 */

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

export default function() {
    if (process.env.WATCH === 'true') {
        plugins.push(watchify);
    }

    return buildTests();
}

function buildOneTest(srcPath) {
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
        .on('error', function(error) {
            notify.error('TESTS: error', error);
            this.emit('end');
        })
        .pipe(source(fname))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(`${process.env.DIRECTORY_DEST}/spec/`));
}

function buildTests() {
    const files = glob.sync(`${process.env.DIRECTORY_SRC}/**/*.spec.js`);
    return merge(files.map(buildOneTest))
        .on('end', notify.onLog('TESTS: rebuild complete'));
}

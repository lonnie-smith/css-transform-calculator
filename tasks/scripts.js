/**
 * Builds JavaScript files found in /src/assets/scripts
 * Uses watchify for fast incremental builds
 *
 * @usage gulp scripts
 */

import buffer from 'vinyl-buffer';
import browserify from 'browserify';
import gulp from 'gulp';
import gulpIf from 'gulp-if';
import notify from './notify';
import pkg from './../package.json';
import source from 'vinyl-source-stream';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';
import watchify from 'watchify';

const plugins = [];
const vendorArray = [...Object.keys(pkg.browser), ...Object.keys(pkg.dependencies)];

function onUpdate(bundler) {
    return bundler
        .bundle()
        .on('error', function(error) {
            notify.error('SCRIPTS: error', error);
            this.emit('end');
        })
        .pipe(source('CssTransformCalculator.js'))
        .pipe(buffer())
        .pipe(gulpIf(process.env.SOURCE_MAPS  === 'true', sourcemaps.init({ loadMaps: true })))
        .pipe(gulpIf(process.env.MINIFY === 'true', uglify()))
        .pipe(gulpIf(process.env.SOURCE_MAPS === 'true', sourcemaps.write('./')))
        .pipe(gulp.dest(`${process.env.DIRECTORY_DEST}/`));
}

function buildScripts() {
    const options = {
        cache: {},
        packageCache: {},
        plugin: plugins,
        debug: process.env.SOURCE_MAPS === 'true',
        entries: [`${process.env.DIRECTORY_SRC}/CssTransformCalculator.js`],
        paths: [`./${process.env.DIRECTORY_SRC}`],
    };

    const bundler = browserify(options)
        .external(vendorArray)
        .transform('babelify', { extensions: ['.js'] });

    bundler.on('update', () => {
        notify.log('SCRIPTS: file update detected, rebuilding...');
        onUpdate(bundler);
    });

    bundler.on('log', message => {
        notify.log('SCRIPTS: rebuild complete', message);
    });

    return onUpdate(bundler);
}


export default function scripts() {
    if (process.env.WATCH === 'true') {
        plugins.push(watchify);
    }

    return buildScripts();
}

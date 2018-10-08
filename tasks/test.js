import gulp from 'gulp';
import * as jasmine from 'gulp-jasmine-browser';
import notify from './notify';
import webpack from 'webpack-stream';

const src = [`${process.env.DIRECTORY_SRC}/**/*.spec.js`];

function test() {
    return gulp.src(src)
        .pipe(webpack({
            mode: 'development',
            watch: false,
            output: { filename: 'spec.js' },
        }))
        .pipe(jasmine.specRunner({ console: true }))
        .pipe(jasmine.headless({
            port: 3000,
            driver: 'chrome',
        }));
}

function watchTest() {
    return gulp.watch(src, () => {
        notify.log('TEST: file update detected, retesting...');
        return test();
    });
}

export default function() {
    if (process.env.WATCH === 'true') {
        watchTest();
    }
    return test();
};

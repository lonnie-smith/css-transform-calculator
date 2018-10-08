/**
 * Builds all source code in /src, and outputs to /web
 *
 * @usage gulp
 */

import del from 'del';
import gulp from 'gulp';
import notify from './notify';

function clean() {
    return del(process.env.DIRECTORY_DEST, {
        force: process.env.ENABLE_UNSAFE_CLEAN === 'true',
    });
}
gulp.task('clean', clean);

export default gulp.series('clean', 'scripts', done => {
    process.env.watchStarted = true;
    notify.log(
        'Build complete!',
        process.env.WATCH === 'true' ? 'Starting watch...' : '',
        true
    );
    done();
});


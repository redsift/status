'use strict';
               
var gulp = require('gulp');
var browserSync = require('browser-sync').create();

var fs = require('fs'),
    del = require('del');

var data = require('gulp-data'),
    gm = require('gulp-gm'),
    htmllint = require('gulp-htmllint'),
    gulpif = require('gulp-if'),
    jsonlint = require('gulp-jsonlint'),
    nunjucksRender = require('gulp-nunjucks-render'),
    plumber = require('gulp-plumber'),
    postcss = require('gulp-postcss'),
    rename = require('gulp-rename'),
    sourcemaps = require('gulp-sourcemaps'),
    stylus = require('gulp-stylus'),
    uglify = require('gulp-uglify'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    base64 = require('postcss-inline-base64');

var rollup = require('rollup-stream'),
    buble = require('rollup-plugin-buble'),
    commonjs = require('rollup-plugin-commonjs'),
    imagedata = require('@redsift/rollup-plugin-imagedata'),
    json = require('rollup-plugin-json'),
    nodeResolve = require('rollup-plugin-node-resolve'),
    string = require('rollup-plugin-string');

var options = {
    plumb: false
};

var sRGB = './sRGB_v4_ICC_preference.icc';

function commonImageOptions(gmfile) {
    try {
        // do this check as if not present, the ICC profile failure is silent
        fs.accessSync(sRGB, fs.F_OK);
    } catch (e) {
        throw new Error('Please download the official sRGB ICC profile "sRGB_v4_ICC_preference.icc" from http://www.color.org/srgbprofiles.xalter and place in this directory');
    }

    return gmfile.intent('Relative')
                .profile(sRGB)
                .strip();
}

function jpegImageOptions(gmfile) {
    return gmfile.interlace('Plane')
                .flatten();
}

function webpImageOptions(gmfile) {
    return gmfile.define('webp:auto-filter=true')
                .define('webp:method=6')
                .define('webp:image-hint=photo')
                .define('webp:partitions=0') 
                .define('webp:preprocessing=2') 
                .define('webp:sns-strength=0');
}

gulp.task('clean', () => del([ 'distribution/**' ]));  

/*
IM_FLAGS="-intent relative -black-point-compensation -profile sRGB_v4_ICC_preference.icc -strip -units PixelsPerInch"
WEBP_OPS="-define webp:auto-filter=true -define webp:method=6 -define webp:image-hint=photo -define webp:partitions=2 -define webp:preprocessing=2 -define webp:sns-strength=0"
JPEG_OPS="-interlace Plane -background white -flatten"

OUTPUTS=("_c" "_c_2x" "" "_2x")
"-resize 480 -unsharp 4x1.4+0.7+0 -quality 90" 
"-resize 960 -unsharp 3x0.6+0.7+0 -quality 85" 
"-resize 1024 -density 96 -unsharp 3x0.6+0.7+0 -quality 90" 
"-resize 2048 -density 300 -quality 92")

*/

gulp.task('hero', function() {
    var configuration = JSON.parse(fs.readFileSync('configuration.json', 'utf8'));

    [
        {
            size: 512,
            quality: 90,
            suffix: '_05x',
            unsharp: [ 4, 1.4, 0.7, 0 ]
        },
        {
            size: 1024,
            quality: 90,
            suffix: '',
            unsharp: [ 3, 0.6, 0.7, 0 ]
        },  
        {
            size: 2048,
            quality: 92,
            suffix: '_2x'
        }     
    ].forEach(function (o) {
        [   { format: 'jpg', fn: g => jpegImageOptions(commonImageOptions(g)) }, 
            { format: 'webp', fn: g => webpImageOptions(commonImageOptions(g)) } 
        ].forEach(function (files) {

            gulp.src(configuration.hero)
                .pipe(gm(function (gmfile) {
                    var small = files.fn(gmfile).resize(o.size);
                    if (o.unsharp) {
                         small = small.unsharp.apply(small, o.unsharp);
                    }
                    return small.setFormat(files.format).quality(o.quality);
                }, 
                { imageMagick: true })
                )
                .pipe(rename({basename: '_hero' + o.suffix, extname: '.' + files.format }))
                .pipe(gulp.dest('distribution/'));

        });


    });


});

gulp.task('static', function() {
    gulp.src('static/*.+(jpg|svg|webp)')
        .pipe(gulp.dest('distribution/'));
});

gulp.task('html', function() {
    var configuration = JSON.parse(fs.readFileSync('configuration.json', 'utf8'));

    gulp.src([ 'templates/manifest.nunjucks' ])
                .pipe(gulpif(options.plumb, plumber()))
                .pipe(data(function() {
                    return configuration;
                }))
                .pipe(nunjucksRender({
                    path: ['templates']
                }))
                .pipe(rename({extname: '.nunjucks'}))
                .pipe(jsonlint())
                .pipe(jsonlint.reporter())
                .pipe(rename({extname: '.json'}))
                .pipe(gulp.dest('distribution'));

    gulp.src([ 'templates/index.nunjucks' ])
                .pipe(gulpif(options.plumb, plumber()))
                .pipe(data(function() {
                    return configuration;
                }))
                .pipe(nunjucksRender({
                    path: ['templates']
                }))
                .pipe(htmllint({ config: '.htmllintrc' }))
                .pipe(gulp.dest('distribution'));
});

gulp.task('css', () => {
  return gulp.src('style/index.styl')
    .pipe(stylus({
      compress: true,
      include: __dirname + '/node_modules'
    }))
    .pipe(postcss([
        base64({ baseDir: 'static/' })
    ]))
    .pipe(gulp.dest('distribution/'));
});

gulp.task('umd', () => {  
  return rollup({
            moduleName: 'index',
            globals: [],
            entry: 'index.js',
            format: 'umd',
            sourceMap: true,
            plugins: [ 
                        json({
                            include: [ '**/package.json' , 'node_modules/**/*.json' ], 
                            exclude: [  ]
                        }),
                        imagedata.image(),
                        string({
                            include: [ '**/*.tmpl' ]
                        }),
                        nodeResolve({
                            skip: [],
                            jsnext: true
                        }),
                        commonjs(), 
                        buble() 
                        ]
        })
        .pipe(source('index.js', 'src'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(rename({basename: 'index'}))
        .pipe(rename({suffix: '.umd-es2015'}))
        .pipe(gulp.dest('distribution/'))
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('distribution/'));
});

gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: [ 'distribution/' ],
            directory: true
        }
    });
});

gulp.task('plumb', function () {
    options.plumb = true;
});

gulp.task('serve', [ 'plumb', 'default', 'browser-sync' ], function() {
    gulp.watch(['index.js', 'src/*.js'], [ 'umd' ]);
    gulp.watch('style/*.styl', [ 'css' ]);
    gulp.watch(['templates/**/*.+(html|nunjucks)', 'configuration.json'], [ 'html' ]);
    gulp.watch('static/*.+(svg|jpg)', [ 'static' ]);
    
    gulp.watch('distribution/*.js').on('change', () => browserSync.reload('*.js'));
    gulp.watch('distribution/*.css').on('change', () => browserSync.reload('*.css'));
    gulp.watch('distribution/*.html').on('change', () => browserSync.reload('*.html'));

    gulp.watch('distribution/*.svg').on('change', () => browserSync.reload('*.svg'));
    gulp.watch('distribution/*.jpg').on('change', () => browserSync.reload('*.jpg'));
    gulp.watch('distribution/*.webp').on('change', () => browserSync.reload('*.webp'));
});

gulp.task('build', [ 'clean', 'default' ]);

gulp.task('default', [ 'umd', 'css', 'html', 'static' ]);

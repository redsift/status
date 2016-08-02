'use strict';
               
var gulp = require('gulp');
var del = require('del');
var util = require('gulp-util');
var rollup = require('rollup-stream'); 
var uglify = require('gulp-uglify');
var browserSync = require('browser-sync').create();
var buble = require('rollup-plugin-buble');
var nodeResolve = require('rollup-plugin-node-resolve');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var rename = require('gulp-rename');
var commonjs = require('rollup-plugin-commonjs');
var json = require('rollup-plugin-json');
var stylus = require('gulp-stylus');
var postcss = require('gulp-postcss');
var base64 = require('postcss-inline-base64');

gulp.task('clean', () => del([ 'distribution/**' ]));  

gulp.task('static', function() {
    gulp.src('./index.html')
        .pipe(gulp.dest('./distribution'));
});

gulp.task('css', () => {
  return gulp.src('./style/index.styl')
    .pipe(stylus({
      compress: true
    }))
    .pipe(postcss([
        base64()
    ]))
    .pipe(gulp.dest('./distribution'));
});

gulp.task('umd', () => {  
  return rollup({
            moduleName: 'status',
            globals: [],
            entry: 'index.js',
            format: 'umd',
            sourceMap: true,
            plugins: [ 
                        json({
                            include: [ '**/package.json' , 'node_modules/**/*.json' ], 
                            exclude: [  ]
                        }),
                        nodeResolve({
                            skip: [],
                            // use "jsnext:main" if possible
                            // – see https://github.com/rollup/rollup/wiki/jsnext:main
                            jsnext: true,  // Default: false

                            // use "main" field or index.js, even if it's not an ES6 module
                            // (needs to be converted from CommonJS to ES6
                            // – see https://github.com/rollup/rollup-plugin-commonjs
                            main: true,  // Default: true

                            // not all files you want to resolve are .js files
                            extensions: [ '.js' ],  // Default: ['.js']

                            // whether to prefer built-in modules (e.g. `fs`, `path`) or
                            // local ones with the same names
                            preferBuiltins: false  // Default: true
                        }),
                        commonjs(), 
                        buble() 
                        ]
        })
        .pipe(source('main.js', './src'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(rename({basename: outputFilename}))
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
            baseDir: [ './distribution' ],
            directory: true
        }
    });
});

gulp.task('serve', ['default', 'browser-sync'], function() {
    gulp.watch(['./*.js', './src/*.js'], [ 'umd' ]);
    gulp.watch('./style/*.styl', [ 'css' ]);
    gulp.watch(['./static/*.html', './static/*.svg', './static/*.jpg'], [ 'static' ]);
    gulp.watch('./distribution/*.js').on('change', () => browserSync.reload('*.js'));
    gulp.watch('./distribution/*.css').on('change', () => browserSync.reload('*.css'));
    gulp.watch('./distribution/*.html').on('change', () => browserSync.reload('*.html'));
    gulp.watch('./distribution/*.svg').on('change', () => browserSync.reload('*.svg'));
    gulp.watch('./distribution/*.jpg').on('change', () => browserSync.reload('*.jpg'));
});

gulp.task('build', [ 'clean', 'default' ]);

gulp.task('default', [ 'umd', 'css', 'static' ]);
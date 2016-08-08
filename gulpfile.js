'use strict';
               
var gulp = require('gulp');
var browserSync = require('browser-sync').create();

var fs = require('fs'),
    del = require('del'),
    crypto = require('crypto'),
    url = require('url');

var compressedImages = require('@redsift/gulp-compressedimages'),
    data = require('gulp-data'),
    expect = require('gulp-expect-file'),
    htmllint = require('gulp-htmllint'),
    gulpif = require('gulp-if'),
    jsonlint = require('gulp-jsonlint'),
    nunjucksRender = require('gulp-nunjucks-render'),
    plumber = require('gulp-plumber'),
    postcss = require('gulp-postcss'),
    rename = require('gulp-rename'),
    sourcemaps = require('gulp-sourcemaps'),
    stylus = require('gulp-stylus'),
    minifyCss = require('gulp-cleancss'),
    autoprefixer = require('gulp-autoprefixer'),    
    uglify = require('gulp-uglify'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    s3 = require('vinyl-s3'),
    base64 = require('postcss-inline-base64'),
    merge = require('merge-stream'),
    runSequence = require('run-sequence'); // temporary use of run-sequence until Gulp 4.0

var rollup = require('rollup-stream'),
    buble = require('rollup-plugin-buble'),
    commonjs = require('rollup-plugin-commonjs'),
    imagedata = require('@redsift/rollup-plugin-imagedata'),
    json = require('rollup-plugin-json'),
    nodeResolve = require('rollup-plugin-node-resolve'),
    string = require('rollup-plugin-string');

var options = {
    plumb: false,
    configuration: JSON.parse(fs.readFileSync('configuration.json', 'utf8')),
    assets: {
        hero: './assets/hero-original.jpg'
    }
};

gulp.task('clean', () => del([ 'distribution/**' ]));  

gulp.task('assets', function() {
    var hero = options.configuration.assets.hero;

    if (/^s3:\/\//.test(hero)) {
        // Pull the assets from S3 with some simple cache logic
        var modstamp = null;

        var hash = crypto.createHash('sha1').update(hero).digest('hex');
        options.assets.hero = 'assets/' + hash + '.s3';

        try {
            var stats = fs.statSync(options.assets.hero);
            modstamp = stats.mtime;
            // could use this value but for now assume file is up to date
            // as the s3 library causes this to be propogated as an uncaught
            // exception. Investigate and send pull request
            return;
        }
        catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }

        var parsed = url.parse(hero);

        return s3.src({ 
                Bucket: parsed.hostname,
                Key: parsed.path.substring(1),
                IfModifiedSince: modstamp
            })
            .pipe(rename({dirname:'./', basename: hash, extname: '.s3'}))
            .pipe(gulp.dest('assets/'));

    } else {
        options.assets.hero = hero;
    }
});


gulp.task('hero', function() {
    // Generate outputs for all the common formats
    return merge.apply(this, compressedImages.common.map(function (o) {
        return gulp.src(options.assets.hero)
            .pipe(expect([ options.assets.hero ]))
            .pipe(rename({basename: 'hero'}))
            .pipe(compressedImages.resampler(o))
            .pipe(gulp.dest('static/'));
    }));

});

gulp.task('static', function() {
    return gulp.src('static/*.+(jpg|svg|webp)').pipe(gulp.dest('distribution/'));
});

gulp.task('html', function() {
    var manifest = gulp.src([ 'templates/manifest.nunjucks' ])
                .pipe(gulpif(options.plumb, plumber()))
                .pipe(data(function() {
                    return options.configuration;
                }))
                .pipe(nunjucksRender({
                    path: ['templates']
                }))
                .pipe(rename({extname: '.nunjucks'}))
                .pipe(jsonlint())
                .pipe(jsonlint.reporter())
                .pipe(rename({extname: '.json'}))
                .pipe(gulp.dest('distribution'));

    var index = gulp.src([ 'templates/index.nunjucks' ])
                .pipe(gulpif(options.plumb, plumber()))
                .pipe(data(function() {
                    return options.configuration;
                }))
                .pipe(nunjucksRender({
                    path: ['templates']
                }))
                .pipe(htmllint({ config: '.htmllintrc' }))
                .pipe(gulp.dest('distribution'));

    return merge(manifest, index);                
});

gulp.task('css', () => {
  return gulp.src('style/index.styl')
    .pipe(gulpif(options.plumb, plumber()))
    .pipe(stylus({
      include: __dirname + '/node_modules'
    }))
    .pipe(postcss([
        base64({ baseDir: 'static/' })
    ]))
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('distribution/'))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(minifyCss({
      compatibility: '*',
      roundingPrecision: 4,
      keepSpecialComments: 0
    }))
    .pipe(sourcemaps.write('.'))    
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

gulp.task('options', function () {
    options.plumb = true;
});

gulp.task('browser-sync', function() {
    return browserSync.init({
        server: {
            baseDir: [ 'distribution/' ],
            directory: true
        }
    });
});

gulp.task('watch', function() {
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

gulp.task('serve', function(callback) {
  runSequence('options',
              'default',
              'browser-sync',
              'watch',
              callback);
});

gulp.task('build', function(callback) {
  runSequence('clean',
              'default',
              callback);
});

gulp.task('default', function(callback) {
  runSequence('assets',
              'hero',
              [ 'umd', 'css', 'html', 'static' ],
              callback);
});

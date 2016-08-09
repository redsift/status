'use strict';
               
var gulp = require('gulp');
var browserSync = require('browser-sync').create();

var fs = require('fs'),
    del = require('del'),
    crypto = require('crypto'),
    url = require('url'),
    path = require('path');

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
    gutil = require('gulp-util'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    s3 = require('vinyl-s3'),
    base64 = require('postcss-inline-base64'),
    mapUrl = require('postcss-map-url'),
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
    configuration: function() { return JSON.parse(fs.readFileSync('configuration.json', 'utf8')) },
    assets: {
        hero: './assets/hero-original.jpg'
    }
};

//TODO: Transform this into a gulp task?

function downloadAsset(asset) {
    if (/^s3:\/\//.test(asset)) {
        // Pull the assets from S3 with some simple cache logic
        var modstamp = null;

        var hash = '_' + crypto.createHash('sha1').update(asset).digest('hex');
        var local = 'assets/' + hash + '.s3';

        try {
            var stats = fs.statSync(local);
            modstamp = stats.mtime;
            // TODO: could use this value but for now assume file is up to date
            // as the s3 library causes IfModifiedSince to be propogated as an uncaught
            // exception. Investigate and send pull request
            return {
                local: local
            };
        }
        catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }

        var parsed = url.parse(asset);

        return {
                local: local,
                task: s3.src({ 
                    Bucket: parsed.hostname,
                    Key: parsed.path.substring(1),
                    IfModifiedSince: modstamp
                })
                .pipe(rename({dirname:'./', basename: hash, extname: '.s3'}))
                .pipe(gulp.dest('assets/'))
            }

    } else {
        return { local: hero };
    }
}

gulp.task('clean', () => del([ 'distribution/**' ]));  

gulp.task('assets', function() {
    var configuration = options.configuration();
    var downloads = Object.keys(configuration.assets).map(function (key) {
        var asset = configuration.assets[key];

        return { key: key, asset: downloadAsset(asset) };
    });

    downloads.forEach(function (d) {
        options.assets[d.key] = d.asset.local;
    });

    var tasks = downloads.map(function (d) {
        return d.asset.task;
    })
    .filter(function (d) {
        return d != null;
    });

    if (tasks.length === 0) return null;

    return merge.apply(this, tasks);
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

gulp.task('icons', function() {
    var icons = Object.keys(options.assets).filter(function (a) { return a !== 'hero' });
    return merge.apply(this, icons.map(function (name) {
        var path = options.assets[name];

        return gulp.src(path)
            .pipe(expect([ path ]))
            .pipe(rename({basename: name, extname: '.svg'}))
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
                    return options.configuration();
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
                    return options.configuration();
                }))
                .pipe(nunjucksRender({
                    path: ['templates']
                }))
                .pipe(htmllint({ config: '.htmllintrc' }))
                .pipe(gulp.dest('distribution'));

    return merge(manifest, index);                
});

var BLACKLIST = {
    '.ttf': true,
    '.woff2': true    
}

function inlineUrl(asset) {
    var parsed = url.parse(asset);
    if (parsed.protocol == null) return false;

    return BLACKLIST[path.extname(parsed.pathname)] != true;
}

gulp.task('css', () => {
  return gulp.src('style/index.styl')
    .pipe(gulpif(options.plumb, plumber()))
    .pipe(stylus({
      include: __dirname + '/node_modules'
    }))
    .pipe(postcss([
        mapUrl(function (url) {
            if (inlineUrl(url)) return 'b64---' + url + '---';
            
            gutil.log('CSS, not inlined', url);
            return url;
        }),
        base64({
            baseDir: './static'
        })
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

gulp.task('sample-data', () => {  
    return gulp.src('tests/good.json')
            .pipe(rename({basename: 'status'}))
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
                            include: [ '**/package.json', '**/configuration.json' , 'node_modules/**/*.json' ], 
                            exclude: [  ]
                        }),
                        imagedata.image({ timeout: 10000 }),
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
    gulp.watch('test/+(good|minor|major).json', [ 'sample-data' ]);

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
              'sample-data',
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
              [ 'hero', 'icons' ],
              [ 'css', 'html', 'static' ],
              'umd',
              callback);
});

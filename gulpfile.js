/*global -$ */
'use strict';
var VERSION = '0.0.1';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var server;
var minimist = require('minimist');

var options = minimist(process.argv);

var environment = options.environment || 'development';
var config = require('./config.json');
var output_dir = 'build'

gulp.task('styles', function () {
  return gulp.src('app/styles/main.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: 'nested', // libsass doesn't support expanded yet
      precision: 10,
      includePaths: ['.'],
      onError: console.error.bind(console, 'Sass error:')
    }))
    .pipe($.postcss([
      require('autoprefixer-core')({browsers: ['last 1 version']})
    ]))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(output_dir + '/styles'))
    .pipe(reload());
});

gulp.task('jshint', function () {
  return gulp.src('app/scripts/**/*.js')
    .pipe(reload({stream: true, once: true}))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});


gulp.task('scripts', function () {
  return gulp.src('app/scripts/**/*.js')
    .pipe(reload({stream: true, once: true}))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')))
    .pipe(gulp.dest(output_dir + '/scripts'))
    .pipe(reload());
});

gulp.task('html', function () {
  var assets = $.useref.assets({searchPath: ['.tmp', 'app', '.']});
  var data;
  return gulp.src('app/*.html')
    .pipe(assets)
    .pipe($.if('*.js', (config.minify ? $.uglify(): $.util.noop())))
    .pipe($.if('*.css', (config.minify ? $.csso() : $.util.noop())))
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe($.if('*.html', $.ejs(require('./app/data.json'))))
    .pipe($.if('*.html', (config.minify ? $.minifyHtml({conditionals: true, loose: true}) : $.util.noop())))
    .pipe(gulp.dest(output_dir))
		.pipe(reload());
});

gulp.task('images', function () {
  return gulp.src('app/images/**/*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    })))
    .pipe(gulp.dest(output_dir + '/images'));
});

gulp.task('fonts', function () {
  return gulp.src(require('main-bower-files')({
    filter: '**/*.{eot,svg,ttf,woff,woff2}'
  }).concat('app/fonts/**/*'))
    //.pipe(gulp.dest('.tmp/fonts'))
    .pipe(gulp.dest(output_dir + '/fonts'));
});

gulp.task('extras', function () {
  return gulp.src([
    'app/*.*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest(output_dir));
});

gulp.task('clean', require('del').bind(null, ['.tmp', output_dir]));

gulp.task('serve', ['html', 'scripts', 'styles', 'fonts'], function () {
  server = browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: [output_dir],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  // watch for changes
  gulp.watch('app/*.html', ['html']);
  gulp.watch('app/includes/*.ejs', ['html']);
  gulp.watch('app/styles/**/*.scss', ['styles']);
  gulp.watch('app/scripts/**/*.js', ['scripts']);
  gulp.watch('app/fonts/**/*', ['fonts']);
  gulp.watch('bower.json', ['wiredep', 'fonts']);
});

// inject bower components
gulp.task('wiredep', function () {
  var wiredep = require('wiredep').stream;

  gulp.src('app/styles/*.scss')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('app/styles'));

  gulp.src('app/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app'));
});

gulp.task('build', ['styles', 'scripts', 'html', 'images', 'fonts', 'extras'], function () {
  return gulp.src(output_dir + '/**/*').pipe($.size({title: 'build', gzip: true}));
  console.log(environment + ' v' + VERSION + ' build is complete')
});

gulp.task('default', ['clean'], function () {
  gulp.start('build');
});

function reload() {
  if (server) {
    return browserSync.reload({ stream: true });
  }
  return $.util.noop();
}

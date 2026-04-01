/* eslint-disable import/no-unresolved, import/no-extraneous-dependencies, no-console */
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const copyfiles = require('copyfiles');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { AngularWebpackPlugin } = require('@ngtools/webpack');

require('dotenv').config();

/** Full Ivy for packages under @angular (required outside Angular CLI). */

const appRoot = path.join(__dirname, 'angular-app/app');
const blocks = fs.readdirSync(appRoot).filter(
  (file) => fs.statSync(path.join(appRoot, file)).isDirectory() && !file.startsWith('.'),
);

console.log('Angular block entries:', blocks);

/** Paths under dist/default not needed for EDS runtime in blocks/ (maps, HMR, licenses, etc.). */
const DIST_TO_BLOCKS_EXCLUDE = [
  './dist/default/vendor/**/*',
  './dist/default/**/*.html',
  './dist/default/**/*.map',
  './dist/default/**/*.LICENSE.txt',
  './dist/default/**/*.LICENSE',
  './dist/default/styles/**/*',
  './dist/default/**/*.hot-update.js',
  './dist/default/**/*.hot-update.mjs',
  './dist/default/**/*.hot-update.json',
  './dist/default/chunks/**/*',
];

class CopyFiles {
  /** @param {{ verbose?: boolean }} [opts] */
  constructor(opts = {}) {
    this.verbose = opts.verbose !== false;
  }

  // eslint-disable-next-line class-methods-use-this
  apply(compiler) {
    compiler.hooks.done.tap('CopyAngularBlockArtifacts', (stats) => {
      if (stats.hasErrors()) {
        return;
      }
      copyfiles(
        ['./dist/default/**/*', './blocks'],
        {
          all: true,
          up: 2,
          exclude: DIST_TO_BLOCKS_EXCLUDE,
          verbose: this.verbose,
        },
        (err) => err && console.error(err),
      );
    });
  }
}

/*
 * One entry per block (index.ts only). Do not use [index.ts, *.scss] — that breaks
 * output.library.type 'module' so the bundle has no `export` and aem loadBlock's
 * mod.default is undefined (block never decorates).
 * Pull block CSS into the same chunk via `import './<block>.component.scss'` in index.ts.
 */
const entry = blocks.reduce((obj, name) => {
  // eslint-disable-next-line no-param-reassign
  obj[name] = `./angular-app/app/${name}/index.ts`;
  return obj;
}, {});

const publicPath = process.env.WEBPACK_PUBLIC_PATH || '/scripts/';

/** Resolved paths for TypeScript path aliases (must match tsconfig.app.json paths). */
const edsAemJs = path.resolve(__dirname, 'scripts/aem.js');
const edsFragmentJs = path.resolve(__dirname, 'blocks/fragment/fragment.js');

module.exports = async (env, argv = {}) => {
  const angularLinkerPlugin = (await import('@angular/compiler-cli/linker/babel')).default;
  const isServe = process.env.WEBPACK_SERVE === 'true';
  const isWatch = Boolean(argv.watch);
  const mode = argv.mode || ((isServe || isWatch) ? 'development' : 'production');
  const isDev = mode === 'development' || isServe;
  /** Set WEBPACK_SOURCE_MAP=true to emit .js.map (still not copied into blocks/ by CopyFiles). */
  const useSourceMap = process.env.WEBPACK_SOURCE_MAP === 'true';

  return {
  mode,
  entry,
  watchOptions: {
    aggregateTimeout: 400,
    ignored: ['**/node_modules/**', '**/dist/**'],
  },
  devtool: useSourceMap ? 'cheap-module-source-map' : false,
  context: path.resolve(__dirname),
  experiments: { outputModule: true },
  output: {
    clean: true,
    path: path.resolve(__dirname, 'dist/default'),
    filename: '[name]/[name].js',
    chunkFilename: 'chunks/[name].js',
    publicPath,
    library: { type: 'module' },
  },
  resolve: {
    extensions: ['.ts', '.js', '.html', '.css', '.scss'],
    alias: {
      '@eds/scripts/aem': edsAemJs,
      '@eds/blocks/fragment': edsFragmentJs,
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: '@ngtools/webpack',
        exclude: /node_modules/,
      },
      {
        test: /\.[cm]?js$/,
        include: /node_modules[/\\]@angular[/\\]/,
        type: 'javascript/auto',
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: path.join(__dirname, 'node_modules/.cache/babel-loader'),
            cacheCompression: false,
            compact: false,
            plugins: [angularLinkerPlugin],
          },
        },
      },
      /*
       * Component styleUrl/styleUrls compile as *.css?ngResource via a child compiler.
       * Do not chain MiniCssExtractPlugin there — it emits CssDependency and breaks the
       * angular-compiler resource pipeline ("No template for dependency: CssDependency").
       */
      {
        test: /\.css$/i,
        resourceQuery: /ngResource/,
        use: [
          {
            loader: 'css-loader',
            options: {
              esModule: true,
              exportType: 'string',
            },
          },
        ],
        type: 'javascript/auto',
      },
      {
        test: /\.css$/i,
        resourceQuery: { not: [/ngResource/] },
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.scss$/i,
        resourceQuery: /ngResource/,
        use: [
          {
            loader: 'css-loader',
            options: {
              esModule: true,
              exportType: 'string',
            },
          },
          'sass-loader',
        ],
        type: 'javascript/auto',
      },
      {
        test: /\.scss$/i,
        resourceQuery: { not: [/ngResource/] },
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
    ],
  },
  plugins: [
    new AngularWebpackPlugin({
      tsconfig: path.resolve(__dirname, 'angular-app/tsconfig.app.json'),
      directTemplateLoading: true,
    }),
    new MiniCssExtractPlugin({
      filename: '[name]/[name].css',
      chunkFilename: 'chunks/[name].css',
    }),
    ...[process.env.npm_lifecycle_event !== 'analyze' && new CopyFiles({ verbose: !isWatch })].filter(Boolean),
    ...[
      process.env.WEBPACK_SERVE !== 'true'
      && new webpack.BannerPlugin({
        banner: (opts) => {
          if (opts.filename.endsWith('.css')) return '/* stylelint-disable */\n';
          if (opts.filename.endsWith('.js')) return '/* eslint-disable */\n';
          return '';
        },
        raw: true,
        stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
      }),
    ].filter(Boolean),
  ],
  externalsType: 'module',
  externals: [
    function externalizeScripts({ request }, callback) {
      if (!request) {
        callback();
        return;
      }
      const norm = path.normalize(request);
      if (request === '@eds/scripts/aem' || norm === edsAemJs
          || request.includes('/scripts/aem') || /[/\\]scripts[/\\]aem\.js$/.test(request)) {
        callback(null, '../../scripts/aem.js');
        return;
      }
      if (request === '@eds/blocks/fragment' || norm === edsFragmentJs
          || request.includes('fragment/fragment.js') || /[/\\]fragment[/\\]fragment\.js$/.test(request)) {
        callback(null, '../fragment/fragment.js');
        return;
      }
      if (request.includes('/load-queries')) {
        callback(null, '/scripts/graphql/load-queries.js');
        return;
      }
      if (request.includes('/commerce')) {
        callback(null, '/scripts/commerce.js');
        return;
      }
      if (request.includes('/aura/api.js')) {
        callback(null, '/scripts/aura/api.js');
        return;
      }
      if (request.includes('/giftcart/api.js')) {
        callback(null, '/scripts/giftcart/api.js');
        return;
      }
      callback();
    },
  ],
  optimization: {
    minimize: !isDev,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          mangle: true,
          compress: { drop_console: ['log', 'info', 'warn', 'debug'] },
        },
      }),
      new CssMinimizerPlugin(),
    ],
    chunkIds: 'named',
    /*
     * Do not split a shared vendor chunk for ESM library entries.
     * Blocks load only via import('/blocks/name/name.js'); there is no parent
     * runtime to await the extra chunk, so webpack's o.O(i) can be undefined
     * and (i=o.O(i)).f throws "Cannot read properties of undefined (reading 'f')".
     * (Re-enable splitChunks + chunk preloading if you add a shared bootstrap.)
     */
    splitChunks: false,
  },
  ...(process.env.WEBPACK_SERVE === 'true'
    ? {
      devServer: {
        host: 'localhost',
        port: 4200,
        hot: false,
        watchFiles: [path.join(__dirname, 'angular-app/**/*')],
        devMiddleware: { writeToDisk: true },
      },
    }
    : {}),
  };
};

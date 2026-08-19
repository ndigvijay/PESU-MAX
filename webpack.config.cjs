const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

// Firefox is the default target for this fork; `--env browser=chrome` still
// produces the upstream Chrome MV3 build from the same sources.
const TARGETS = {
  firefox: {
    outputDir: 'dist-firefox',
    manifest: 'manifest.firefox.json',
    babelTargets: { firefox: '128' }
  },
  chrome: {
    outputDir: 'dist',
    manifest: 'manifest.json',
    babelTargets: { chrome: '88' }
  }
};

module.exports = (env = {}, argv = {}) => {
  const isProduction = argv.mode === 'production';
  const browser = env.browser || 'firefox';
  const target = TARGETS[browser];

  if (!target) {
    throw new Error(`Unknown browser target "${browser}". Use firefox or chrome.`);
  }

  return {
    mode: isProduction ? 'production' : 'development',
    // Never an eval-based devtool: extension page CSP forbids eval in both engines.
    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',

    entry: {
      background: path.resolve(__dirname, 'src/background/background.js'),
      content: path.resolve(__dirname, 'src/content/contentScript.jsx'),
      popup: path.resolve(__dirname, 'src/popup/popup.jsx'),
      options: path.resolve(__dirname, 'src/options/Options.jsx')
    },

    output: {
      path: path.resolve(__dirname, target.outputDir),
      filename: '[name]/[name].js',
      clean: true,
      publicPath: '/'
    },

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: { comments: false },
          },
          extractComments: false,
        }),
      ],
      // CRITICAL: MV3 background scripts cannot load extra chunks at runtime.
      splitChunks: false,
      runtimeChunk: false,
    },

    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: target.babelTargets,
                  modules: false
                }],
                ['@babel/preset-react', {
                  runtime: 'automatic'
                }]
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'icons/[name][ext]'
          }
        }
      ]
    },

    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@frontend': path.resolve(__dirname, 'frontend')
      }
    },

    plugins: [
      new webpack.DefinePlugin({
        __TARGET_BROWSER__: JSON.stringify(browser)
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'src/popup/index.html',
        chunks: ['popup'],
        inject: 'body',
        scriptLoading: 'blocking'
      }),
      new HtmlWebpackPlugin({
        template: './src/options/index.html',
        filename: 'src/options/index.html',
        chunks: ['options'],
        inject: 'body',
        scriptLoading: 'blocking'
      }),
      new CopyPlugin({
        patterns: [
          {
            from: target.manifest,
            to: 'manifest.json'
          },
          {
            from: 'public/icons/Pes_logo_square_ui.png',
            to: 'icons/Pes_logo_square_ui.png'
          },
          {
            from: 'public/icons/icon16.png',
            to: 'icons/icon16.png'
          },
          {
            from: 'public/icons/icon48.png',
            to: 'icons/icon48.png'
          },
          {
            from: 'public/icons/icon128.png',
            to: 'icons/icon128.png'
          }
        ]
      })
    ],

    externals: {
      chrome: 'chrome'
    }
  };
};

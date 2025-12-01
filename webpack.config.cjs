const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',

    entry: {
      background: path.resolve(__dirname, 'src/background/background.js'),
      content: path.resolve(__dirname, 'src/content/contentScript.jsx'),
      popup: path.resolve(__dirname, 'src/popup/popup.jsx'),
      options: path.resolve(__dirname, 'src/options/Options.jsx')
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
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
      // CRITICAL: Disable ALL code splitting for Chrome Extension MV3
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
                  targets: { chrome: '88' },
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
            from: 'public/icons/manifest.json',
            to: 'manifest.json'
          },
          {
            from: 'public/icons/Pes_logo_square.png',
            to: 'icons/Pes_logo_square.png'
          }
        ]
      })
    ],

    externals: {
      chrome: 'chrome'
    }
  };
};

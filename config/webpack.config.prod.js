

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ManifestPlugin = require('webpack-manifest-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const paths = require('./paths');
const getClientEnvironment = require('./env');
const HappyPack = require('happypack');
const happyThreadPool = HappyPack.ThreadPool({ size: 5 });
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const publicPath = paths.servedPath;
const publicUrl = publicPath.slice(0, -1);
const env = getClientEnvironment(publicUrl);

if (env.stringified['process.env'].NODE_ENV !== '"production"') {
  throw new Error('Production builds must have NODE_ENV=production.');
}

const plugins = [
  new CleanWebpackPlugin(['dist'], {
    root: path.resolve(__dirname, '../'),   //根目录
  }),
  new HtmlWebpackPlugin({
    inject: true,
    hash: true,
    template: paths.appHtml,
    minify: {
      removeComments: true,
      collapseWhitespace: true,
      removeRedundantAttributes: true,
      useShortDoctype: true,
      removeEmptyAttributes: true,
      removeStyleLinkTypeAttributes: true,
      keepClosingSlash: true,
      minifyJS: true,
      minifyCSS: true,
      minifyURLs: true,
    },
  }),
  new MiniCssExtractPlugin({
    filename: 'static/css/[contenthash].css'
  }),
  new HappyPack({
    id: '1',
    threadPool : happyThreadPool,
    use: ['babel-loader'],
    threads: 4
  }),
  new HappyPack({
    id: '2',
    threadPool: happyThreadPool,
    threads: 4,
    loaders: [
      {
        loader: 'css-loader',
        options: {
          importLoaders: 1,
          localIdentName: '[local]__[hash:base64:5]'
        }
      },
      'postcss-loader'
    ]
  }),
  new HappyPack({
    id: '3',
    threadPool: happyThreadPool,
    threads: 4,
    loaders: [
      {
        loader: 'css-loader',
        options: {
          importLoaders: 1
        }
      },
      'postcss-loader',
      {
        loader: 'less-loader',
        options: {
          sourceMap: true,
          modifyVars: {
              'primary-color': '#1DA57A',
              'link-color': '#1DA57A',
              'border-radius-base': '2px',
          },
          javascriptEnabled: true,
        }
      }
    ]
  }),
  new HappyPack({
    id: '4',
    threadPool: happyThreadPool,
    threads: 4,
    loaders: [
      {
        loader: 'css-loader',
        options: {
          importLoaders: 1,
          modules: true,
          localIdentName: '[name]__[local]__[hash:base64:5]'
        }
      },
      'postcss-loader',
      {
        loader: 'less-loader',
        options: { javascriptEnabled: true }
      }
    ]
  }),
  new ProgressBarPlugin(),
  new webpack.DefinePlugin(env.stringified),
  new ManifestPlugin({
    fileName: 'asset-manifest.json',
  }),
  new SWPrecacheWebpackPlugin({
    dontCacheBustUrlsMatching: /\.\w{8}\./,
    filename: 'service-worker.js',
    logger(message) {
      if (message.indexOf('Total precache size is') === 0) {
        return;
      }
      if (message.indexOf('Skipping static resource') === 0) {
        return;
      }
      console.log(message);
    },
    minify: true,
    navigateFallback: publicUrl + '/index.html',
    navigateFallbackWhitelist: [/^(?!\/__).*/],
    staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/],
  }),
  new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
]

// 生成打包后所有的依赖关系报告
if(process.env.ANALYZE) {
  plugins.push(new BundleAnalyzerPlugin());
}

module.exports = {
  mode: 'production',
  bail: true,
  entry: [require.resolve('./polyfills'), paths.appIndexJs],
  output: {
    path: paths.appBuild,
    filename: 'static/js/[name].[chunkhash:8].js',
    chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
    publicPath: publicPath,
    devtoolModuleFilenameTemplate: info =>
      path
        .relative(paths.appSrc, info.absoluteResourcePath)
        .replace(/\\/g, '/'),
  },
  resolve: {
    modules: ['node_modules', paths.appNodeModules].concat(
      process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
    ),
    extensions: ['.web.js', '.mjs', '.js', '.json', '.web.jsx', '.jsx'],
    alias: {
      'react-native': 'react-native-web',
      'components': path.resolve(__dirname, '../src/components'),
      'pages': path.resolve(__dirname, '../src/pages'),
      'utils': path.resolve(__dirname, '../src/utils'),
      'routes': path.resolve(__dirname, '../src/routes'),
      'services': path.resolve(__dirname, '../src/services'),
      '@': path.resolve(__dirname, '../src'),
    },
    plugins: [
      new ModuleScopePlugin(paths.appSrc, [paths.appPackageJson]),
    ],
  },
  module: {
    strictExportPresence: true,
    rules: [
      {
        oneOf: [
          {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg/],
            loader: require.resolve('url-loader'),
            options: {
              limit: 1000,
              name: 'static/images/[name].[hash:8].[ext]',
            },
          },
          {
            test: /\.(js|jsx|mjs)$/,
            include: paths.appSrc,
            loader: 'happypack/loader?id=1',
            options: {
              compact: true,
            },
          },
          {
            test: /\.(css)$/,
            loader: [
              MiniCssExtractPlugin.loader,
              'happypack/loader?id=2'
            ]
          },
          { // 由于antd不支持css modules，所以分别对antd的less和src下的less进行配置
            test: /\.(less)$/,
            include: /node_modules/,
            loader: [
              MiniCssExtractPlugin.loader,
              'happypack/loader?id=3'
            ]
          },
          {
            test: /\.(less)$/,
            exclude: /node_modules/,
            loader: [
              MiniCssExtractPlugin.loader,
              'happypack/loader?id=4'
            ]
          },
          {
            loader: require.resolve('file-loader'),
            exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
            options: {
              name: 'static/css/[name].[hash:8].[ext]',
            },
          },
        ],
      },
    ],
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 30000,
      maxSize: 0,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      automaticNameDelimiter: '~',
      name: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  plugins: plugins,
  node: {
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty',
  },
};

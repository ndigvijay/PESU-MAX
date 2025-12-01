module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: { chrome: '88' },
      modules: false
    }],
    ['@babel/preset-react', {
      runtime: 'automatic'
    }]
  ]
};

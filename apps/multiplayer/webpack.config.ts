import { composePlugins, withNx } from '@nx/webpack'

// Nx plugins for webpack.
module.exports = composePlugins(
  withNx({
    target: 'node',
    watch: true,
  }),
  (config) => {
    // Update the webpack config as needed here.
    // e.g. `config.plugins.push(new MyPlugin())`
    return config
  }
)

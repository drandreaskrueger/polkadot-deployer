const portastic = require('portastic');

const cmd = require('../core/cmd');
const files = require('../core/files');


class Kubectl {
  constructor(config) {
    this.config = JSON.parse(JSON.stringify(config));

    this.componentsPath = files.componentsPath()

    const kubeconfigPath = files.kubeconfigPath(config.name);

    this.options = {
      env: {
        KUBECONFIG: kubeconfigPath
      },
      cwd: this.componentsPath,
      verbose: config.verbose
    };
  }

  async waitNodesReady() {
    const labels = [];
    for (const n of Array(this.config.nodes).keys()) {
      labels.push(`node=polkadot-node-${n}`)
    }
    return this.waitPodsReady(labels);
  }

  async waitPodsReady(labels, namespace='default') {
    const promises = [];
    const options = Object.assign({ matcher: new RegExp('\\s*1\\/1') }, this.options);
    labels.forEach((label) => {
      promises.push(this.cmd(`get pods -l ${label} -n ${namespace} -w`, options));
    });
    return Promise.all(promises);
  }

  async portForward(podName, targetPort, namespace='default') {
    const port = await portastic.find({min: 11000, max: 12000});
    const options = Object.assign({
      detached: true,
      stdio: 'ignore'
    }, this.options);
    const pid = await this.cmd(`port-forward pods/${podName} ${port[0]}:${targetPort} -n ${namespace}`, options);

    return { pid, port: port[0] };
  }

  async deleteVolumeClaims(label='app=polkadot') {
    return this.cmd(`delete pvc -l ${label}`);
  }

  async cmd(command, options = {}) {
    const actualOptions = Object.assign({}, this.options, options);
    return cmd.exec(`./kubectl ${command}`, actualOptions);
  }
}

module.exports = {
  Kubectl
}

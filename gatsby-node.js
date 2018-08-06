const crypto = require("crypto")
const fetch = require("node-fetch")

exports.sourceNodes = ({ actions, createNodeId}, configOptions) => {
  const { createNode } = actions

  delete configOptions.plugins

  const processNode = (node) => {
    const nodeId = node.id
    const typeName = node.typeName
    delete node.id
    delete node.typeName

    const nodeContent = JSON.stringify(node)
    const nodeContentDigest = crypto
      .createHash("md5")
      .update(nodeContent)
      .digest("hex")

    const nodeData = Object.assign({}, node, {
      id: nodeId,
      parent: null,
      children: [],
      internal: {
	type: typeName,
	content: nodeContent,
	contentDigest: nodeContentDigest
      }
    })

    return createNode(nodeData)
  }

  const apiFetch = async (url) => fetch(url).then(resp => resp.json())

  return new Promise( async (resolve, reject) => {
    for( var packageNum in configOptions.packages ) {
      const packageName = configOptions.packages[packageNum]
      const packageUri = encodeURIComponent(packageName)
      const apiUrl = `https://api.npms.io/v2/package/${packageUri}`

      const response = await apiFetch(apiUrl)

      // remove issues distribution for now, breaks GraphQL schema
      delete response.collected.github.issues.distribution

      response.name = packageName
      response.id = createNodeId(`npms-package-${packageName}`)
      response.typeName = "NpmsPackage"

      processNode(response)
    }

    resolve()
  })
}

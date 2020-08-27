const BaseController = require('./BaseController')
const { NodesService } = require('../services')
const { NodeAddressInfo } = require('../protos')
const { response, ipstack } = require('../utils')

module.exports = class NodeAddress extends BaseController {
  constructor() {
    super(new NodesService())
  }

  async update(callback) {
    this.service.getNodeIds((err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('NodeAddress', `[Node Address] Nodes Service - Get Node IDs ${err}`))
      if (res && res.length < 1) return callback(response.setResult(false, '[Node Address] No additional data'))

      const params = { NodeIDs: res.map(i => i.NodeID) }
      NodeAddressInfo.GetNodeAddressInfo(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'NodeAddress',
              `[Node Address] Proto Get Node Address Info - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.NodeAddressesInfo.length < 1) return callback(response.setResult(false, '[Node Address] No additional data'))

        const promises = res.NodeAddressesInfo.map(async item => {
          const resIpStack = item.Address ? await ipstack.get(item.Address) : null

          return new Promise(resolve => {
            const payload = {
              NodeAddressInfo: item,
              NodeID: item.NodeID,
              IpAddress: item.Address,
              Port: item.Port,
              /** additional detail node address */
              CountryCode: (resIpStack && resIpStack.country_code) || null,
              CountryName: (resIpStack && resIpStack.country_name) || null,
              RegionCode: (resIpStack && resIpStack.region_code) || null,
              RegionName: (resIpStack && resIpStack.region_name) || null,
              City: (resIpStack && resIpStack.city) || null,
              Latitude: (resIpStack && resIpStack.latitude) || null,
              Longitude: (resIpStack && resIpStack.longitude) || null,
              CountryFlagUrl: (resIpStack && resIpStack.location && resIpStack.location.country_flag) || null,
              CountryFlagEmoji: (resIpStack && resIpStack.location && resIpStack.location.country_flag_emoji) || null,
            }

            this.service.findAndUpdate(payload, (err, res) => {
              if (err) return resolve({ err: `[Node Address] Node - Find And Update ${err}`, res: null })
              return resolve({ err: null, res })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const updates = results.filter(f => f.res !== null).map(i => i.res)

        if (updates && updates.length < 1 && errors.length < 1)
          return callback(response.setResult(false, `[Node Address] No additional data`))

        if (errors && errors.length > 0) return callback(response.sendBotMessage('NodeAddress', errors[0]))

        return callback(response.setResult(true, `[Node Address] Upsert ${updates.length} data successfully`))
      })
    })
  }
}
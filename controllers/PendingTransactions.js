const BaseController = require('./BaseController')
const { util, response } = require('../utils')
const { MultiSignature } = require('../protos')
const { MultiSignatureService, TransactionsService, GeneralsService } = require('../services')

module.exports = class PendingTransaction extends BaseController {
  constructor() {
    super(new MultiSignatureService())
    this.transactionsService = new TransactionsService()
    this.generalsService = new GeneralsService()
  }

  update(callback) {
    this.transactionsService.getTransactionSenderByParticipant((err, res) => {
      if (err)
        return callback(
          response.sendBotMessage(
            'Pending Transaction',
            `[Pending Transaction] Pending Transaction Service - Get Pending Transaction Hash ${err}`
          )
        )
      if (!res) return callback(response.setResult(false, '[Pending Transaction] No additional data'))

      res.forEach(txHash => {
        const params = {
          TransactionHashHex: Buffer.from(txHash.TransactionHash.toString('binary'), 'ascii').toString('hex'),
        }
        MultiSignature.GetPendingTransactionDetailByTransactionHash(params, (err, res) => {
          return new Promise(resolve => {
            if (err)
              return resolve(
                /** send message telegram bot if avaiable */
                response.sendBotMessage(
                  'Pending Transaction',
                  `[Pending Transaction] Proto Get Pending Transaction Detail by Tx Hash - ${err}`,
                  `- Params : <pre>${JSON.stringify(params)}</pre>`
                )
              )
            if (res && util.isObjEmpty(res.PendingTransaction))
              return resolve(response.setResult(false, `[Pending Transaction] No additional data`))

            let status = ''
            switch (res.PendingTransaction.Status) {
              case 'PendingTransactionPending':
                status = 'Pending'
                break
              case 'PendingTransactionExecuted':
                status = 'Executed'
                break
              case 'PendingTransactionNoOp':
                status = 'Rejected'
                break
              case 'PendingTransactionExpired':
                status = 'Expired'
                break
            }

            const payloads = {
              TransactionHash: res.PendingTransaction.TransactionHash,
              Status: status,
            }

            this.transactionsService.getTestFindAndUpdate(payloads, err => {
              if (err) return resolve(response.sendBotMessage('Pending Transaction', `[Pending Transaction] Upsert - ${err}`))
              return resolve(callback(response.setResult(true, `[Pending Transaction] Upsert data successfully`)))
            })
          })
        })
      })
    })
  }
}
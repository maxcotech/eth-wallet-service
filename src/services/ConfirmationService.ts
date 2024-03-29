import { AxiosError, AxiosInstance } from "axios";
import AppDataSource from "../config/dataSource";
import { TXN_CONFIRM_MIN } from "../config/settings";
import ReceivedTransaction from "../entities/ReceivedTransaction";
import Service from "./Service";
import { Repository } from 'typeorm';

export default class ConfirmationService extends Service {
     queueHandler: any = null;
     receivedRepo: Repository<ReceivedTransaction>
     constructor() {
          super();
          this.receivedRepo = AppDataSource.getRepository(ReceivedTransaction)

     }

     async confirmTransaction(txn: ReceivedTransaction, client: AxiosInstance) {
          try {
               if (txn.sentToVault != true) {
                    const response = await client.post(`transactions/chain/confirm`, {
                         transaction: txn.txHash
                    })
                    if (response.status === 200 || response.status === 204) {
                         console.log('Message sent successfully......', txn.txHash);
                         this.receivedRepo.update({ id: txn.id }, { confirmed: true });
                    }
               } else {
                    this.receivedRepo.update({ id: txn.id }, { confirmed: true });
               }

          }
          catch (e) {
               if (e instanceof AxiosError) {
                    console.log(e.response?.data ?? "Http Error occurred");
               } else {
                    console.log(e);
               }
          }

     }



     async processUnconfirmedTransactions(timeout = 5000) {
          if (this.queueHandler !== null) {
               clearTimeout(this.queueHandler);
               this.queueHandler = null;
          }
          try {
               this.queueHandler = setTimeout(async () => {
                    const txns = await this.receivedRepo.find({
                         where: { confirmed: false },
                         order: { id: "ASC" }
                    })
                    if (txns.length > 0) {
                         const currentBlockNumber = await this.provider.getBlockNumber();
                         const minRequiredConfirmations = parseInt(TXN_CONFIRM_MIN as string);
                         const client = await this.appClient();
                         for await (let txn of txns) {
                              const txnDetails = await this.provider.getTransaction(txn.txHash);
                              if (txnDetails?.blockNumber) {
                                   const confirmations = currentBlockNumber - txnDetails.blockNumber;
                                   if (confirmations >= minRequiredConfirmations) {
                                        await this.confirmTransaction(txn, client);
                                   }
                              }

                         }
                    }
                    return this.processUnconfirmedTransactions();

               }, timeout)
          }
          catch (e) {
               console.log(e);
               return this.processUnconfirmedTransactions(5000)
          }
     }

}
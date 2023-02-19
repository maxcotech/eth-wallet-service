import AppDataSource from "../config/dataSource";
import Service from "./Service";
import IndexedBlock from './../entities/IndexedBlock';
import { Repository } from 'typeorm';
import Wallet from "../entities/Wallet";
import { ethers } from 'ethers';
import ReceivedTransaction from "../entities/ReceivedTransaction";
import Contract from "../entities/Contract";
import { TRANSFER_FUNC_BYTE } from "../config/appConstants";
import TransactionService from "./TransactionService";
import { DECIMAL_PLACES, VAULT_ADDRESS } from "../config/settings";
import MessageQueueService from './MessageQueueService';
import VaultTransferService from "./VaultTransferService";

export default class AppService extends Service {
   
    timer: number = 1000 * 10 ; // Default 10 secs Interval
    indexedBlockRepo: Repository<IndexedBlock>;
    walletRepo: Repository<Wallet>;
    receivedTxnRepo: Repository<ReceivedTransaction>;
    contractRepo: Repository<Contract>;

    constructor(){
        super();
        this.indexedBlockRepo = AppDataSource.getRepository(IndexedBlock);
        this.walletRepo = AppDataSource.getRepository(Wallet);
        this.receivedTxnRepo = AppDataSource.getRepository(ReceivedTransaction);
        this.contractRepo = AppDataSource.getRepository(Contract);
    }
    public async syncBlockchainData() {
        try {
            console.log('syncing with the blockchain')
            await this.syncMissingBlocks();
            this.provider.on("block", async (blockNumber: number) => {
                const lastIndexed = await this.getLastIndexedNumber();
                if(lastIndexed < blockNumber){
                    this.processBlock(blockNumber);
                }
            })
        } catch (e) {
            console.log('Failed to sync with blockchain');
            if (e instanceof Error) {
                console.log(e.name, e.message, e.stack);
            }
        }
    }

    public async processBlock(blockNum: number){
        try{
            console.log(`Syncing block ${blockNum}`)
            const block = await this.provider.getBlockWithTransactions(blockNum);
            for await (let transaction of block.transactions){
                await this.processTransaction(transaction);
            }
            await this.updateBlockIndex(blockNum);
        }
        catch(e){
            console.log(`Failed to process block ${blockNum}`);
            if(e instanceof Error){
                console.log(e.message);
            }
        }
       
    }

    public async processTransaction(transaction: ethers.providers.TransactionResponse){
        try{
            const valueInEther = parseFloat(ethers.utils.formatEther(transaction.value));
            if(valueInEther <= 0){
                await this.processContractTransaction(transaction)
            } else {
                await this.processCoinTransaction(valueInEther.toString(),transaction);
            }
        }
        catch(e){
            console.log('processing txn failed ',transaction);
            if(e instanceof Error) console.log(e.message,e.stack);
        }
        
    }

    public async processCoinTransaction(valueInEther: string, transaction: ethers.providers.TransactionResponse){
        const toAddress = transaction.to?.toLowerCase() ?? "";
        const fromAddress = transaction.from.toLowerCase();
        const toAddressRecord = await this.walletRepo.findOne({where:{address:toAddress}});
        const sentToVault = (toAddress == VAULT_ADDRESS)
        if(!!toAddressRecord || sentToVault){
            console.log("Processing Related Coin Transaction", {fromAddress,toAddress,valueInEther});
            const txnService = new TransactionService();
            const newReceivedTxn = await txnService.saveReceivedTransaction(
                toAddress,sentToVault,transaction.hash,valueInEther
            )
            if(newReceivedTxn !== null && sentToVault === false){
                if(fromAddress !== VAULT_ADDRESS){
                    const messageService = new MessageQueueService();
                    await messageService.queueCreditTransaction(newReceivedTxn);
                    //send received funds to vault 
                    await txnService.sendTransferTransaction(
                        parseFloat(valueInEther),toAddress,VAULT_ADDRESS,undefined,true
                    )
                } else {
                    const vaultTransferService = new VaultTransferService();
                    await vaultTransferService.processPendingTokenToVaultTxn(toAddress);
                }
            }
        }
    }

    public async processContractTransaction(transaction: ethers.providers.TransactionResponse){
        try{
            const inputData = transaction.data;
            const contractAddress = transaction.to;
            if(inputData.indexOf(TRANSFER_FUNC_BYTE) !== -1){
                const contract = await this.contractRepo.findOne({where:{contractAddress: contractAddress}});
                if(contract !== null){
                    const contractInterface = new ethers.utils.Interface(JSON.parse(contract.contractAbi));
                    const parsedTxn = contractInterface.parseTransaction({data:transaction.data,value:transaction.value});
                    const toAddress = parsedTxn.args[0]?.toLowerCase() ?? "";
                    const walletRecord = await this.walletRepo.findOne({where:{address:toAddress}});
                    const sentToVault = (toAddress === VAULT_ADDRESS);
                    if(walletRecord !== null || sentToVault){
                        console.log('Found related contract transaction',transaction.hash)
                        const value = parsedTxn.args[1];
                        const valueInEther = ethers.utils.formatUnits(value,contract?.decimalPlaces ?? DECIMAL_PLACES);
                        const txnService = new TransactionService();
                        const newReceivedTxn = await txnService.saveReceivedTransaction(toAddress,sentToVault,transaction.hash,valueInEther,contract.id);
                        if(!!newReceivedTxn){
                            if(sentToVault === false){
                                const messageQueue = new MessageQueueService();
                                const vaultTransferService = new VaultTransferService();
                                await messageQueue.queueCreditTransaction(newReceivedTxn);
                                await vaultTransferService.recordPendingVaultTransfer(newReceivedTxn.address,VAULT_ADDRESS,transaction.hash,valueInEther,contract.id);
                                const feeEstimate = await txnService.fetchFeeEstimate(newReceivedTxn.address,true); 
                                console.log('fee estimate in ethers', parseFloat(ethers.utils.formatEther(feeEstimate as any))) //estimate the cost of sending received token to vault
                                await txnService.sendTransferTransaction(
                                    parseFloat(ethers.utils.formatEther(feeEstimate as ethers.BigNumberish)),
                                    VAULT_ADDRESS,
                                    newReceivedTxn.address
                                )
                            }
                        }
                    }
                }
            }
        }
        catch(e){
            console.log('Failed to process contract transaction',e);
            return false;
        }
        
    }

    public async syncMissingBlocks(){
        const latestBlockNum = await this.provider.getBlockNumber();
        const lastIndexed = await this.getLastIndexedNumber();
        console.log({latestBlockNum,lastIndexed});
        if(lastIndexed > 0){
            if(lastIndexed < latestBlockNum){
                await this.syncToCurrent(lastIndexed,latestBlockNum);
            }
        }
        return true;
    }

    public async syncToCurrent(lastSynced: number, currentNumber: number): Promise<number> {
        if(lastSynced >= currentNumber){
            return lastSynced;
        }
        const nextToSync = lastSynced + 1;
        console.log("syncing missing blocks ",nextToSync)
        await this.processBlock(nextToSync);
        return await this.syncToCurrent(nextToSync, currentNumber)
    }

    public async getLastIndexedNumber(){
        const indexes = await this.indexedBlockRepo.find({order:{blockNumber:"DESC"},take:1,skip:0});
        if(indexes.length === 0){
            return 0;
        } else {
            return indexes[0].blockNumber;
        }
    }

    public async updateBlockIndex(newIndex: number){
        const oldIndex = await this.getLastIndexedNumber();
        if(oldIndex === 0){
            const newIndexModel = new IndexedBlock();
            newIndexModel.blockNumber = newIndex;
            await this.indexedBlockRepo.save(newIndexModel);
        } else {
            await this.indexedBlockRepo.update({blockNumber:oldIndex},{blockNumber:newIndex})
        }
    }

}

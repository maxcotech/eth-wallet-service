import AppDataSource from "../config/dataSource";
import Service from "./Service";
import IndexedBlock from './../entities/IndexedBlock';
import { Repository } from 'typeorm';
import Wallet from "../entities/Wallet";
import { ethers } from 'ethers';
import ReceivedTransaction from "../entities/ReceivedTransaction";
import TransactionMessager from "../messagers/TransactionMessager";
import Contract from "../entities/Contract";
import { TRANSFER_FUNC_BYTE } from "../config/appConstants";

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
            await this.syncMissingBlocks();
            this.provider.on("block", async (blockNumber: number) => {
                const lastIndexed = await this.getLastIndexedNumber();
                if(lastIndexed < blockNumber){
                    console.log("New Block Found ",blockNumber)
                    this.processBlock(blockNumber);
                }
            })
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.name, e.message, e.stack);
            }
        }
    }

    public async processBlock(blockNum: number){
        const block = await this.provider.getBlockWithTransactions(blockNum);
        for await (let transaction of block.transactions){
            await this.processTransaction(transaction);
        }
        await this.updateBlockIndex(blockNum);
    }

    public async processTransaction(transaction: ethers.providers.TransactionResponse){
        const toAddress = transaction.to?.toLowerCase() ?? "";
        const valueInEther = ethers.utils.formatEther(transaction.value);
        
        if(toAddress !== undefined && toAddress !== "" && toAddress !== null && valueInEther !== "0" && valueInEther !== "" && valueInEther !== null){
            await this.processCoinTransaction(toAddress,valueInEther,transaction);
        } else {
            await this.processContractTransaction(toAddress,transaction)
        }
    }

    public async processCoinTransaction(toAddress: string, valueInEther: string, transaction: ethers.providers.TransactionResponse){
        const toAddressRecord = await this.walletRepo.findOne({where:{address:toAddress}});
        if(toAddressRecord !== null && toAddressRecord !== undefined){
            console.log("Processing Related Transaction for ",toAddress);
            const newReceivedTxn = new ReceivedTransaction();
            newReceivedTxn.address = toAddress ?? "";
            newReceivedTxn.txHash = transaction.hash;
            newReceivedTxn.value = valueInEther;
            await this.receivedTxnRepo.save(newReceivedTxn);
            const messager = new TransactionMessager();
            await messager.sendNewCreditTransaction(newReceivedTxn);
        }
    }

    public async processContractTransaction(contractAddress:string,transaction: ethers.providers.TransactionResponse){
        const inputData = transaction.data;
        if(inputData.indexOf(TRANSFER_FUNC_BYTE) !== -1){
            console.log("Found Contract Transaction ",contractAddress);
            const contract = await this.contractRepo.findOne({where:{contractAddress: contractAddress}});
            if(contract !== null){
                const contractInterface = new ethers.utils.Interface(JSON.parse(contract.contractAbi));
                const parsedTxn = contractInterface.parseTransaction({data:transaction.data,value:transaction.value});
                const toAddress = parsedTxn.args[0]?.toLowerCase() ?? "";
                const walletRecord = await this.walletRepo.findOne({where:{address:toAddress}});
                if(walletRecord !== null){
                    const value = parsedTxn.args[1];
                    const valueInEther = ethers.utils.formatUnits(value,contract?.decimalPlaces ?? process.env.DECIMAL_PLACES);
                    const newReceivedTxn = new ReceivedTransaction();
                    newReceivedTxn.address = toAddress;
                    newReceivedTxn.txHash = transaction.hash;
                    newReceivedTxn.contractId = contract.id;
                    newReceivedTxn.value = valueInEther;
                    await this.receivedTxnRepo.save(newReceivedTxn);
                    const messager = new TransactionMessager();
                    await messager.sendNewCreditTransaction({...newReceivedTxn,contractAddress});
                }
            }
        }
    }

    public async syncMissingBlocks(){
        const latestBlockNum = await this.provider.getBlockNumber();
        const lastIndexed = await this.getLastIndexedNumber();
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

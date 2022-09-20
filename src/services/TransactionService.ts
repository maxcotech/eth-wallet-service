import axios from 'axios';
import Service from './Service';
import { EtherscanFeeEstimate, FeeRatePayload } from './../dataTypes/Transaction';
import { config } from 'dotenv';
import { ethers } from 'ethers';
import WalletServices from './WalletServices';
import { Repository } from 'typeorm';
import ReceivedTransaction from '../entities/ReceivedTransaction';
import AppDataSource from '../config/dataSource';
import Wallet from '../entities/Wallet';
import { decryptValue } from '../helpers/object_helpers';

export default class TransactionService extends Service{
    vaultTxnInterval: number;
    receivedTxnRepo: Repository<ReceivedTransaction>;
    walletRepo: Repository<Wallet>;

    constructor(){
        super();
        config();
        this.vaultTxnInterval = 1000 * 60 * 5;
        this.receivedTxnRepo = AppDataSource.getRepository(ReceivedTransaction);
        this.walletRepo = AppDataSource.getRepository(Wallet);
    }
    async sendCoinToVault(fromAddress: string, amount: string, privateKey: any = null){
        const vaultAddr = process.env.VAULT_ADDRESS;
        const walletServices = new WalletServices();
        const wallet = (privateKey === null || privateKey === undefined)? await walletServices.fetchWalletFromAddress(fromAddress): walletServices.createWalletFromPrivateKey(privateKey);
        if(wallet !== null){
            const txnRequest = await wallet.populateTransaction({
                to: vaultAddr,
                value: ethers.utils.parseUnits(amount)
            });
            console.log(txnRequest);
           
        }
    }

    getGasLimit(){
        return 21000;
    }

    async getGasFeePayload(){
        config();
        const url = process.env.ETHERSCAN_URL;
        const apiKey = process.env.ETHERSCAN_API_KEY;
        const {data} = await axios.get(`${url}?module=gastracker&action=gasoracle&apikey=${apiKey}`);
        return data?.result as EtherscanFeeEstimate ?? {};
    }

    getFeeDifference(amount: number, gasPriceNum: number, decimal: number | null){
        const gasLimitNum = this.getGasLimit();
        const totalFee = gasLimitNum * gasPriceNum;
        return amount - parseFloat(ethers.utils.formatUnits(totalFee,decimal ?? process.env.DECIMAL_PLACES));
    }

    moveReceivedFundsToVault(){
        try{
            let handler = setTimeout(async () => {
                console.log("Forwarding Funds to vault");
                const vaultAddr = process.env.VAULT_ADDRESS;
                if(!!vaultAddr !== true){
                    console.log("Could not find any vault address");
                    return false;
                }
                const receivedTxns = await this.receivedTxnRepo.find({where:{sentToVault: false}});
                if(receivedTxns.length > 0){
                    for await (let txn of receivedTxns){
                        if(txn.address === vaultAddr){
                            await this.receivedTxnRepo.update({id:txn.id},{sentToVault: true});
                        } else {
                            
                        }
                    }
                }
                this.moveReceivedFundsToVault();
            },this.vaultTxnInterval)
        }
        catch(e){
            if(e instanceof Error){
                console.log(e.message);
            }
        }
    }

    async createCoinTransaction(fromAddress: string, toAddress: string, amount: string){
        const fromWalletModel = await this.walletRepo.findOne({where:{address:fromAddress.toLowerCase()}});
        if(fromWalletModel === null) throw new Error("Could not find an account for the sender address");
        const walletCrypt = decryptValue(fromWalletModel.walletCrypt);
        const fromWallet = await ethers.Wallet.fromEncryptedJson(walletCrypt,process.env.ENCRYPTION_PASSPHRASE ?? "");
        const conFromWallet = fromWallet.connect(this.provider);
        
        

    }

    



}

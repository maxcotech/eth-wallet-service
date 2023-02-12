import ECPairFactory from "ecpair";
import Service from "./Service";
import * as ecc from "tiny-secp256k1";
import { ethers } from "ethers";
import AppDataSource from "../config/dataSource";
import Wallet from "../entities/Wallet";
import { config } from "dotenv";
import { decryptValue } from "../helpers/object_helpers";
import { ENCRYPTION_PASSPHRASE, VAULT_ADDRESS, VAULT_PRIV_KEY } from "../config/settings";
import TransactionService from "./TransactionService";
import ValidationException from "../exceptions/ValidationException";
import { walletErrors } from "../config/errors/wallet.errors";

class WalletServices extends Service {

    getEcpair(){
        const ecpair = ECPairFactory(ecc);
        return ecpair;
    }

    createNewWallet(){
        const wallet =  ethers.Wallet.createRandom({})
        const connectedWallet = wallet.connect(this.provider);
        return connectedWallet;
    }

    createWalletFromPrivateKey(privateKey: any ){
        const wallet = new ethers.Wallet(privateKey,this.provider);
        return wallet;
    }

    async fetchWalletFromAddress(address: string, connectWallet: boolean = true){
        const walletRepo = AppDataSource.getRepository(Wallet);
        const walletModel = await walletRepo.findOne({where:{address}});
        if(walletModel === null){
            console.log('Could not find any account for selected address.....',address);
            if(address.toLowerCase() === VAULT_ADDRESS.toLowerCase()){
                console.log('returning vault address');
                return await this.getVaultWallet(connectWallet);
            } else {
                throw new ValidationException(walletErrors.walletNotFound);
            }
        } else {
            const walletCrypt = walletModel.walletCrypt;
            const decrypted = decryptValue(walletCrypt);
            let wallet = await ethers.Wallet.fromEncryptedJson(decrypted,ENCRYPTION_PASSPHRASE ?? "");
            if(connectWallet){
                wallet = wallet.connect(this.provider)
            }
            return wallet;
        }
    }

    async fetchTokenBalance(address: string, contractId: number){
        const txnService = new TransactionService();
        const contractApi = await txnService.getContractApi(contractId);
        const balance = await contractApi.balanceOf(address);
        return balance as ethers.BigNumber; //tronWeb.fromSun(balanceInSun, contract.decimalPlaces);
    }

    async getVaultWallet(connect = true){
        const wallet = new ethers.Wallet(VAULT_PRIV_KEY);
        if(connect){
            return wallet.connect(this.provider);
        }
        return wallet;
    }

    async fetchCoinBalance(address: string){
        const balance = await this.provider.getBalance(address)
        return balance;
    }


    
    
}

export default WalletServices
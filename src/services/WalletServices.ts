import ECPairFactory from "ecpair";
import Service from "./Service";
import * as ecc from "tiny-secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import CryptoJs from "crypto-js";
import { ethers } from "ethers";
import AppDataSource from "../config/dataSource";
import Wallet from "../entities/Wallet";
import { config } from "dotenv";
import { decryptValue } from "../helpers/object_helpers";

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

    async fetchWalletFromAddress(address: string){
        config();
        const walletRepo = AppDataSource.getRepository(Wallet);
        const walletModel = await walletRepo.findOne({where:{address}});
        if(walletModel === null) return null;
        const walletCrypt = walletModel.walletCrypt;
        const decrypted = decryptValue(walletCrypt);
        const wallet = ethers.Wallet.fromEncryptedJson(decrypted,process.env.ENCRYPTION_PASSPHRASE ?? "");
        return wallet;
    }

    
    
}

export default WalletServices
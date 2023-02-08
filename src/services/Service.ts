import  { AxiosInstance } from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { config } from "dotenv";
import { ethers } from 'ethers';
import AppDataSource from "../config/dataSource";
import { Repository } from 'typeorm';
import Contract from "../entities/Contract";
import { transactionErrors } from "../config/errors/transaction.errors";

class Service {
    
    network: bitcoin.networks.Network;
    baseUrl: string;
    wsBaseUrl: string;
    provider: ethers.providers.JsonRpcProvider;
    wsProvider: ethers.providers.WebSocketProvider;
    apiKey: string | undefined;
    client: AxiosInstance;
    jsonrpcVersion: 1.0;
    contractRepo: Repository<Contract>


    constructor(){
        config();
        this.network = bitcoin.networks.testnet;
        this.apiKey = process.env.GB_API_KEY;
        this.baseUrl = `https://eth.getblock.io/testnet/?api_key=${this.apiKey}`;
        this.wsBaseUrl = `wss://eth.getblock.io/testnet/?api_key=${this.apiKey}`;
        this.provider = new ethers.providers.AlchemyProvider("goerli","U6aQPfTVM2JtdZxf8Rsd1Su_UHLt-MAu")  //JsonRpcProvider(this.baseUrl);
        this.contractRepo = AppDataSource.getRepository(Contract);      
    }


    getConnection(){
        return this;
    }

    async getContract(contractId: number){
        const contract = await this.contractRepo.findOneBy({id: contractId});
        if(contract === null) throw new Error(transactionErrors.invalidContractTransaction);
        return contract;
    }


    

    getSingleParamReqBody(param: string ,method: string, id: string = "servicecall"){
        return {
            id,
            jsonrpc: this.jsonrpcVersion,
            method,
            params: [param]
        }
    }

    getRequest(method: string, params: Array<any> = [], id: string = "servicecall"){
        return this.client.post("",JSON.stringify({
            id,
            jsonrpc: this.jsonrpcVersion,
            method,
            params
        }),{
            maxContentLength: Infinity
        })
    }

}

export default Service;
import  { AxiosInstance } from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { config } from "dotenv";
import { ethers } from 'ethers';

class Service {
    
    network: bitcoin.networks.Network;
    baseUrl: string;
    wsBaseUrl: string;
    provider: ethers.providers.JsonRpcProvider;
    wsProvider: ethers.providers.WebSocketProvider;
    apiKey: string | undefined;
    client: AxiosInstance;
    jsonrpcVersion: 1.0


    constructor(){
        config();
        this.network = bitcoin.networks.testnet;
        this.apiKey = process.env.GB_API_KEY;
        this.baseUrl = `https://eth.getblock.io/testnet/?api_key=${this.apiKey}`;
        this.wsBaseUrl = `wss://eth.getblock.io/testnet/?api_key=${this.apiKey}`;
        this.provider = new ethers.providers.JsonRpcProvider(this.baseUrl);
    }


    getConnection(){
        return this;
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
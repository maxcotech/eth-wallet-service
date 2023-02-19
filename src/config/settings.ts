import { config } from "dotenv";
config();

export const GB_API_KEY = process.env.GB_API_KEY ?? "";
export const VAULT_ADDRESS = (process.env.VAULT_ADDRESS)? process.env.VAULT_ADDRESS.toLowerCase() : "";
export const DECIMAL_PLACES = process.env.DECIMAL_PLACES ?? 18;
export const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT ?? "";
export const ENCRYPTION_PASSPHRASE = process.env.ENCRYPTION_PASSPHRASE ?? "";
export const VAULT_PRIV_KEY = process.env.VAULT_PRIV_KEY ?? "";
export const CLIENT_AUTH = process.env.CLIENT_AUTH ?? ""; 
export const FAILED_MESSAGE_MAX_RETRIAL = process.env.FAILED_MESSAGE_MAX_RETRIAL ?? 1000;
export const WALLET_DEFAULT_SYMBOL = process.env.WALLET_DEFAULT_SYMBOL ?? "ETH";
export const RESERVE_BALANCE_PERCENTAGE = parseFloat(process.env.RESERVE_BALANCE_PERCENTAGE ?? "");
export const EIP_TYPE: number = parseInt(process.env.EIP_TYPE ?? "");
export const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:8000/api/v1/";
export const NETWORK_PATH = process.env.NETWORK_PATH ?? "mainnet";
export const ALCHEMY_KEY = process.env.ALCHEMY_KEY ?? "";
export const ALCHEMY_NODE = process.env.ALCHEMY_NODE;
export const MESSAGE_RETRY_LIMIT = parseInt(process.env.MESSAGE_RETRY_LIMIT ?? "100000")

//Database Specific Configs 
export const DB_TYPE = process.env.DB_TYPE ?? "mysql"
export const DB_HOST = process.env.DB_HOST 
export const DB_PASSWORD = process.env.DB_PASSWORD
export const DB_NAME = process.env.DB_NAME
export const DB_USER = process.env.DB_USER
export const DB_PORT = parseInt(process.env.DB_PORT ?? "3306")
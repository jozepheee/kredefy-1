import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
const POLYGON_RPC = process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology";
const POLYGONSCAN_API = process.env.POLYGONSCAN_API_KEY || "";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        amoy: {
            url: POLYGON_RPC,
            chainId: 80002,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            gasPrice: 30000000000, // 30 gwei
        },
        polygon: {
            url: process.env.POLYGON_MAINNET_RPC || "https://polygon-rpc.com",
            chainId: 137,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            gasPrice: 50000000000, // 50 gwei
        },
    },
    etherscan: {
        apiKey: {
            polygon: POLYGONSCAN_API,
            polygonAmoy: POLYGONSCAN_API,
        },
        customChains: [
            {
                network: "polygonAmoy",
                chainId: 80002,
                urls: {
                    apiURL: "https://api-amoy.polygonscan.com/api",
                    browserURL: "https://amoy.polygonscan.com",
                },
            },
        ],
    },
    paths: {
        sources: "./",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};

export default config;

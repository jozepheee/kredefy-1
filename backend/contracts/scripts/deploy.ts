/**
 * Deploy all Kredefy Smart Contracts to Polygon
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network amoy
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("🚀 Deploying Kredefy contracts...");
    console.log("📍 Deployer address:", deployer.address);
    console.log("💰 Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");
    console.log("");

    const deployedAddresses: Record<string, string> = {};

    // ============================================
    // 1. Deploy SaathiToken
    // ============================================
    console.log("📦 Deploying SaathiToken...");
    const SaathiToken = await ethers.getContractFactory("SaathiToken");
    const saathiToken = await SaathiToken.deploy();
    await saathiToken.waitForDeployment();
    const saathiAddress = await saathiToken.getAddress();
    deployedAddresses.SAATHI_TOKEN_ADDRESS = saathiAddress;
    console.log("✅ SaathiToken deployed to:", saathiAddress);

    // ============================================
    // 2. Deploy TrustScore (Soulbound NFT)
    // ============================================
    console.log("📦 Deploying TrustScore...");
    const TrustScore = await ethers.getContractFactory("TrustScore");
    const trustScore = await TrustScore.deploy();
    await trustScore.waitForDeployment();
    const trustAddress = await trustScore.getAddress();
    deployedAddresses.TRUST_SCORE_ADDRESS = trustAddress;
    console.log("✅ TrustScore deployed to:", trustAddress);

    // ============================================
    // 3. Deploy LoanRegistry
    // ============================================
    console.log("📦 Deploying LoanRegistry...");
    const LoanRegistry = await ethers.getContractFactory("LoanRegistry");
    const loanRegistry = await LoanRegistry.deploy();
    await loanRegistry.waitForDeployment();
    const registryAddress = await loanRegistry.getAddress();
    deployedAddresses.LOAN_REGISTRY_ADDRESS = registryAddress;
    console.log("✅ LoanRegistry deployed to:", registryAddress);

    // ============================================
    // 4. Deploy CircleDAO
    // ============================================
    console.log("📦 Deploying CircleDAO...");
    const CircleDAO = await ethers.getContractFactory("CircleDAO");
    const circleDAO = await CircleDAO.deploy();
    await circleDAO.waitForDeployment();
    const daoAddress = await circleDAO.getAddress();
    deployedAddresses.CIRCLE_DAO_ADDRESS = daoAddress;
    console.log("✅ CircleDAO deployed to:", daoAddress);

    // ============================================
    // 5. Deploy EmergencyFund
    // ============================================
    console.log("📦 Deploying EmergencyFund...");
    const EmergencyFund = await ethers.getContractFactory("EmergencyFund");
    const emergencyFund = await EmergencyFund.deploy();
    await emergencyFund.waitForDeployment();
    const fundAddress = await emergencyFund.getAddress();
    deployedAddresses.EMERGENCY_FUND_ADDRESS = fundAddress;
    console.log("✅ EmergencyFund deployed to:", fundAddress);

    // ============================================
    // Summary
    // ============================================
    console.log("");
    console.log("═══════════════════════════════════════════════");
    console.log("🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("═══════════════════════════════════════════════");
    console.log("");
    console.log("Add these to your .env file:");
    console.log("");
    for (const [key, value] of Object.entries(deployedAddresses)) {
        console.log(`${key}=${value}`);
    }

    // Save to file
    const envPath = path.join(__dirname, "../../.env.contracts");
    let envContent = "# Deployed Contract Addresses\n";
    envContent += `# Network: ${(await ethers.provider.getNetwork()).name}\n`;
    envContent += `# Deployer: ${deployer.address}\n`;
    envContent += `# Timestamp: ${new Date().toISOString()}\n\n`;

    for (const [key, value] of Object.entries(deployedAddresses)) {
        envContent += `${key}=${value}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("");
    console.log(`📄 Contract addresses saved to: ${envPath}`);

    // Verify instructions
    console.log("");
    console.log("To verify on Polygonscan:");
    for (const [name, address] of Object.entries(deployedAddresses)) {
        const contractName = name.replace("_ADDRESS", "").replace(/_/g, "");
        console.log(`npx hardhat verify --network amoy ${address}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });

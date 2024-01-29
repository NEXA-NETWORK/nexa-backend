import { ethers, network, upgrades } from "hardhat";
import hre from 'hardhat'


const DeploymentConfig = require(`${__dirname}/../deployment_config.js`);
const proxyAddress = "0x13fF116a1164402cE6c72Ff63D21F1Bb37Fb43e6"
async function deploy() {

  console.info('hrere', hre.network.config)
  const config = DeploymentConfig[network.name];
  if (!config) {
    throw Error("deployment config undefined");
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address, config.deployImplementationOnly);

  const CATRelayerImplementationNFT = await ethers.getContractFactory("CATRelayerImplementationNFT");
  const CATRelayerSetupFactory = await ethers.getContractFactory("CATRelayerSetup");
  const CATRelayerProxyFactory = await ethers.getContractFactory("CATRelayerProxy");

  try { 
  console.log("Deploying CATRelayerImplementationNFT...")
  const cATRelayerImplementationNFT = await CATRelayerImplementationNFT.deploy();
  console.log("AFTER Deploying CATRelayerImplementationNFT...")


    console.info("WAITING JUST RPC SYNC (5s)...")
    await wait(5)

    try {
      await hre.run("verify:verify", {
        address: cATRelayerImplementationNFT.address,
        contract: "contracts/relayer/CATRelayerImplementationNFT.sol:CATRelayerImplementationNFT",
        constructorArguments: [],
      });

      console.log("Verified Successfully CATRelayerImplementationNFT");
    } catch (error) {
      console.log("Verification Failed CATRelayerImplementationNFT.: ", error);
    }
  if (!config.deployImplementationOnly) {
    const cATRelayerSetup = await CATRelayerSetupFactory.deploy();
    console.info("WAITING JUST RPC SYNC (5s)...")
    await wait(5)
    try {
      await hre.run("verify:verify", {
        address: cATRelayerImplementationNFT.address,
        contract: "contracts/relayer/CATRelayerSetup.sol:CATRelayerSetup",
        constructorArguments: [],
      });

      console.log("Verified Successfully setup Contract");
    } catch (error) {
      console.log("Verification Failed Setup: ", error);
    }
    // @ts-ignore
    const encodedInitData = cATRelayerSetup.interface.encodeFunctionData(
      'setup',
      [cATRelayerImplementationNFT.address, config.wormholeBridge, config.wormholeChainId, deployer.address]
    );



  console.log("DEPLOYED AND ENCODE=> ", encodedInitData, cATRelayerImplementationNFT.address, cATRelayerSetup.address)

  const CATRelayerProxy = await CATRelayerProxyFactory.deploy(cATRelayerSetup.address, encodedInitData);


    try {
      await hre.run("verify:verify", {
        address: cATRelayerImplementationNFT.address,
        contract: "contracts/relayer/CATRelayerProxy.sol:CATRelayerProxy",
        constructorArguments: [cATRelayerSetup.address, encodedInitData],
      });

      console.log("Verified Successfully Proxy Contract");
    } catch (error) {
      console.log("Verification Failed Proxy:  ", error);
    }
  console.log("Proxy deployed at: ", CATRelayerProxy.address);

  } else {
    
      const cATRelayerProxyContract =  await CATRelayerImplementationNFT.attach(proxyAddress);
      const tx = await cATRelayerProxyContract.upgrade(cATRelayerImplementationNFT.address);
      await tx.wait();
      
      const chainId = await cATRelayerProxyContract.chainId();
      console.log("UPGRADED TO: ", cATRelayerImplementationNFT.address, chainId);

  }

} catch (error) {
  console.error("error ->", error)
}

 



}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


async function wait(timeInSeconds: number): Promise<void> {
  await new Promise((r) => setTimeout(r, timeInSeconds * 1000));
}
import { ethers, network, upgrades } from "hardhat";
import hre from 'hardhat'


const DeploymentConfig = require(`${__dirname}/../deployment_config.js`);
const proxyAddress = "0xA3aAd124C011aAC8444F5E665689e89E7c6504C2"
async function deploy() {

  const config = DeploymentConfig[network.name];
  if (!config) {
    throw Error("deployment config undefined");
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const CATRelayerImplementationFactory = await ethers.getContractFactory("CATRelayerImplementation");
  const CATRelayerSetupFactory = await ethers.getContractFactory("CATRelayerSetup");
  const CATRelayerProxyFactory = await ethers.getContractFactory("CATRelayerProxy");

  try {
  console.log("Deploying CATRelayerImplementation...")
  const cATRelayerImplementation = await CATRelayerImplementationFactory.deploy();
  console.log("AFTER Deploying CATRelayerImplementation...")


    console.info("WAITING JUST RPC SYNC (5s)...")
    await wait(5)

    try {
      await hre.run("verify:verify", {
        address: cATRelayerImplementation.address,
        contract: "contracts/relayer/CATRelayerImplementation.sol:CATRelayerImplementation",
        constructorArguments: [],
      });

      console.log("Verified Successfully IMPLEMENTATION");
    } catch (error) {
      console.log("Verification Failed Implementation.: ", error);
    }
  if (!config.deployImplementationOnly) {
    const cATRelayerSetup = await CATRelayerSetupFactory.deploy();
    console.info("WAITING JUST RPC SYNC (5s)...")
    await wait(5)
    try {
      await hre.run("verify:verify", {
        address: cATRelayerImplementation.address,
        contract: "contracts/relayer/CATRelayerSetup.sol:CATRelayerSetup",
        constructorArguments: [],
      });

      console.log("Verified Successfully setup Contract");
    } catch (error) {
      console.log("Verification Failed Setup: ", error);
    }
    const encodedInitData = cATRelayerSetup.interface.encodeFunctionData(
      'setup',
      [cATRelayerImplementation.address, config.wormholeBridge, config.wormholeChainId, deployer.address]
    );



  console.log("DEPLOYED AND ENCODE=> ", encodedInitData, cATRelayerImplementation.address, cATRelayerSetup.address)

  const CATRelayerProxy = await CATRelayerProxyFactory.deploy(cATRelayerSetup.address, encodedInitData);


    try {
      await hre.run("verify:verify", {
        address: cATRelayerImplementation.address,
        contract: "contracts/relayer/CATRelayerProxy.sol:CATRelayerProxy",
        constructorArguments: [cATRelayerSetup.address, encodedInitData],
      });

      console.log("Verified Successfully Proxy Contract");
    } catch (error) {
      console.log("Verification Failed Proxy:  ", error);
    }
  console.log("Proxy deployed at: ", CATRelayerProxy.address);

  } else {
    
      const cATRelayerProxyContract =  await CATRelayerImplementationFactory.attach(proxyAddress);
      const tx = await cATRelayerProxyContract.upgrade(cATRelayerImplementation.address);
      await tx.wait();
      
      const chainId = await cATRelayerProxyContract.chainId();
      console.log("UPGRADED TO: ", cATRelayerImplementation.address, chainId);

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

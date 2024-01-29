import { ethers, network, upgrades } from "hardhat";
import hre from 'hardhat'
const { getSelectors, FacetCutAction } = require('./libraries/diamond')

const DeploymentConfig = require(`${__dirname}/../deployment_config.js`);

const diamondAddress = '0x9A82776580aB1511C7aFF2Bf8eD3551d9c97Ecda'
async function deploy() {

  const config = DeploymentConfig[network.name];
  if (!config) {
    throw Error("deployment config undefined");
  }

  const [deployer] = await ethers.getSigners();
  
  
  const DiamondLoupFacet = await ethers.getContractFactory('DiamondLoupeFacet')
  const diamondLoupFacet  = DiamondLoupFacet.connect(deployer).attach(diamondAddress)
  
  const allFacets = await diamondLoupFacet.facets()
  console.log("All Facets", allFacets.length)
  console.log("Deploying contracts with the account:", deployer.address);
  try {
  const FacetName = 'CATTokenFacet'
  
  console.log('Deploying facet => ', FacetName)
    
    const Facet = await ethers.getContractFactory(FacetName)
    const facet = await Facet.deploy()
    await facet.deployed()
    const facetCuts = []
    
    
    const functionSelectors = getSelectors(facet);
    facetCuts.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors,
    })
    
    
    console.log(`${FacetName} deployed: ${facet.address}`)
    
    console.log("Before Verifing Facet. Waiting for 10 seconds")
    await wait(10);
    try {
      await hre.run("verify:verify", {
        address: facet.address,
        contract: `contracts/relayer/facets/${FacetName}.sol:${FacetName}`,
        constructorArguments: [],
      });

      console.log("Verified Successfully FACET", FacetName);
    } catch (error) {
      console.log("Verification Failed Implementation.: ", error);
    }
    // update Diamond
    

    const DiamondFacet = await ethers.getContractFactory('DiamondCutFacet')
    
    const diamondCutFacet  = DiamondFacet.connect(deployer).attach(diamondAddress)
    

    
    const tx = await diamondCutFacet.diamondCut(facetCuts, ethers.constants.AddressZero, '0x');
    const receipt = await tx.wait();
    
    
    
    console.log("updated Diamond with new facet Done.")
  } catch (error) {
    console.error("error in relayer deploy->", error)
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

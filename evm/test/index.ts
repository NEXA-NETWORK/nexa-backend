import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { arrayify, zeroPad } from "ethers/lib/utils";



describe("CAT Relayer Tests", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function setup() {

    // Contracts are deployed using the first signer/account by default
    const [owner, user] = await ethers.getSigners();

    const CATRelayerImplementationFactory = await ethers.getContractFactory("CATRelayerImplementation");
    const CATRelayerSetupFactory = await ethers.getContractFactory("CATRelayerSetup");
    const CATRelayerProxyFactory = await ethers.getContractFactory("CATRelayerProxy");


    const CATRelayerImplementation = await CATRelayerImplementationFactory.deploy();
    const CATRelayerSetup = await CATRelayerSetupFactory.deploy();



    const encodedInitData = CATRelayerSetup.interface.encodeFunctionData("setup", [CATRelayerImplementation.address, CATRelayerImplementation.address, 1, owner.address]);

    const CATRelayerProxy = await CATRelayerProxyFactory.deploy(CATRelayerSetup.address, encodedInitData);

    console.log("Proxy deployed at: ", CATRelayerProxy.address);


    const CATRelayerContract =  await CATRelayerImplementation.attach(CATRelayerProxy.address);

  
    return { user, owner, CATRelayerContract };
  }

  describe("Relayer Tests", function () {
    it("Should deploy contract with owner", async function () {
      const { CATRelayerContract, user, owner } = await loadFixture(setup);
      const tx = await CATRelayerContract.connect(owner).deployToken("Test Token", "TT", 18, '10000000000000000000000', "0x33663433656466352d376361392d343561362d613464662d6665636335656523", owner.address, 1)
      const receipt = await tx.wait()
      const address = await CATRelayerContract.connect(owner).computeAddress("0x33663433656466352d376361392d343561362d613464662d6665636335656523", "Test Token", "TT", 18, );
        console.info("--- ADDRESS ---", address);
      let tokenDeployEvent = null;
      // @ts-ignore
      for (const event of receipt.events) {
        if (event.event == "TokenDeployed") {
          tokenDeployEvent = event;
          console.info("--- EVENT ---", event.args);
          break;
        }
      }

      expect(tokenDeployEvent).to.not.be.null;

    });

    it("Should not deploy contract without owner", async function () {
      const { CATRelayerContract, user, owner } = await loadFixture(setup);
      await expect(CATRelayerContract.connect(user).deployToken("Test Token", "TT", 18, '10000000000000000000000', ethers.constants.HashZero, owner.address, 1)).to.be.revertedWith("Caller is not a admin");
    });
  });

  it("Should initiate token deployment", async function () {
    const { CATRelayerContract, user, owner } = await loadFixture(setup);
    const abiEncoder = new ethers.utils.AbiCoder();
    const params = abiEncoder.encode(["string", "string", "uint8", "uint256"], ["Test Token", "TT", 18, 1000000000]);
    const destinationChains = [1, 2, 3]; 
    const gasValues = [100000, 100000, 100000];
    const tokenMintingChain = 1;
    const value = 100000 + 100000 + 100000
    const tx = await CATRelayerContract.connect(user).initiateTokensDeployment(params, destinationChains, gasValues, tokenMintingChain, {value: value});
    const receipt = await tx.wait()
    // @ts-ignore
    expect(receipt.events.length).to.equal(1);
  });

  it("Should not initiate token deployment without gas value", async function () {
    const { CATRelayerContract, user, owner } = await loadFixture(setup);
    const abiEncoder = new ethers.utils.AbiCoder();
    const params = abiEncoder.encode(["string", "string", "uint8", "uint256"], ["Test Token", "TT", 18, 1000000000]);
    const destinationChains = [1, 2, 3]; 
    const gasValues = [100000, 100000, 100000];
    const tokenMintingChain = 1;
    const value = 0
    expect(CATRelayerContract.connect(user).initiateTokensDeployment(params, destinationChains, gasValues, tokenMintingChain, {value: value})).to.be.revertedWith("invalid value for gas");
  });

  it("Should initiate token bridge", async function () {
    const { CATRelayerContract, user, owner } = await loadFixture(setup);
    
  });
});


const noExponents = function (expNum: any) {
  const data = String(expNum).split(/[eE]/)
  if (data.length == 1) return data[0]

  let z = ''
  const sign = expNum < 0 ? '-' : ''
  const str = data[0].replace('.', '')
  let mag = Number(data[1]) + 1

  if (mag < 0) {
    z = sign + '0.'
    while (mag++) z += '0'
    return z + str.replace(/^/, '')
  }
  mag -= str.length
  while (mag--) z += '0'
  return str + z
}

async function wait(timeInSeconds: number): Promise<void> {
  await new Promise((r) => setTimeout(r, timeInSeconds * 1000));
}
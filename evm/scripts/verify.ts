import { ethers, network, upgrades } from "hardhat";
import hre from 'hardhat'

async function verify() {
    try {
        await hre.run("verify:verify", {
            address: "0x7DE9c7aEc92e4df3865E4026ecAAE5eBd259Faa3",
            contract: "contracts/cat/ERC20/CATERC20.sol:CATERC20",
            constructorArguments: ["CAT_TEST", "CAT_TEST", 6, "10000000000000000000000"],
        });

        console.log("Verified Successfully IMPLEMENTATION");
    } catch (error) {
        console.log("Verification Failed Implementation.: ", error);
    }
}
verify().catch((error: Error) => {
    console.error(error);
    process.exitCode = 1;
});


async function wait(timeInSeconds: number): Promise<void> {
    await new Promise((r) => setTimeout(r, timeInSeconds * 1000));
}
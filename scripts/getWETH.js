// deposits our ETH token for WETH Token

const { getNamedAccounts, ethers } = require("hardhat")

const AMT = ethers.parseEther("0.1")

async function getWETH() {
    console.log("From getWETH.")
    const {deployer} = await getNamedAccounts();
    console.log(`deployer: ${deployer}`)

    // signer -> A signer is an object that represents an Ethereum account that can sign transactions and messages. It is used to send transactions, sign data, and interact with smart contracts on behalf of an account.

    // deployer ->  a deployer is typically the signer or account used to deploy a smart contract to the blockchain. This term is often used in deployment scripts to refer to the specific signer that will carry out the deployment process.

    const signer = await ethers.provider.getSigner()
    console.log(`Signer: ${signer}`)

    //call deposit() on WETH contract
    // needs: 
    // abi - interface compile -> yarn hardhat compile,
    // and contract address - WETH Mainnet contract address from https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2

    const iWeth = await ethers.getContractAt(
        "IWeth", // abi or name
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        signer // signer
    )

    const tx = await iWeth.deposit({ value: AMT }) // deposits in contract
    console.log(`tx: ${tx}`)
    await tx.wait(1)
    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Got WETH Balance: ${wethBalance.toString()} WETH`)
}

module.exports = { getWETH, AMT }
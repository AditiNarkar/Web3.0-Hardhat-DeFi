// all functions available at
//https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#getuseraccountdata

const { getWETH, AMT } = require("./getWETH")
const { getNamedAccounts } = require("hardhat")

async function main() {
    // protocol treats everything as ERC20 Token
    console.log("Started...")
    await getWETH()

    const signer = await ethers.provider.getSigner()

    const lendingPoolContract = await getLendingPoolContract(signer)
    console.log(`lendingPoolContractAddress: ${lendingPoolContract.target}`)

    const WETHContractAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

    console.log("Approving...")
    await approveERC20(WETHContractAddress, lendingPoolContract.target, AMT, signer)

    console.log("Depositing...")
    // function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)
    await lendingPoolContract.deposit(WETHContractAddress, AMT, signer, 0)
    console.log("Deposited.")


    let { availableBorrowsETH, totalDebtETH } = await getUserData_toBorrrow(lendingPoolContract, signer)
    // availableETH should be swapped with DAI, what is conversion rate ?
    const DAI_Price = await getDAIprice()
    const availableBorrowsDAI = availableBorrowsETH.toString() * 0.95 * (1 / Number(DAI_Price)) // just borrow 95%
    console.log(`Can Borrow DAI: ${availableBorrowsDAI}`)

    const availableBorrowsDAI_WEI = ethers.parseEther(availableBorrowsDAI.toString())
    console.log(`Can Borrow WEI: ${availableBorrowsDAI_WEI}`)

    const DAITokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F" // DAI is token asset as well as contract
    await borrowDAI(DAITokenAddress, lendingPoolContract, availableBorrowsDAI_WEI, signer)

    await getUserData_toBorrrow(lendingPoolContract, signer)
    // Total collatoral increases as we gain interest by depositing

    await repay_borrowed(DAITokenAddress, lendingPoolContract, availableBorrowsDAI_WEI, signer)
    await getUserData_toBorrrow(lendingPoolContract, signer)
    // Borrowed ETH doesnt become 0 as it also makes interest

}



async function repay_borrowed(
    DAITokenAddress,
    lendingPoolContract,
    amt,
    acc
) {
    // function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)
    await approveERC20(DAITokenAddress, lendingPoolContract.target, amt, acc)
    const repayTx = await lendingPoolContract.repay(DAITokenAddress, amt, 2, acc)
    await repayTx.wait(1)
    console.log("Repayed!")
}



async function borrowDAI(DAITokenAddress, lendingPoolContract, toBorrowAMT, account) {
    // function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)
    const borrowTX = await lendingPoolContract.borrow(DAITokenAddress, toBorrowAMT, 2, 0, account)
    await borrowTX.wait(1)
    console.log("Borrowing Complete.")
}


async function getDAIprice() {
    // to get price feed use AggregatorV3Interface and Chainlink address -> https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1&search=dai
    const DAI_PriceFeedContract = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await DAI_PriceFeedContract.latestRoundData())[1] // we just want answer, which is at 2nd to return
    console.log(`DAI/ETH Price: ${price}`)
    return price
}



// how much we have borrowed, how much we have in collateral, how much we can borrow
async function getUserData_toBorrrow(lendingPoolContract, account) {
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH
    } = await lendingPoolContract.getUserAccountData(account);

    console.log(`Total Collatoral Deposited: ${totalCollateralETH}`)
    console.log(`Borrowed ETH: ${totalDebtETH}`)
    console.log(`Can Borrow ETH: ${availableBorrowsETH}`)
    return {
        availableBorrowsETH,
        totalDebtETH
    }
}




async function getLendingPoolContract(account) {
    const providerContract = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        // LendingPoolAddressProvider -> 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5 from https://docs.aave.com/developers/v/2.0/deployed-contracts/deployed-contracts
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const address = await providerContract.getLendingPool()

    const lendingPoolContract = await ethers.getContractAt(
        "ILendingPool",
        address,
        account
    )
    return lendingPoolContract;
}

// spender is the address that we are giving approval to spend amt amount
async function approveERC20(erc20Address, spenderAddress, amt, account) {
    const ERC20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        account
    )
    const tx = await ERC20Token.approve(spenderAddress, amt)
    await tx.wait(1)
    console.log("Approved.")
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract TestERC20 is ERC20 {

  constructor(
    string memory name, 
    string memory symbol,
    uint256 decimals,
    uint256 cap
  ) ERC20(name, symbol) {
    _mint(_msgSender(), cap * 10**decimals);
  }
}
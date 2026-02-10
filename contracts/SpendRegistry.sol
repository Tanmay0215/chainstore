// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SpendRegistry {
    event SpendLogged(address indexed payer, string stepId, uint256 amount, string memo);

    function logSpend(string calldata stepId, uint256 amount, string calldata memo) external {
        emit SpendLogged(msg.sender, stepId, amount, memo);
    }
}

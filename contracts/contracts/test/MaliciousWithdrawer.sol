// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRootsave {
    function withdraw() external;
}

contract MaliciousWithdrawer {
    IRootsave public rootsave;
    
    constructor(address _rootsave) {
        rootsave = IRootsave(_rootsave);
    }
    
    function attack() external {
        rootsave.withdraw();
    }
}
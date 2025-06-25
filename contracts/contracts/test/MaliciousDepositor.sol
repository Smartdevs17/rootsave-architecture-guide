// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRootsave {
    function deposit() external payable;
}

contract MaliciousDepositor {
    IRootsave public rootsave;
    
    constructor(address _rootsave) {
        rootsave = IRootsave(_rootsave);
    }
    
    function attack() external payable {
        rootsave.deposit{value: msg.value}();
    }
}
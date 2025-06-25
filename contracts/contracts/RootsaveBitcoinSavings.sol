// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Rootsave Bitcoin Savings
 * @author Rootsave Team
 * @notice A simple Bitcoin savings contract on Rootstock earning 5% APY
 * @dev Implements basic deposit/withdraw functionality with time-based yield calculation
 * 
 * Key Features:
 * - Deposit RBTC and earn 5% APY
 * - Withdraw anytime with accrued interest
 * - Reentrancy protection using OpenZeppelin patterns
 * - EOA-only access for enhanced security
 * 
 * Security Patterns:
 * - Checks-Effects-Interactions (CEI) pattern
 * - Reentrancy guard
 * - External account only access
 * - Safe math operations (Solidity 0.8+)
 */
contract RootsaveBitcoinSavings {
    
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice User deposits mapping: address => RBTC amount
    mapping(address => uint256) private deposits;
    
    /// @notice User deposit timestamps: address => block.timestamp
    mapping(address => uint256) private depositTime;
    
    /// @notice Annual yield rate in basis points (500 = 5%)
    uint256 private constant ANNUAL_YIELD_RATE = 500;
    
    /// @notice Basis points denominator (10000 = 100%)
    uint256 private constant BASIS_POINTS = 10000;
    
    /// @notice Seconds in a year for APY calculation
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    
    /// @notice Reentrancy guard states
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Emitted when user deposits RBTC
    /// @param user Address of the depositor
    /// @param amount Amount of RBTC deposited
    /// @param timestamp Deposit timestamp
    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    
    /// @notice Emitted when user withdraws RBTC + yield
    /// @param user Address of the withdrawer
    /// @param principal Original deposit amount
    /// @param yield Earned yield amount
    /// @param total Total withdrawal amount (principal + yield)
    event Withdraw(address indexed user, uint256 principal, uint256 yield, uint256 total);
    
    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Prevents reentrancy attacks using OpenZeppelin pattern
     * @dev Uses storage slot to track execution state
     */
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    
    /**
     * @notice Ensures only externally owned accounts (EOA) can call functions
     * @dev Prevents contract-to-contract calls for enhanced security
     */
    modifier onlyEOA() {
        require(tx.origin == msg.sender, "Only EOA allowed");
        _;
    }
    
    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Initialize the contract with reentrancy guard
     * @dev Sets initial reentrancy status to NOT_ENTERED
     */
    constructor() {
        _status = _NOT_ENTERED;
    }
    
    /**
     * @notice Allows contract to receive RBTC directly
     * @dev Required for contract funding and yield pool management
     */
    receive() external payable {
        // Contract can receive RBTC for yield funding
        // No logic needed - just accept the funds
    }
    
    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Deposit RBTC to start earning 5% APY
     * @dev Updates user deposit and timestamp, follows CEI pattern
     * 
     * Requirements:
     * - Must send RBTC (msg.value > 0)
     * - Only EOA can call
     * - Reentrancy protected
     * - No existing deposit (must withdraw first)
     * 
     * Effects:
     * - Records deposit amount and timestamp
     * - Emits Deposit event
     */
    function deposit() external payable nonReentrant onlyEOA {
        // Checks
        require(msg.value > 0, "Deposit amount must be greater than 0");
        require(deposits[msg.sender] == 0, "Must withdraw existing deposit first");
        
        // Effects
        deposits[msg.sender] = msg.value;
        depositTime[msg.sender] = block.timestamp;
        
        // Emit event (part of Effects)
        emit Deposit(msg.sender, msg.value, block.timestamp);
        
        // No external interactions needed
    }
    
    /**
     * @notice Withdraw principal + 5% APY based on time held
     * @dev Calculates yield and transfers total amount, follows CEI pattern
     * 
     * Requirements:
     * - Must have active deposit
     * - Only EOA can call  
     * - Reentrancy protected
     * 
     * Effects:
     * - Calculates total amount (principal + yield)
     * - Resets user deposit state
     * - Transfers RBTC to user
     * - Emits Withdraw event
     */
    function withdraw() external nonReentrant onlyEOA {
        // Checks
        uint256 principal = deposits[msg.sender];
        require(principal > 0, "No deposit found");
        
        // Effects - Calculate yield and total
        uint256 timeHeld = block.timestamp - depositTime[msg.sender];
        uint256 yieldEarned = _calculateYield(principal, timeHeld);
        uint256 totalAmount = principal + yieldEarned;
        
        // Ensure we don't exceed contract balance (safety check)
        uint256 contractBalance = address(this).balance;
        if (totalAmount > contractBalance) {
            totalAmount = contractBalance;
            yieldEarned = contractBalance > principal ? contractBalance - principal : 0;
        }
        
        // Effects - Reset user state BEFORE external call
        deposits[msg.sender] = 0;
        depositTime[msg.sender] = 0;
        
        // Emit event (part of Effects)
        emit Withdraw(msg.sender, principal, yieldEarned, totalAmount);
        
        // Interactions - External call last
        (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
        require(success, "Transfer failed");
    }
    
    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Calculate yield based on principal amount and time held
     * @dev Uses simple interest formula: principal * rate * time / year
     * @param principal The deposited amount
     * @param timeHeld Time in seconds the deposit was held
     * @return yieldAmount The calculated yield in RBTC
     */
    function _calculateYield(uint256 principal, uint256 timeHeld) 
        private 
        pure 
        returns (uint256 yieldAmount) 
    {
        // Simple interest: P * R * T / (BASIS_POINTS * SECONDS_PER_YEAR)
        yieldAmount = (principal * ANNUAL_YIELD_RATE * timeHeld) / (BASIS_POINTS * SECONDS_PER_YEAR);
    }
    
    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Get user's current deposit amount
     * @param user Address to check
     * @return Deposited RBTC amount
     */
    function getUserDeposit(address user) external view returns (uint256) {
        return deposits[user];
    }
    
    /**
     * @notice Get user's deposit timestamp
     * @param user Address to check  
     * @return Timestamp of deposit
     */
    function getUserDepositTime(address user) external view returns (uint256) {
        return depositTime[user];
    }
    
    /**
     * @notice Calculate current yield for a user
     * @param user Address to check
     * @return Current yield amount in RBTC
     */
    function getCurrentYield(address user) external view returns (uint256) {
        uint256 principal = deposits[user];
        if (principal == 0) return 0;
        
        uint256 timeHeld = block.timestamp - depositTime[user];
        return _calculateYield(principal, timeHeld);
    }
    
    /**
     * @notice Get total withdrawable amount (principal + yield)
     * @param user Address to check
     * @return Total amount available for withdrawal
     */
    function getTotalWithdrawable(address user) external view returns (uint256) {
        uint256 principal = deposits[user];
        if (principal == 0) return 0;
        
        uint256 timeHeld = block.timestamp - depositTime[user];
        uint256 yieldEarned = _calculateYield(principal, timeHeld);
        return principal + yieldEarned;
    }
    
    /**
     * @notice Get contract's total RBTC balance
     * @return Contract balance in RBTC
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
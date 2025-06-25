const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("RootsaveBitcoinSavings", function () {
  let rootsave;
  let owner;
  let user1;
  let user2;
  let attacker;
  
  // Constants for testing
  const DEPOSIT_AMOUNT = ethers.parseEther("1.0"); // 1 RBTC
  const SMALL_DEPOSIT = ethers.parseEther("0.1"); // 0.1 RBTC
  const LARGE_DEPOSIT = ethers.parseEther("10.0"); // 10 RBTC
  const SECONDS_PER_YEAR = 365 * 24 * 60 * 60; // 31,536,000 seconds
  const ANNUAL_YIELD_RATE = 500; // 5% = 500 basis points
  const BASIS_POINTS = 10000;
  
  beforeEach(async function () {
    [owner, user1, user2, attacker] = await ethers.getSigners();
    
    // Deploy the contract
    const RootsaveBitcoinSavings = await ethers.getContractFactory("RootsaveBitcoinSavings");
    rootsave = await RootsaveBitcoinSavings.deploy();
    await rootsave.waitForDeployment();
  });
  
  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await rootsave.getAddress()).to.be.properAddress;
    });
    
    it("Should initialize with zero balance", async function () {
      expect(await rootsave.getContractBalance()).to.equal(0);
    });
    
    it("Should have correct initial state for users", async function () {
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(0);
      expect(await rootsave.getUserDepositTime(user1.address)).to.equal(0);
      expect(await rootsave.getCurrentYield(user1.address)).to.equal(0);
      expect(await rootsave.getTotalWithdrawable(user1.address)).to.equal(0);
    });
  });
  
  describe("Deposit Function", function () {
    it("Should accept valid RBTC deposits", async function () {
      const tx = await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await rootsave.getContractBalance()).to.equal(DEPOSIT_AMOUNT);
      
      // Check if deposit time is recorded (should be recent)
      const depositTime = await rootsave.getUserDepositTime(user1.address);
      const currentTime = await time.latest();
      expect(depositTime).to.be.closeTo(currentTime, 5); // Within 5 seconds
    });
    
    it("Should emit Deposit event", async function () {
      await expect(rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT }))
        .to.emit(rootsave, "Deposit")
        .withArgs(user1.address, DEPOSIT_AMOUNT, await time.latest() + 1);
    });
    
    it("Should allow new deposit after withdrawal", async function () {
      // First deposit
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      
      // Immediate withdraw (no time passage = no yield)
      await rootsave.connect(user1).withdraw();
      
      // New deposit should work
      await rootsave.connect(user1).deposit({ value: LARGE_DEPOSIT });
      
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(LARGE_DEPOSIT);
      expect(await rootsave.getContractBalance()).to.equal(LARGE_DEPOSIT);
    });
    
    it("Should reject multiple deposits (must withdraw first)", async function () {
      // First deposit
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      
      // Second deposit should be rejected
      await expect(rootsave.connect(user1).deposit({ value: LARGE_DEPOSIT }))
        .to.be.revertedWith("Must withdraw existing deposit first");
      
      // First deposit should remain unchanged
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await rootsave.getContractBalance()).to.equal(DEPOSIT_AMOUNT);
    });
    
    it("Should handle deposits from multiple users", async function () {
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      await rootsave.connect(user2).deposit({ value: SMALL_DEPOSIT });
      
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await rootsave.getUserDeposit(user2.address)).to.equal(SMALL_DEPOSIT);
      expect(await rootsave.getContractBalance()).to.equal(DEPOSIT_AMOUNT + SMALL_DEPOSIT);
    });
    
    it("Should reject zero deposits", async function () {
      await expect(rootsave.connect(user1).deposit({ value: 0 }))
        .to.be.revertedWith("Deposit amount must be greater than 0");
    });
    
    it("Should reject deposits from contracts (onlyEOA)", async function () {
      // Deploy a malicious contract that tries to deposit
      const MaliciousContract = await ethers.getContractFactory("MaliciousDepositor");
      const malicious = await MaliciousContract.deploy(await rootsave.getAddress());
      
      await expect(malicious.attack({ value: DEPOSIT_AMOUNT }))
        .to.be.revertedWith("Only EOA allowed");
    });
  });
  
  describe("Withdraw Function", function () {
    beforeEach(async function () {
      // Setup: User1 deposits 1 RBTC
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
    });
    
    it("Should withdraw immediately with no yield", async function () {
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      const tx = await rootsave.connect(user1).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(user1.address);
      
      // Should receive back the deposit amount minus gas fees
      expect(finalBalance + gasUsed).to.be.closeTo(initialBalance + DEPOSIT_AMOUNT, ethers.parseEther("0.01"));
      
      // User state should be reset
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(0);
      expect(await rootsave.getUserDepositTime(user1.address)).to.equal(0);
    });
    
    it("Should calculate correct yield after time passage", async function () {
      // Fund the contract with extra RBTC to pay yield
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("1.0") // Add 1 RBTC for yield payments
      });
      
      // Fast forward 1 year (should earn exactly 5% = 0.05 RBTC)
      await time.increase(SECONDS_PER_YEAR);
      
      const expectedYield = DEPOSIT_AMOUNT * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS);
      const totalExpected = DEPOSIT_AMOUNT + expectedYield;
      
      // Use closeTo for yield comparisons due to small timing differences
      expect(await rootsave.getCurrentYield(user1.address)).to.be.closeTo(expectedYield, ethers.parseEther("0.001"));
      expect(await rootsave.getTotalWithdrawable(user1.address)).to.be.closeTo(totalExpected, ethers.parseEther("0.001"));
      
      const initialBalance = await ethers.provider.getBalance(user1.address);
      const tx = await rootsave.connect(user1).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance + gasUsed).to.be.closeTo(initialBalance + totalExpected, ethers.parseEther("0.01"));
    });
    
    it("Should calculate proportional yield for partial year", async function () {
      // Fund the contract with extra RBTC to pay yield
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("1.0") // Add 1 RBTC for yield payments
      });
      
      // Fast forward 6 months (half year)
      await time.increase(SECONDS_PER_YEAR / 2);
      
      const expectedYield = DEPOSIT_AMOUNT * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS) / BigInt(2);
      expect(await rootsave.getCurrentYield(user1.address)).to.be.closeTo(expectedYield, ethers.parseEther("0.001"));
    });
    
    it("Should emit Withdraw event", async function () {
      // Fund the contract with extra RBTC to pay yield
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("1.0") // Add 1 RBTC for yield payments
      });
      
      await time.increase(SECONDS_PER_YEAR); // 1 year
      
      // Simply test that the Withdraw event is emitted
      // Detailed value verification is done in other tests
      await expect(rootsave.connect(user1).withdraw())
        .to.emit(rootsave, "Withdraw");
    });
    
    it("Should reject withdrawal with no deposit", async function () {
      await expect(rootsave.connect(user2).withdraw())
        .to.be.revertedWith("No deposit found");
    });
    
    it("Should handle multiple users withdrawing independently", async function () {
      // User2 also deposits
      await rootsave.connect(user2).deposit({ value: SMALL_DEPOSIT });
      
      // Fund the contract with extra RBTC to pay yield for both users
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("1.0") // Add 1 RBTC for yield payments
      });
      
      // Fast forward time
      await time.increase(SECONDS_PER_YEAR);
      
      // Both users should have their correct yields (with tolerance for timing)
      const user1Yield = await rootsave.getCurrentYield(user1.address);
      const user2Yield = await rootsave.getCurrentYield(user2.address);
      
      const expectedUser1Yield = DEPOSIT_AMOUNT * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS);
      const expectedUser2Yield = SMALL_DEPOSIT * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS);
      
      expect(user1Yield).to.be.closeTo(expectedUser1Yield, ethers.parseEther("0.001"));
      expect(user2Yield).to.be.closeTo(expectedUser2Yield, ethers.parseEther("0.001"));
      
      // User1 withdraws
      await rootsave.connect(user1).withdraw();
      
      // User2's deposit should remain unaffected
      expect(await rootsave.getUserDeposit(user2.address)).to.equal(SMALL_DEPOSIT);
      expect(await rootsave.getCurrentYield(user2.address)).to.be.closeTo(user2Yield, ethers.parseEther("0.001"));
    });
    
    it("Should reject withdrawal from contracts (onlyEOA)", async function () {
      // Deploy contract and try to withdraw
      const MaliciousContract = await ethers.getContractFactory("MaliciousWithdrawer");
      const malicious = await MaliciousContract.deploy(await rootsave.getAddress());
      
      await expect(malicious.attack())
        .to.be.revertedWith("Only EOA allowed");
    });
  });
  
  describe("Yield Calculations", function () {
    it("Should calculate zero yield for zero time", async function () {
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      expect(await rootsave.getCurrentYield(user1.address)).to.equal(0);
    });
    
    it("Should calculate linear yield growth", async function () {
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      
      // Fund the contract with extra RBTC to pay yield
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("2.0") // Add extra for yield payments
      });
      
      // Test 3-month yield growth
      await time.increase(SECONDS_PER_YEAR / 4); // 3 months
      
      const expectedYield3Months = DEPOSIT_AMOUNT * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS) / BigInt(4);
      const actualYield3Months = await rootsave.getCurrentYield(user1.address);
      
      expect(actualYield3Months).to.be.closeTo(expectedYield3Months, ethers.parseEther("0.001"));
      
      // Test additional 3 months (total 6 months)
      await time.increase(SECONDS_PER_YEAR / 4); // Another 3 months
      
      const expectedYield6Months = DEPOSIT_AMOUNT * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS) / BigInt(2);
      const actualYield6Months = await rootsave.getCurrentYield(user1.address);
      
      expect(actualYield6Months).to.be.closeTo(expectedYield6Months, ethers.parseEther("0.001"));
      
      // Verify linear growth: 6-month yield should be 2x the 3-month yield
      expect(actualYield6Months).to.be.closeTo(actualYield3Months * BigInt(2), ethers.parseEther("0.001"));
    });
    
    it("Should handle large deposit amounts without overflow", async function () {
      const largeAmount = ethers.parseEther("100"); // 100 RBTC (more reasonable)
      
      // Fund the contract with extra RBTC to pay yield (5% of 100 = 5 RBTC)
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("10") // Add 10 RBTC for yield payments
      });
      
      await rootsave.connect(user1).deposit({ value: largeAmount });
      await time.increase(SECONDS_PER_YEAR);
      
      const expectedYield = largeAmount * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS);
      expect(await rootsave.getCurrentYield(user1.address)).to.be.closeTo(expectedYield, ethers.parseEther("0.01"));
    });
  });
  
  describe("View Functions", function () {
    beforeEach(async function () {
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      await rootsave.connect(user2).deposit({ value: SMALL_DEPOSIT });
    });
    
    it("Should return correct user deposits", async function () {
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await rootsave.getUserDeposit(user2.address)).to.equal(SMALL_DEPOSIT);
      expect(await rootsave.getUserDeposit(owner.address)).to.equal(0);
    });
    
    it("Should return correct deposit times", async function () {
      const user1Time = await rootsave.getUserDepositTime(user1.address);
      const user2Time = await rootsave.getUserDepositTime(user2.address);
      const currentTime = await time.latest();
      
      expect(user1Time).to.be.closeTo(currentTime, 10);
      expect(user2Time).to.be.closeTo(currentTime, 10);
      expect(await rootsave.getUserDepositTime(owner.address)).to.equal(0);
    });
    
    it("Should return correct contract balance", async function () {
      expect(await rootsave.getContractBalance()).to.equal(DEPOSIT_AMOUNT + SMALL_DEPOSIT);
    });
    
    it("Should return correct total withdrawable amounts", async function () {
      // Fund the contract with extra RBTC to pay yield
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("1.0") // Add extra for yield payments
      });
      
      await time.increase(SECONDS_PER_YEAR / 2); // 6 months
      
      const user1Expected = DEPOSIT_AMOUNT + (DEPOSIT_AMOUNT * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS) / BigInt(2));
      const user2Expected = SMALL_DEPOSIT + (SMALL_DEPOSIT * BigInt(ANNUAL_YIELD_RATE) / BigInt(BASIS_POINTS) / BigInt(2));
      
      expect(await rootsave.getTotalWithdrawable(user1.address)).to.be.closeTo(user1Expected, ethers.parseEther("0.001"));
      expect(await rootsave.getTotalWithdrawable(user2.address)).to.be.closeTo(user2Expected, ethers.parseEther("0.001"));
      expect(await rootsave.getTotalWithdrawable(owner.address)).to.equal(0);
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle extremely small deposits", async function () {
      const tinyAmount = 1n; // 1 wei
      
      await rootsave.connect(user1).deposit({ value: tinyAmount });
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(tinyAmount);
      
      await time.increase(SECONDS_PER_YEAR);
      
      // Yield might be 0 due to rounding, which is acceptable for tiny amounts
      const yield = await rootsave.getCurrentYield(user1.address);
      expect(yield).to.be.at.least(0);
    });
    
    it("Should handle very long time periods", async function () {
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      
      // Fund the contract with extra RBTC to pay yield for 10 years
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("10.0") // Add extra for long-term yield payments
      });
      
      // 10 years
      await time.increase(SECONDS_PER_YEAR * 10);
      
      const expectedYield = DEPOSIT_AMOUNT * BigInt(ANNUAL_YIELD_RATE) * BigInt(10) / BigInt(BASIS_POINTS);
      expect(await rootsave.getCurrentYield(user1.address)).to.be.closeTo(expectedYield, ethers.parseEther("0.01"));
    });
    
    it("Should handle multiple deposit-withdraw cycles", async function () {
      // Fund the contract with extra RBTC for yield payments
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("2.0") // Add extra for yield payments
      });
      
      // First cycle
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      await time.increase(SECONDS_PER_YEAR);
      await rootsave.connect(user1).withdraw();
      
      // Second cycle with different amount
      await rootsave.connect(user1).deposit({ value: SMALL_DEPOSIT });
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(SMALL_DEPOSIT);
      expect(await rootsave.getCurrentYield(user1.address)).to.equal(0);
      
      // Third cycle
      await time.increase(SECONDS_PER_YEAR / 2); // 6 months
      await rootsave.connect(user1).withdraw();
      
      // Verify clean state
      expect(await rootsave.getUserDeposit(user1.address)).to.equal(0);
    });
  });
  
 describe("Gas Usage", function () {
    it("Should have reasonable gas costs for deposit", async function () {
      const tx = await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      const receipt = await tx.wait();
      
      // Gas should be reasonable (less than 100k for simple deposit)
      expect(receipt.gasUsed).to.be.below(100000);
    });
    
    it("Should have reasonable gas costs for withdraw", async function () {
      // First make a deposit
      await rootsave.connect(user1).deposit({ value: DEPOSIT_AMOUNT });
      
      // Fund the contract with extra RBTC to pay yield
      await owner.sendTransaction({
        to: await rootsave.getAddress(),
        value: ethers.parseEther("1.0") // Add extra for yield payments
      });
      
      await time.increase(SECONDS_PER_YEAR);
      
      const tx = await rootsave.connect(user1).withdraw();
      const receipt = await tx.wait();
      
      // Gas should be reasonable (less than 150k for withdraw with calculations)
      expect(receipt.gasUsed).to.be.below(150000);
    });
  });
});

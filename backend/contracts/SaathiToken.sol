// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SaathiToken
 * @dev SAATHI token for Kredefy - Used for staking, governance, and rewards
 */
contract SaathiToken is ERC20, Ownable {
    
    // Total supply: 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18;
    
    // Staking for vouching
    mapping(address => mapping(address => uint256)) public vouchStakes;
    
    // Events
    event Staked(address indexed voucher, address indexed vouchee, uint256 amount);
    event Unstaked(address indexed voucher, address indexed vouchee, uint256 amount);
    event Slashed(address indexed voucher, address indexed defaulter, uint256 amount);
    event Rewarded(address indexed user, uint256 amount, string reason);
    
    constructor() ERC20("Saathi", "SAATHI") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Stake tokens to vouch for someone
     */
    function stakeForVouch(address vouchee, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(vouchee != msg.sender, "Cannot vouch for yourself");
        
        _transfer(msg.sender, address(this), amount);
        vouchStakes[msg.sender][vouchee] += amount;
        
        emit Staked(msg.sender, vouchee, amount);
    }
    
    /**
     * @dev Unstake tokens after successful loan repayment
     */
    function unstake(address vouchee) external {
        uint256 amount = vouchStakes[msg.sender][vouchee];
        require(amount > 0, "No stake found");
        
        vouchStakes[msg.sender][vouchee] = 0;
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, vouchee, amount);
    }
    
    /**
     * @dev Slash staked tokens on loan default (only owner)
     */
    function slash(address voucher, address defaulter, uint256 percentage) external onlyOwner {
        require(percentage <= 100, "Invalid percentage");
        
        uint256 stakedAmount = vouchStakes[voucher][defaulter];
        require(stakedAmount > 0, "No stake to slash");
        
        uint256 slashAmount = (stakedAmount * percentage) / 100;
        vouchStakes[voucher][defaulter] -= slashAmount;
        
        // Burned tokens go to treasury (owner)
        _transfer(address(this), owner(), slashAmount);
        
        emit Slashed(voucher, defaulter, slashAmount);
    }
    
    /**
     * @dev Reward user with tokens (only owner)
     */
    function reward(address user, uint256 amount, string calldata reason) external onlyOwner {
        require(balanceOf(owner()) >= amount, "Insufficient treasury balance");
        _transfer(owner(), user, amount);
        
        emit Rewarded(user, amount, reason);
    }
    
    /**
     * @dev Get staked amount for a vouch
     */
    function getStake(address voucher, address vouchee) external view returns (uint256) {
        return vouchStakes[voucher][vouchee];
    }
}

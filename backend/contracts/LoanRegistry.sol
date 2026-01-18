// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoanRegistry
 * @dev Immutable on-chain record of all loans and repayments
 */
contract LoanRegistry is Ownable {
    
    struct Loan {
        string loanId;  // Off-chain UUID
        address borrower;
        uint256 amount;
        uint256 tenureDays;
        uint256 createdAt;
        uint256 completedAt;
        LoanStatus status;
    }
    
    struct Repayment {
        string loanId;
        uint256 amount;
        uint256 paidAt;
    }
    
    enum LoanStatus { Active, Completed, Defaulted }
    
    // Loans by ID
    mapping(string => Loan) public loans;
    
    // Repayments by loan ID
    mapping(string => Repayment[]) public repayments;
    
    // User's loan IDs
    mapping(address => string[]) public userLoans;
    
    // Events
    event LoanCreated(string indexed loanId, address indexed borrower, uint256 amount);
    event RepaymentRecorded(string indexed loanId, uint256 amount);
    event LoanCompleted(string indexed loanId);
    event LoanDefaulted(string indexed loanId);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new loan record
     */
    function createLoan(
        string calldata loanId,
        address borrower,
        uint256 amount,
        uint256 tenureDays
    ) external onlyOwner {
        require(bytes(loans[loanId].loanId).length == 0, "Loan ID exists");
        
        loans[loanId] = Loan({
            loanId: loanId,
            borrower: borrower,
            amount: amount,
            tenureDays: tenureDays,
            createdAt: block.timestamp,
            completedAt: 0,
            status: LoanStatus.Active
        });
        
        userLoans[borrower].push(loanId);
        
        emit LoanCreated(loanId, borrower, amount);
    }
    
    /**
     * @dev Record a repayment
     */
    function recordRepayment(string calldata loanId, uint256 amount) external onlyOwner {
        require(loans[loanId].status == LoanStatus.Active, "Loan not active");
        
        repayments[loanId].push(Repayment({
            loanId: loanId,
            amount: amount,
            paidAt: block.timestamp
        }));
        
        emit RepaymentRecorded(loanId, amount);
    }
    
    /**
     * @dev Mark loan as completed
     */
    function markCompleted(string calldata loanId) external onlyOwner {
        require(loans[loanId].status == LoanStatus.Active, "Loan not active");
        
        loans[loanId].status = LoanStatus.Completed;
        loans[loanId].completedAt = block.timestamp;
        
        emit LoanCompleted(loanId);
    }
    
    /**
     * @dev Mark loan as defaulted
     */
    function markDefaulted(string calldata loanId) external onlyOwner {
        require(loans[loanId].status == LoanStatus.Active, "Loan not active");
        
        loans[loanId].status = LoanStatus.Defaulted;
        loans[loanId].completedAt = block.timestamp;
        
        emit LoanDefaulted(loanId);
    }
    
    /**
     * @dev Get total repaid for a loan
     */
    function getTotalRepaid(string calldata loanId) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < repayments[loanId].length; i++) {
            total += repayments[loanId][i].amount;
        }
        return total;
    }
    
    /**
     * @dev Get user's loan count
     */
    function getUserLoanCount(address user) external view returns (uint256) {
        return userLoans[user].length;
    }
}

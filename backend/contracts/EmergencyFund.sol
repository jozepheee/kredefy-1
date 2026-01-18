// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EmergencyFund
 * @dev On-chain management of circle emergency funds
 * Implements Samooh Suraksha (Group Protection) pool
 */
contract EmergencyFund is Ownable {
    
    struct Fund {
        string circleId;
        uint256 balance;
        uint256 totalContributed;
        uint256 totalDisbursed;
        uint256 contributionPerMember;
        bool active;
    }
    
    struct EmergencyRequest {
        string requestId;
        string circleId;
        address requester;
        uint256 amount;
        string reason;
        uint256 approvalCount;
        uint256 rejectionCount;
        bool processed;
        bool approved;
        uint256 createdAt;
    }
    
    // Funds by circle ID
    mapping(string => Fund) public funds;
    
    // Emergency requests by ID
    mapping(string => EmergencyRequest) public requests;
    
    // Member contributions (circleId => member => amount)
    mapping(string => mapping(address => uint256)) public contributions;
    
    // Request votes (requestId => member => hasVoted)
    mapping(string => mapping(address => bool)) public hasVotedOnRequest;
    
    // Circle members (circleId => member => isMember)
    mapping(string => mapping(address => bool)) public members;
    
    // Events
    event FundCreated(string indexed circleId, uint256 contributionAmount);
    event ContributionMade(string indexed circleId, address indexed member, uint256 amount);
    event EmergencyRequested(string indexed requestId, string indexed circleId, address indexed requester, uint256 amount);
    event EmergencyVoted(string indexed requestId, address indexed voter, bool approve);
    event EmergencyDisbursed(string indexed requestId, address indexed recipient, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Initialize emergency fund for a circle
     */
    function createFund(
        string calldata circleId,
        uint256 contributionPerMember
    ) external onlyOwner {
        require(!funds[circleId].active, "Fund exists");
        
        funds[circleId] = Fund({
            circleId: circleId,
            balance: 0,
            totalContributed: 0,
            totalDisbursed: 0,
            contributionPerMember: contributionPerMember,
            active: true
        });
        
        emit FundCreated(circleId, contributionPerMember);
    }
    
    /**
     * @dev Contribute to emergency fund
     */
    function contribute(string calldata circleId) external payable {
        require(funds[circleId].active, "Fund not active");
        require(msg.value >= funds[circleId].contributionPerMember, "Insufficient contribution");
        
        funds[circleId].balance += msg.value;
        funds[circleId].totalContributed += msg.value;
        contributions[circleId][msg.sender] += msg.value;
        members[circleId][msg.sender] = true;
        
        emit ContributionMade(circleId, msg.sender, msg.value);
    }
    
    /**
     * @dev Request emergency funds
     */
    function requestEmergency(
        string calldata requestId,
        string calldata circleId,
        uint256 amount,
        string calldata reason
    ) external {
        require(funds[circleId].active, "Fund not active");
        require(members[circleId][msg.sender], "Not a contributing member");
        require(amount <= funds[circleId].balance, "Insufficient fund balance");
        require(bytes(requests[requestId].requestId).length == 0, "Request exists");
        
        requests[requestId] = EmergencyRequest({
            requestId: requestId,
            circleId: circleId,
            requester: msg.sender,
            amount: amount,
            reason: reason,
            approvalCount: 0,
            rejectionCount: 0,
            processed: false,
            approved: false,
            createdAt: block.timestamp
        });
        
        emit EmergencyRequested(requestId, circleId, msg.sender, amount);
    }
    
    /**
     * @dev Vote on emergency request
     */
    function voteOnEmergency(
        string calldata requestId,
        bool approve
    ) external {
        EmergencyRequest storage request = requests[requestId];
        require(bytes(request.requestId).length > 0, "Request not found");
        require(!request.processed, "Already processed");
        require(members[request.circleId][msg.sender], "Not a member");
        require(request.requester != msg.sender, "Cannot vote on own request");
        require(!hasVotedOnRequest[requestId][msg.sender], "Already voted");
        
        hasVotedOnRequest[requestId][msg.sender] = true;
        
        if (approve) {
            request.approvalCount++;
        } else {
            request.rejectionCount++;
        }
        
        emit EmergencyVoted(requestId, msg.sender, approve);
    }
    
    /**
     * @dev Process and disburse emergency request
     */
    function processEmergency(string calldata requestId) external {
        EmergencyRequest storage request = requests[requestId];
        require(bytes(request.requestId).length > 0, "Request not found");
        require(!request.processed, "Already processed");
        
        // Require majority approval
        require(request.approvalCount > request.rejectionCount, "Not approved");
        
        request.processed = true;
        request.approved = true;
        
        Fund storage fund = funds[request.circleId];
        require(fund.balance >= request.amount, "Insufficient balance");
        
        fund.balance -= request.amount;
        fund.totalDisbursed += request.amount;
        
        // Transfer funds to requester
        payable(request.requester).transfer(request.amount);
        
        emit EmergencyDisbursed(requestId, request.requester, request.amount);
    }
    
    /**
     * @dev Get fund balance
     */
    function getFundBalance(string calldata circleId) external view returns (uint256) {
        return funds[circleId].balance;
    }
    
    /**
     * @dev Check if member has contributed
     */
    function hasContributed(string calldata circleId, address member) external view returns (bool) {
        return contributions[circleId][member] > 0;
    }
}

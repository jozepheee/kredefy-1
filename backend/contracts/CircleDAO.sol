// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CircleDAO
 * @dev Decentralized governance for trust circles
 * Enables quadratic voting on loan requests and circle decisions
 */
contract CircleDAO is Ownable {
    
    struct Circle {
        string circleId;
        bytes32 nameHash;
        address creator;
        uint256 memberCount;
        uint256 totalStaked;
        bool active;
        uint256 createdAt;
    }
    
    struct Proposal {
        string proposalId;
        string circleId;
        ProposalType proposalType;
        address proposer;
        uint256 amount;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        ProposalStatus status;
    }
    
    enum ProposalType { LoanRequest, EmergencyFund, MembershipChange, RuleChange }
    enum ProposalStatus { Active, Passed, Rejected, Executed }
    
    // Circles by ID
    mapping(string => Circle) public circles;
    
    // Circle members (circleId => member => isMember)
    mapping(string => mapping(address => bool)) public circleMembers;
    
    // Member trust scores for voting weight
    mapping(string => mapping(address => uint256)) public memberTrustScores;
    
    // Proposals by ID
    mapping(string => Proposal) public proposals;
    
    // Votes tracking (proposalId => voter => hasVoted)
    mapping(string => mapping(address => bool)) public hasVoted;
    
    // Events
    event CircleCreated(string indexed circleId, address indexed creator);
    event MemberJoined(string indexed circleId, address indexed member);
    event MemberLeft(string indexed circleId, address indexed member);
    event ProposalCreated(string indexed proposalId, string indexed circleId, ProposalType proposalType);
    event VoteCast(string indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(string indexed proposalId, bool passed);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new trust circle
     */
    function createCircle(
        string calldata circleId,
        string calldata name
    ) external {
        require(bytes(circles[circleId].circleId).length == 0, "Circle exists");
        
        circles[circleId] = Circle({
            circleId: circleId,
            nameHash: keccak256(bytes(name)),
            creator: msg.sender,
            memberCount: 1,
            totalStaked: 0,
            active: true,
            createdAt: block.timestamp
        });
        
        circleMembers[circleId][msg.sender] = true;
        memberTrustScores[circleId][msg.sender] = 50; // Default trust
        
        emit CircleCreated(circleId, msg.sender);
        emit MemberJoined(circleId, msg.sender);
    }
    
    /**
     * @dev Join a circle
     */
    function joinCircle(string calldata circleId) external {
        require(circles[circleId].active, "Circle not active");
        require(!circleMembers[circleId][msg.sender], "Already member");
        
        circleMembers[circleId][msg.sender] = true;
        memberTrustScores[circleId][msg.sender] = 10; // New member starts low
        circles[circleId].memberCount++;
        
        emit MemberJoined(circleId, msg.sender);
    }
    
    /**
     * @dev Create a proposal (loan request, etc.)
     */
    function createProposal(
        string calldata proposalId,
        string calldata circleId,
        ProposalType proposalType,
        uint256 amount,
        string calldata description,
        uint256 votingDays
    ) external {
        require(circleMembers[circleId][msg.sender], "Not a member");
        require(bytes(proposals[proposalId].proposalId).length == 0, "Proposal exists");
        
        proposals[proposalId] = Proposal({
            proposalId: proposalId,
            circleId: circleId,
            proposalType: proposalType,
            proposer: msg.sender,
            amount: amount,
            description: description,
            votesFor: 0,
            votesAgainst: 0,
            deadline: block.timestamp + (votingDays * 1 days),
            executed: false,
            status: ProposalStatus.Active
        });
        
        emit ProposalCreated(proposalId, circleId, proposalType);
    }
    
    /**
     * @dev Cast vote with quadratic voting weight
     * Vote weight = sqrt(trustScore) for quadratic effect
     */
    function vote(
        string calldata proposalId,
        bool support
    ) external {
        Proposal storage proposal = proposals[proposalId];
        require(bytes(proposal.proposalId).length > 0, "Proposal not found");
        require(block.timestamp < proposal.deadline, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(circleMembers[proposal.circleId][msg.sender], "Not a member");
        require(proposal.proposer != msg.sender, "Cannot vote on own proposal");
        
        // Quadratic voting: weight = sqrt(trustScore)
        uint256 trustScore = memberTrustScores[proposal.circleId][msg.sender];
        uint256 voteWeight = sqrt(trustScore * 100); // Scale for precision
        
        if (support) {
            proposal.votesFor += voteWeight;
        } else {
            proposal.votesAgainst += voteWeight;
        }
        
        hasVoted[proposalId][msg.sender] = true;
        
        emit VoteCast(proposalId, msg.sender, support, voteWeight);
    }
    
    /**
     * @dev Execute proposal after voting ends
     */
    function executeProposal(string calldata proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(bytes(proposal.proposalId).length > 0, "Proposal not found");
        require(block.timestamp >= proposal.deadline, "Voting not ended");
        require(!proposal.executed, "Already executed");
        
        proposal.executed = true;
        
        if (proposal.votesFor > proposal.votesAgainst) {
            proposal.status = ProposalStatus.Passed;
        } else {
            proposal.status = ProposalStatus.Rejected;
        }
        
        emit ProposalExecuted(proposalId, proposal.status == ProposalStatus.Passed);
    }
    
    /**
     * @dev Update member trust score (only owner)
     */
    function updateTrustScore(
        string calldata circleId,
        address member,
        uint256 newScore
    ) external onlyOwner {
        require(circleMembers[circleId][member], "Not a member");
        require(newScore <= 100, "Score max 100");
        memberTrustScores[circleId][member] = newScore;
    }
    
    /**
     * @dev Integer square root using Babylonian method
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}

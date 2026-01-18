// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustScore
 * @dev Soulbound Token (ERC-5192) for immutable trust score on Kredefy
 * Cannot be transferred - permanently bound to original address
 */
contract TrustScore is ERC721, Ownable {
    
    // Token ID counter
    uint256 private _tokenIdCounter;
    
    // Trust scores mapped by address
    mapping(address => uint256) public trustScores;
    
    // Score history
    struct ScoreUpdate {
        uint256 oldScore;
        uint256 newScore;
        string reason;
        uint256 timestamp;
    }
    
    mapping(address => ScoreUpdate[]) public scoreHistory;
    
    // Events
    event TrustScoreMinted(address indexed user, uint256 tokenId, uint256 initialScore);
    event TrustScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore, string reason);
    event Locked(uint256 tokenId);  // ERC-5192
    
    constructor() ERC721("Kredefy Trust Score", "TRUST") Ownable(msg.sender) {}
    
    /**
     * @dev Mint a new trust score token (one per address)
     */
    function mint(address user, uint256 initialScore) external onlyOwner {
        require(balanceOf(user) == 0, "Already has trust score");
        require(initialScore <= 100, "Score cannot exceed 100");
        
        uint256 tokenId = ++_tokenIdCounter;
        _safeMint(user, tokenId);
        
        trustScores[user] = initialScore;
        
        emit TrustScoreMinted(user, tokenId, initialScore);
        emit Locked(tokenId);  // Immediately lock (soulbound)
    }
    
    /**
     * @dev Update trust score
     */
    function updateScore(address user, uint256 newScore, string calldata reason) external onlyOwner {
        require(balanceOf(user) > 0, "User has no trust score");
        require(newScore <= 100, "Score cannot exceed 100");
        
        uint256 oldScore = trustScores[user];
        trustScores[user] = newScore;
        
        scoreHistory[user].push(ScoreUpdate({
            oldScore: oldScore,
            newScore: newScore,
            reason: reason,
            timestamp: block.timestamp
        }));
        
        emit TrustScoreUpdated(user, oldScore, newScore, reason);
    }
    
    /**
     * @dev Get trust score for an address
     */
    function getScore(address user) external view returns (uint256) {
        return trustScores[user];
    }
    
    /**
     * @dev Get score history length
     */
    function getHistoryLength(address user) external view returns (uint256) {
        return scoreHistory[user].length;
    }
    
    /**
     * @dev Check if token is locked (ERC-5192)
     */
    function locked(uint256 tokenId) external pure returns (bool) {
        return true;  // Always locked (soulbound)
    }
    
    /**
     * @dev Override transfer to prevent transfers (soulbound)
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: Transfer not allowed");
        }
        return super._update(to, tokenId, auth);
    }
}

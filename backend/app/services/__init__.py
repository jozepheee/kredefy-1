"""
Services Package - Lazy Loading for Heavy Initializations
"""

from typing import Optional

# Lazy loaded services
_advanced_blockchain_service = None


def get_advanced_blockchain_service():
    """Lazy load the advanced blockchain service"""
    global _advanced_blockchain_service
    if _advanced_blockchain_service is None:
        from app.services.advanced_blockchain import AdvancedBlockchainService
        _advanced_blockchain_service = AdvancedBlockchainService()
    return _advanced_blockchain_service
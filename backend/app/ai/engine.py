"""
Advanced AI Engine - Core Infrastructure
Multi-Agent Orchestration with Visible Reasoning Traces

This is the BRAIN of Kredefy - handles all AI decisions with full transparency
for hackathon judges to see the reasoning.
"""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import json
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


# ============================================
# REASONING TRACE MODELS
# Judges can see exactly how AI makes decisions
# ============================================

class ThoughtType(str, Enum):
    """Types of AI reasoning steps"""
    OBSERVATION = "observation"      # What the AI sees
    ANALYSIS = "analysis"            # What the AI thinks
    HYPOTHESIS = "hypothesis"        # What the AI predicts
    ACTION = "action"                # What the AI decides to do
    REFLECTION = "reflection"        # Self-correction
    CONCLUSION = "conclusion"        # Final decision


class ReasoningStep(BaseModel):
    """Single step in AI reasoning chain - visible to judges"""
    step_number: int
    thought_type: ThoughtType
    content: str
    confidence: float = Field(ge=0, le=1)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}


class ReasoningTrace(BaseModel):
    """Complete reasoning trace for an AI decision"""
    trace_id: str
    agent_name: str
    task: str
    steps: List[ReasoningStep] = []
    final_decision: Optional[str] = None
    total_confidence: float = 0.0
    duration_ms: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    def add_thought(
        self,
        thought_type: ThoughtType,
        content: str,
        confidence: float = 0.8,
        metadata: Dict = None,
    ):
        """Add a reasoning step to the trace"""
        step = ReasoningStep(
            step_number=len(self.steps) + 1,
            thought_type=thought_type,
            content=content,
            confidence=confidence,
            metadata=metadata or {},
        )
        self.steps.append(step)
        return self
    
    def observe(self, content: str, confidence: float = 0.9):
        """Add observation step"""
        return self.add_thought(ThoughtType.OBSERVATION, content, confidence)
    
    def analyze(self, content: str, confidence: float = 0.8):
        """Add analysis step"""
        return self.add_thought(ThoughtType.ANALYSIS, content, confidence)
    
    def hypothesize(self, content: str, confidence: float = 0.7):
        """Add hypothesis step"""
        return self.add_thought(ThoughtType.HYPOTHESIS, content, confidence)
    
    def act(self, content: str, confidence: float = 0.85):
        """Add action step"""
        return self.add_thought(ThoughtType.ACTION, content, confidence)
    
    def reflect(self, content: str, confidence: float = 0.75):
        """Add reflection step"""
        return self.add_thought(ThoughtType.REFLECTION, content, confidence)
    
    def conclude(self, decision: str, confidence: float = 0.85):
        """Add conclusion and set final decision"""
        self.add_thought(ThoughtType.CONCLUSION, decision, confidence)
        self.final_decision = decision
        self.total_confidence = sum(s.confidence for s in self.steps) / len(self.steps)
        return self
    
    def to_display(self, language: str = "en") -> str:
        """Format trace for display to users/judges"""
        lines = [f"🧠 **{self.agent_name}** reasoning for: {self.task}\n"]
        
        icons = {
            ThoughtType.OBSERVATION: "👁️",
            ThoughtType.ANALYSIS: "🔍",
            ThoughtType.HYPOTHESIS: "💭",
            ThoughtType.ACTION: "⚡",
            ThoughtType.REFLECTION: "🔄",
            ThoughtType.CONCLUSION: "✅",
        }
        
        for step in self.steps:
            icon = icons.get(step.thought_type, "•")
            conf = f"({step.confidence:.0%})"
            lines.append(f"{icon} **Step {step.step_number}**: {step.content} {conf}")
        
        if self.final_decision:
            lines.append(f"\n🎯 **Decision**: {self.final_decision}")
            lines.append(f"📊 **Confidence**: {self.total_confidence:.0%}")
        
        return "\n".join(lines)


# ============================================
# AGENT BASE CLASS
# ============================================

class BaseAgent(ABC):
    """Base class for all Kredefy AI agents"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.traces: List[ReasoningTrace] = []
    
    def create_trace(self, task: str) -> ReasoningTrace:
        """Create a new reasoning trace"""
        trace = ReasoningTrace(
            trace_id=f"{self.name}_{datetime.utcnow().timestamp()}",
            agent_name=self.name,
            task=task,
        )
        self.traces.append(trace)
        return trace
    
    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent's primary function"""
        pass
    
    def get_latest_trace(self) -> Optional[ReasoningTrace]:
        """Get the most recent reasoning trace"""
        return self.traces[-1] if self.traces else None


# ============================================
# AGENT CONTEXT - Shared state between agents
# ============================================

class AgentContext(BaseModel):
    """Shared context for multi-agent collaboration"""
    user_id: str
    user_profile: Dict[str, Any] = {}
    trust_score: int = 0
    saathi_balance: float = 0
    circles: List[Dict] = []
    loans: List[Dict] = []
    vouches: List[Dict] = []
    financial_diary: List[Dict] = []
    language: str = "en"
    current_request: Optional[str] = None
    agent_results: Dict[str, Any] = {}  # Results from other agents
    reasoning_traces: List[ReasoningTrace] = []
    
    def add_trace(self, trace: ReasoningTrace):
        self.reasoning_traces.append(trace)


# ============================================
# AGENT RESULT
# ============================================

class AgentResult(BaseModel):
    """Result from an agent execution"""
    agent_name: str
    success: bool
    result: Any
    reasoning_trace: ReasoningTrace
    next_agent: Optional[str] = None  # Suggest next agent in chain
    actions: List[Dict[str, Any]] = []  # Actions to execute

import re
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from backend.app.models import User, Claim, Project, Evidence
from backend.app.schemas import ResumeBlockItem, ResumeValidationResponse

# Detection pattern for suspicious unverified performance percentage metrics
SUSPICIOUS_METRIC_PATTERN = re.compile(
    r'\b(increased|improved|reduced|boosted|accelerated|optimized|decreased|cut)\s+[^,.]*?\bby\s+\d+%|\bby\s+\d+%\b',
    re.IGNORECASE
)
METRIC_BY_PERCENT_PATTERN = re.compile(r'\s+by\s+\d+%', re.IGNORECASE)


def validate_and_sanitize_resume_blocks(
    blocks: List[ResumeBlockItem],
    user: User,
    db: Session
) -> ResumeValidationResponse:
    """
    Cross-validates resume blocks against empirical database evidence and commit history.
    Detects unverified synthetic percentage metrics and unsubstantiated claims.
    Enforces strict distinction between EVIDENCE_VERIFIED, USER_DECLARED, and UNVERIFIED.
    """
    user_claims = db.query(Claim).filter(Claim.user_id == user.id).all()
    
    # Separate claims backed by real qualifying Evidence rows from unbacked user-declared claims
    verified_claim_map = {}
    declared_claim_map = {}
    
    for c in user_claims:
        clean_text = c.claim.lower().strip()
        has_evidence = len(c.evidence) > 0 if hasattr(c, "evidence") and c.evidence else False
        if c.status == "user_confirmed" and has_evidence:
            verified_claim_map[clean_text] = c
        elif c.status == "user_confirmed":
            declared_claim_map[clean_text] = c

    sanitized_blocks: List[ResumeBlockItem] = []
    unverified_claims: List[str] = []
    fabricated_metrics: List[str] = []
    
    total_claims_checked = 0
    verified_claim_count = 0
    
    for block in blocks:
        block_dict = block.model_dump()
        payload = block_dict.get("content_payload", {})
        
        # 1. Selected Work Block Claims Validation
        if block.block_type == "selected_work" and "projects" in payload:
            for proj in payload.get("projects", []):
                cleaned_claims = []
                for c in proj.get("evidence_claims", []):
                    claim_str = c.get("claim", "")
                    total_claims_checked += 1
                    
                    # Check suspicious unverified percentage metric
                    if SUSPICIOUS_METRIC_PATTERN.search(claim_str):
                        fabricated_metrics.append(claim_str)
                        # Sanitize metric: cleanly remove the unsupported percentage clause without inserting fake proof words
                        sanitized_str = METRIC_BY_PERCENT_PATTERN.sub("", claim_str).strip()
                        c["claim"] = sanitized_str
                        claim_str = sanitized_str
                        
                    # Check if claim is backed by genuine repository Evidence records
                    clean_lookup = claim_str.lower().strip()
                    matched_verified = next((v for k, v in verified_claim_map.items() if clean_lookup in k or k in clean_lookup), None)
                    matched_declared = next((v for k, v in declared_claim_map.items() if clean_lookup in k or k in clean_lookup), None)
                    
                    if matched_verified:
                        verified_claim_count += 1
                        c["provenance"] = "EVIDENCE_VERIFIED"
                        c["confidence"] = matched_verified.confidence or 1.0
                        cleaned_claims.append(c)
                    elif matched_declared:
                        c["provenance"] = "USER_DECLARED"
                        c["confidence"] = matched_declared.confidence or 0.8
                        cleaned_claims.append(c)
                    else:
                        unverified_claims.append(claim_str)
                        c["provenance"] = "UNVERIFIED"
                        c["confidence"] = 0.0
                        cleaned_claims.append(c)
                        
                proj["evidence_claims"] = cleaned_claims
                
        # 2. Positioning Statement Metric Check
        elif block.block_type == "positioning" and "statement" in payload:
            stmt = payload.get("statement", "")
            if SUSPICIOUS_METRIC_PATTERN.search(stmt):
                fabricated_metrics.append(stmt)
                payload["statement"] = METRIC_BY_PERCENT_PATTERN.sub("", stmt).strip()
                
        sanitized_blocks.append(ResumeBlockItem(**block_dict))
        
    is_valid = len(fabricated_metrics) == 0 and len(unverified_claims) == 0
    
    return ResumeValidationResponse(
        is_valid=is_valid,
        unverified_claims=unverified_claims,
        fabricated_metrics_detected=fabricated_metrics,
        sanitized_blocks=sanitized_blocks,
        verified_claim_count=verified_claim_count,
        total_claims_checked=total_claims_checked
    )

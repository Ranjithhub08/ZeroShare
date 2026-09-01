// Policy Engine — Purpose to allowed data types mapping
// Answers: "Is this data allowed for this purpose?"

const PURPOSE_POLICY = {
  recruitment:   ['resume', 'email', 'education', 'phone'],
  kyc:           ['name', 'government id', 'address', 'pan', 'passport', 'aadhaar'],
  payment:       ['name', 'bank account', 'financial record', 'email'],
  healthcare:    ['medical record', 'health', 'email', 'phone', 'address'],
  education:     ['resume', 'education', 'email', 'phone'],
  marketing:     ['email'],
  analytics:     ['email'],
  authentication:['email', 'phone'],
};

const SENSITIVITY_MAP = {
  'resume':           'MEDIUM',
  'email':            'LOW',
  'phone':            'MEDIUM',
  'address':          'MEDIUM',
  'education':        'MEDIUM',
  'financial record': 'HIGH',
  'bank account':     'HIGH',
  'medical record':   'VERY_HIGH',
  'health':           'VERY_HIGH',
  'passport':         'VERY_HIGH',
  'pan':              'VERY_HIGH',
  'aadhaar':          'VERY_HIGH',
  'government id':    'VERY_HIGH',
  'id proof':         'VERY_HIGH',
  'social media':     'LOW',
};

class PolicyEngine {
  // Check if a data type is allowed for a given purpose
  isAllowed(purpose, dataType) {
    const p = purpose.toLowerCase();
    const d = dataType.toLowerCase();
    const matchedPolicy = Object.keys(PURPOSE_POLICY).find(key => p.includes(key));
    if (!matchedPolicy) return { allowed: true, reason: 'No policy defined for this purpose' };
    const allowed = PURPOSE_POLICY[matchedPolicy].some(item => d.includes(item) || item.includes(d));
    return {
      allowed,
      reason: allowed
        ? `${dataType} is permitted for ${matchedPolicy}`
        : `${dataType} is NOT required for ${matchedPolicy} — data minimization violation`,
    };
  }

  // Given a purpose and list of requested data types, return minimization recommendation
  minimize(purpose, requestedAssets) {
    const p = purpose.toLowerCase();
    const matchedPolicy = Object.keys(PURPOSE_POLICY).find(key => p.includes(key));
    if (!matchedPolicy) return { recommended: requestedAssets, unnecessary: [], policy: 'none' };

    const allowed = PURPOSE_POLICY[matchedPolicy];
    const recommended = [];
    const unnecessary = [];

    for (const asset of requestedAssets) {
      const d = asset.toLowerCase();
      const isAllowed = allowed.some(item => d.includes(item) || item.includes(d));
      if (isAllowed) recommended.push(asset);
      else unnecessary.push(asset);
    }

    return { recommended, unnecessary, policy: matchedPolicy };
  }

  // Get sensitivity level for a data type
  getSensitivity(dataType) {
    const d = dataType.toLowerCase();
    for (const [key, level] of Object.entries(SENSITIVITY_MAP)) {
      if (d.includes(key)) return level;
    }
    return 'LOW';
  }

  // Calculate purpose risk score (0-10)
  getPurposeRisk(purpose) {
    const p = purpose.toLowerCase();
    if (p.includes('marketing') || p.includes('advertising') || p.includes('profiling')) return 8;
    if (p.includes('kyc') || p.includes('payment') || p.includes('financial')) return 6;
    if (p.includes('healthcare') || p.includes('medical')) return 7;
    if (p.includes('recruitment') || p.includes('education')) return 3;
    if (p.includes('authentication') || p.includes('login')) return 2;
    return 4;
  }
}

module.exports = new PolicyEngine();

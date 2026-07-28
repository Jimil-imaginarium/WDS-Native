/**
 * Pose presets = named sets of joint rotations on the placeholder rig
 * (simple bone/group rotations, per kickoff). Angles in radians; arms hang
 * along -Y at rest. R/L suffix 1 = front pair, 2 = rear pair.
 */
export interface ArmPose {
  shoulder: [number, number, number];
  elbow: [number, number, number];
}

export interface PoseDef {
  armR1: ArmPose;
  armL1: ArmPose;
  armR2: ArmPose;
  armL2: ArmPose;
  /** Whole-figure lean (z) for dynamic poses. */
  rootTilt: number;
  headTilt: number;
  /** Standing-form leg hints. */
  legLiftL: number;
}

export const POSES: Record<string, PoseDef> = {
  // Both front hands raised toward the lips, holding the flute transversely.
  murali: {
    armR1: { shoulder: [-0.55, 0.15, -0.95], elbow: [-1.95, 0.35, 0.1] },
    armL1: { shoulder: [-0.7, -0.1, 0.75], elbow: [-2.05, -0.45, -0.1] },
    armR2: { shoulder: [-0.15, 0, -1.05], elbow: [-0.85, 0, 0] },
    armL2: { shoulder: [-0.15, 0, 1.05], elbow: [-0.85, 0, 0] },
    rootTilt: 0.05,
    headTilt: -0.14,
    legLiftL: 0,
  },
  // Front right hand raised in abhaya (blessing), left low holding offerings.
  ashirwad: {
    armR1: { shoulder: [-0.35, 0, -0.35], elbow: [-2.05, 0, 0.15] },
    armL1: { shoulder: [-0.45, 0, 0.35], elbow: [-1.15, 0, -0.1] },
    armR2: { shoulder: [-0.15, 0, -1.05], elbow: [-0.85, 0, 0] },
    armL2: { shoulder: [-0.15, 0, 1.05], elbow: [-0.85, 0, 0] },
    rootTilt: 0,
    headTilt: 0,
    legLiftL: 0,
  },
  // Serene, hands low and restful toward the lap.
  dhyana: {
    armR1: { shoulder: [-0.3, 0, -0.12], elbow: [-1.35, 0.25, 0] },
    armL1: { shoulder: [-0.3, 0, 0.12], elbow: [-1.35, -0.25, 0] },
    armR2: { shoulder: [-0.1, 0, -0.75], elbow: [-0.6, 0, 0] },
    armL2: { shoulder: [-0.1, 0, 0.75], elbow: [-0.6, 0, 0] },
    rootTilt: 0,
    headTilt: 0.08,
    legLiftL: 0,
  },
  // Joyful dancing bearing — asymmetric arms, gentle lean, lifted heel.
  nritya: {
    armR1: { shoulder: [-0.2, 0, -2.15], elbow: [-0.75, 0, 0] },
    armL1: { shoulder: [-1.0, 0, 0.85], elbow: [-1.2, 0, 0] },
    armR2: { shoulder: [-0.3, 0, -1.5], elbow: [-0.5, 0, 0] },
    armL2: { shoulder: [-0.5, 0, 1.35], elbow: [-0.9, 0, 0] },
    rootTilt: 0.12,
    headTilt: -0.1,
    legLiftL: 0.55,
  },
};

export function getPose(poseId: string): PoseDef {
  return POSES[poseId] ?? POSES.ashirwad;
}

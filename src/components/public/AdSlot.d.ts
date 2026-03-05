import React from 'react';

type AdSlotProps = {
  variant: 'mobile' | 'leaderboard';
  style?: object;
};

declare const AdSlot: React.FC<AdSlotProps>;
export default AdSlot;

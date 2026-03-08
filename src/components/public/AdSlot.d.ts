import React from 'react';

type AdSlotProps = {
  variant: 'mobile' | 'leaderboard' | 'sidebar';
  style?: object;
};

declare const AdSlot: React.FC<AdSlotProps>;
export default AdSlot;

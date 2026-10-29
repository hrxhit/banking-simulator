/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TransactionStatus } from '../../types';

interface ComplexityBadgeProps {
  complexity: string;
  variant?: 'teal' | 'slate' | 'amber' | 'neutral';
}

export const ComplexityBadge: React.FC<ComplexityBadgeProps> = ({ complexity, variant = 'teal' }) => {
  const colorMap = {
    teal: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
    slate: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    amber: 'bg-[#fec94a]/25 text-neutral-900 border-[#fec94a]/50',
    neutral: 'bg-indigo-50 text-indigo-800 border-indigo-200/60',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${colorMap[variant]} tabular-nums shadow-xs`}
      title="Theoretical Algorithmic Complexity"
    >
      {complexity}
    </span>
  );
};

interface StatusBadgeProps {
  status: TransactionStatus;
}

const STATUS_STYLE: Record<string, { label: string; wrap: string; dot: string }> = {
  COMPLETED: { label: 'Completed', wrap: 'bg-emerald-100 text-emerald-900', dot: 'bg-emerald-600' },
  PENDING: { label: 'Pending', wrap: 'bg-[#fec94a]/30 text-neutral-900', dot: 'bg-amber-600' },
  REVERSED: { label: 'Reversed', wrap: 'bg-indigo-100 text-indigo-900', dot: 'bg-indigo-600' },
  FAILED: { label: 'Failed', wrap: 'bg-rose-100 text-rose-900', dot: 'bg-rose-600' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const st = STATUS_STYLE[status] ?? { label: status, wrap: 'bg-neutral-100 text-neutral-700', dot: 'bg-neutral-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-0.5 text-[11px] font-bold rounded-full ${st.wrap} shadow-xs`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
};

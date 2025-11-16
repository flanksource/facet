import React from 'react';
import { IoCheckmarkCircle as IconCheckmark, IoRadioButtonOn as IconCurrent, IoEllipseOutline as IconPending } from 'react-icons/io5';

export interface Step {
  label: string;
  description?: string;
}

interface StepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

type StepStatus = 'completed' | 'current' | 'pending';

function getStepStatus(stepIndex: number, currentStepIndex: number): StepStatus {
  if (stepIndex < currentStepIndex) return 'completed';
  if (stepIndex === currentStepIndex) return 'current';
  return 'pending';
}

export function Steps({ steps, currentStep, className = '' }: StepsProps) {
  return (
    <div className={`flex items-center justify-center gap-2 py-4 ${className}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(index, currentStep);
        const Icon = status === 'completed' ? IconCheckmark : status === 'current' ? IconCurrent : IconPending;

        const colorClass =
          status === 'completed'
            ? 'text-green-600'
            : status === 'current'
            ? 'text-blue-600'
            : 'text-gray-400';

        const textColorClass =
          status === 'completed'
            ? 'text-green-700'
            : status === 'current'
            ? 'text-blue-700 font-semibold'
            : 'text-gray-500';

        return (
          <React.Fragment key={index}>
            <div className="flex items-center gap-2" title={step.description}>
              <Icon className={`w-6 h-6 ${colorClass}`} />
              <span className={`text-sm ${textColorClass}`}>{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-12 ${status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

"use client";

type Step = {
  id: number;
  title: string;
  description: string;
  href: string;
};

type OnboardingProgressProps = {
  currentStep: number;
  steps: Step[];
  className?: string;
};

export default function OnboardingProgress({ currentStep, steps, className = "" }: OnboardingProgressProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-base-content">
            Step {currentStep} of {steps.length}
          </h2>
          <div className="text-sm text-base-content/60">
            {Math.round((currentStep / steps.length) * 100)}% complete
          </div>
        </div>
        
        <div className="w-full bg-base-300 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isPending = step.id > currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                isCurrent
                  ? 'bg-primary/10 border-primary/30 shadow-sm'
                  : isCompleted
                  ? 'bg-success/10 border-success/30'
                  : 'bg-base-100 border-base-300'
              }`}
            >
              {/* Step Number/Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 ${
                isCurrent
                  ? 'bg-primary text-primary-content shadow-md'
                  : isCompleted
                  ? 'bg-success text-success-content'
                  : 'bg-base-300 text-base-content'
              }`}>
                {isCompleted ? (
                  <i className="fa-duotone fa-solid fa-check text-xs" aria-hidden />
                ) : (
                  step.id
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-base transition-colors duration-200 ${
                  isCurrent ? 'text-primary' : isCompleted ? 'text-success' : 'text-base-content'
                }`}>
                  {step.title}
                </h3>
                <p className={`text-sm mt-1 transition-colors duration-200 ${
                  isCurrent ? 'text-base-content' : isPending ? 'text-base-content/60' : 'text-base-content/80'
                }`}>
                  {step.description}
                </p>
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {isCompleted && (
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                    <i className="fa-duotone fa-solid fa-check text-success text-xs" aria-hidden />
                  </div>
                )}
                {isCurrent && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
                {isPending && (
                  <div className="w-6 h-6 rounded-full bg-base-300/50 flex items-center justify-center">
                    <i className="fa-duotone fa-solid fa-clock text-base-content/40 text-xs" aria-hidden />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact version for headers/navigation
export function OnboardingProgressCompact({ currentStep, steps, className = "" }: OnboardingProgressProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        
        return (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
              isCurrent
                ? 'bg-primary text-primary-content shadow-md scale-110'
                : isCompleted
                ? 'bg-success text-success-content'
                : 'bg-base-300 text-base-content/60'
            }`}>
              {isCompleted ? (
                <i className="fa-duotone fa-solid fa-check" aria-hidden />
              ) : (
                step.id
              )}
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 transition-colors duration-200 ${
                step.id < currentStep ? 'bg-success' : 'bg-base-300'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

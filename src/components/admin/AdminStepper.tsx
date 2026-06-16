import clsx from "clsx";

type AdminStepperItem = {
  id: string;
  label: string;
};

type AdminStepperProps = {
  currentStep: string;
  onChange: (stepId: string) => void;
  steps: AdminStepperItem[];
};

export function AdminStepper({
  currentStep,
  onChange,
  steps,
}: AdminStepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className="admin-stepper" role="tablist" aria-label="Order steps">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = currentIndex > index;

        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(step.id)}
            className={clsx(
              "admin-stepper-item",
              isActive && "admin-stepper-item-active",
              isComplete && "admin-stepper-item-complete"
            )}
          >
            <span className="admin-stepper-index">{index + 1}</span>
            <span className="admin-stepper-label">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}

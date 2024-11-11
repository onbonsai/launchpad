interface ProgressBarProps {
  progress: number; // expects a value between 0 and 100
  borderClass?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, borderClass = "border-dark-grey" }) => {
  // Ensure progress is within bounds
  const validProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full rounded-full border ${borderClass} bg-transparent shadow-sm ${validProgress < 10 ? 'overflow-hidden' : ''}`}>
      <div
        className={`bg-gradient text-md py-2 ${validProgress == 0 ? 'ml-4' : 'px-4'} rounded-full text-center`}
        style={{ width: `${validProgress}%`, animation: 'pulse 2s infinite' }}
      >
        {validProgress}%
      </div>
    </div>
  );
};

export default ProgressBar;